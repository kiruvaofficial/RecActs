import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const isDryRun = process.argv.includes('--dry-run');

function resolveTicketReference(rawRef, title, itemNo) {
  const cleanTitle = (title || '').trim();
  const numStr = itemNo ? String(itemNo).trim() : (rawRef ? String(rawRef).replace(/^[A-Z]+-I?/i, '') : '');

  // 1. If title contains the exact ID with number
  if (numStr) {
    const matchNum = cleanTitle.match(new RegExp(`([A-Z]+-(?:I)?${numStr})\\b`, 'i'));
    if (matchNum) {
      return matchNum[1].toUpperCase();
    }
  }

  // 2. If title starts with a standard ticket ID (e.g. 'LA-I7428 | ...' or 'REQ-I2965 - ...')
  const matchStart = cleanTitle.match(/^([A-Z]+-(?:I)?\d+)\b/i);
  if (matchStart) {
    return matchStart[1].toUpperCase();
  }

  // 3. If rawRef exists and starts with REQ-I, replace with LA-I
  if (rawRef && rawRef.startsWith('REQ-I')) {
    return rawRef.replace(/^REQ-I/, 'LA-I');
  }

  if (rawRef && !rawRef.startsWith('V4-')) return rawRef;
  if (numStr) return `LA-I${numStr}`;
  return rawRef || 'LA-I3001';
}

async function main() {
  console.log(`Starting ticket deduplication (${isDryRun ? 'DRY RUN' : 'LIVE EXECUTION'})...`);

  const allTickets = await prisma.ticket.findMany({
    include: {
      activities: true,
      assignments: true,
      blockers: true,
      negativeImpacts: true,
      history: true,
    },
  });

  console.log(`Total tickets currently in database: ${allTickets.length}`);

  // Group by Zoho itemId or title fallback
  const groups = new Map();

  for (const t of allTickets) {
    let key = '';
    if (t.rawPayload && typeof t.rawPayload === 'object') {
      const p = t.rawPayload;
      key = String(p.itemId || p.id || p.item_id || '').trim();
    }
    if (!key && t.title) {
      key = `title:${t.title.trim().toLowerCase()}`;
    }
    if (!key) {
      key = `id:${t.id}`;
    }

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(t);
  }

  let dupGroupsCount = 0;
  let totalDuplicatesToRemove = 0;

  let activitiesRelinked = 0;
  let blockersRelinked = 0;
  let impactsRelinked = 0;
  let assignmentsRelinked = 0;
  let assignmentsMerged = 0;
  let referencesUpdated = 0;
  let deletedCount = 0;

  for (const [key, tickets] of groups.entries()) {
    if (tickets.length <= 1) continue;

    dupGroupsCount++;
    totalDuplicatesToRemove += (tickets.length - 1);

    // Scoring function to pick the best primary ticket to keep
    const scoreTicket = (t) => {
      let score = 0;
      if (t.activities.length > 0) score += 1000;
      if (t.blockers.length > 0) score += 500;
      if (t.negativeImpacts.length > 0) score += 300;
      if (t.assignments.length > 0) score += 100;
      if (t.reference && !t.reference.startsWith('V4-') && !t.reference.startsWith('REQ-I')) {
        score += 50;
      }
      score += (new Date(t.updatedAt).getTime() / 1e12);
      return score;
    };

    tickets.sort((a, b) => scoreTicket(b) - scoreTicket(a));

    const primary = tickets[0];
    const duplicates = tickets.slice(1);

    // Determine the optimal reference and payload
    let rawItemNo = '';
    for (const t of tickets) {
      if (t.rawPayload && typeof t.rawPayload === 'object') {
        const p = t.rawPayload;
        if (p.itemNo) {
          rawItemNo = String(p.itemNo);
          break;
        }
      }
    }

    const bestRef = resolveTicketReference(primary.reference, primary.title, rawItemNo);

    // Find the latest customFields and rawPayload among all tickets in the group
    let newestTicket = tickets.reduce((acc, curr) =>
      new Date(curr.updatedAt).getTime() > new Date(acc.updatedAt).getTime() ? curr : acc
    , primary);

    if (dupGroupsCount <= 5) {
      console.log(`\nDuplicate Group [${key}]:`);
      console.log(`  KEEP Primary -> ID: ${primary.id}, CurrentRef: ${primary.reference}, BestRef: ${bestRef}`);
      for (const d of duplicates) {
        console.log(`  REMOVE Dup  -> ID: ${d.id}, Ref: ${d.reference}, Updated: ${d.updatedAt.toISOString()}, Acts: ${d.activities.length}, Assigns: ${d.assignments.length}`);
      }
    }

    if (!isDryRun) {
      // 1. Update primary ticket with bestRef, latest customFields, and latest rawPayload
      const updateData = {};
      if (primary.reference !== bestRef) {
        updateData.reference = bestRef;
        referencesUpdated++;
      }
      if (newestTicket.customFields && Object.keys(newestTicket.customFields).length > 0) {
        updateData.customFields = newestTicket.customFields;
      }
      if (newestTicket.rawPayload) {
        updateData.rawPayload = newestTicket.rawPayload;
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.ticket.update({
          where: { id: primary.id },
          data: updateData,
        });
      }

      // 2. Re-link relations for each duplicate
      for (const dup of duplicates) {
        // WorkLogActivities
        if (dup.activities.length > 0) {
          await prisma.workLogActivity.updateMany({
            where: { ticketId: dup.id },
            data: { ticketId: primary.id },
          });
          activitiesRelinked += dup.activities.length;
        }

        // Blockers
        if (dup.blockers.length > 0) {
          await prisma.blocker.updateMany({
            where: { ticketId: dup.id },
            data: { ticketId: primary.id },
          });
          blockersRelinked += dup.blockers.length;
        }

        // EmployeeNegativeImpacts
        if (dup.negativeImpacts.length > 0) {
          await prisma.employeeNegativeImpact.updateMany({
            where: { ticketId: dup.id },
            data: { ticketId: primary.id },
          });
          impactsRelinked += dup.negativeImpacts.length;
        }

        // TicketHistory
        if (dup.history.length > 0) {
          await prisma.ticketHistory.updateMany({
            where: { ticketId: dup.id },
            data: { ticketId: primary.id },
          });
        }

        // TicketAssignments
        if (dup.assignments.length > 0) {
          for (const a of dup.assignments) {
            const existingAssign = await prisma.ticketAssignment.findUnique({
              where: {
                ticketId_membershipId: {
                  ticketId: primary.id,
                  membershipId: a.membershipId,
                },
              },
            });

            if (existingAssign) {
              if (a.loggedHours > 0) {
                await prisma.ticketAssignment.update({
                  where: { id: existingAssign.id },
                  data: { loggedHours: existingAssign.loggedHours + a.loggedHours },
                });
              }
              await prisma.ticketAssignment.delete({ where: { id: a.id } });
              assignmentsMerged++;
            } else {
              await prisma.ticketAssignment.update({
                where: { id: a.id },
                data: { ticketId: primary.id },
              });
              assignmentsRelinked++;
            }
          }
        }

        // 3. Delete the duplicate ticket
        await prisma.ticket.delete({
          where: { id: dup.id },
        });
        deletedCount++;
      }
    }
  }

  console.log(`\n========================================`);
  console.log(`Duplicate Groups Identified: ${dupGroupsCount}`);
  console.log(`Total Duplicate Tickets to Delete: ${totalDuplicatesToRemove}`);

  if (isDryRun) {
    console.log(`DRY RUN COMPLETED. No data was modified.`);
  } else {
    console.log(`LIVE EXECUTION COMPLETED:`);
    console.log(`  - Deleted duplicate tickets: ${deletedCount}`);
    console.log(`  - Primary references refined: ${referencesUpdated}`);
    console.log(`  - Activities re-linked: ${activitiesRelinked}`);
    console.log(`  - Blockers re-linked: ${blockersRelinked}`);
    console.log(`  - Impacts re-linked: ${impactsRelinked}`);
    console.log(`  - Assignments re-linked: ${assignmentsRelinked}`);
    console.log(`  - Duplicate assignments merged: ${assignmentsMerged}`);

    const remainingTickets = await prisma.ticket.count();
    console.log(`Remaining tickets in database: ${remainingTickets}`);
  }
}

main()
  .catch((e) => {
    console.error('Deduplication failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
