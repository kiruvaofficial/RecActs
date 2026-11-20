import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => l.split('=').map(s => s.trim().replace(/^"|"$/g, '')))
);

const PORTAL_ID = '730202335';
const PROJ_ID = '101301000000010271';
const SPRINT_ID = '101301000007439160';

// Schema option map for UDF_PKL20 (Department)
const DEPT_MAP = {
  '101301000007227151': 'Requirement',
  '101301000007227150': 'Development',
  '101301000007227152': 'Testing',
  '101301000007227153': 'Testing scenarios',
  '101301000007227154': 'Vision board',
  '101301000007411575': 'AI'
};

async function main() {
  console.log('Fetching live Zoho Sprints token...');
  const tokenRes = await fetch(
    `https://accounts.zoho.com/oauth/v2/token?refresh_token=${env.ZOHO_REFRESH_TOKEN}&client_id=${env.ZOHO_CLIENT_ID}&client_secret=${env.ZOHO_CLIENT_SECRET}&grant_type=refresh_token`,
    { method: 'POST' }
  );
  const { access_token } = await tokenRes.json();
  const headers = { Authorization: `Zoho-oauthtoken ${access_token}` };

  // 1. Fetch all items in Sprint 95
  console.log('Fetching all items in V4 Sprint 95 from Zoho API...');
  let sprintItems = [];
  let index = 1;
  let hasMore = true;
  while (hasMore && index <= 1000) {
    const url = `https://sprintsapi.zoho.com/zsapi/team/${PORTAL_ID}/projects/${PROJ_ID}/sprints/${SPRINT_ID}/item/?action=data&index=${index}&range=100`;
    const res = await fetch(url, { headers });
    const data = await res.json();
    const props = data.item_prop;
    if (data.itemIds && data.itemJObj) {
      for (const id of data.itemIds) {
        const arr = data.itemJObj[id];
        const it = { id };
        for (const [k, idx] of Object.entries(props)) {
          it[k] = arr[idx];
        }
        sprintItems.push(it);
      }
      if (data.itemIds.length < 100) hasMore = false;
      else index += 100;
    } else {
      hasMore = false;
    }
  }

  console.log(`Retrieved ${sprintItems.length} items in Sprint 95 from Zoho.`);

  // 2. Fetch existing tickets from PostgreSQL
  const dbTickets = await prisma.ticket.findMany({
    include: { assignments: true }
  });
  const dbByItemId = new Map();
  for (const t of dbTickets) {
    const raw = t.rawPayload || {};
    const zId = raw.itemId || raw.id || raw.item_id;
    if (zId) dbByItemId.set(String(zId).trim(), t);
  }

  // 3. For each sprint item, fetch details and sync to DB
  console.log(`Syncing details for Sprint 95 items into PostgreSQL...`);
  const concurrency = 15;
  let updatedCount = 0;
  let reqDeptCount = 0;

  for (let i = 0; i < sprintItems.length; i += concurrency) {
    const chunk = sprintItems.slice(i, i + concurrency);
    await Promise.all(
      chunk.map(async (item) => {
        const dbTicket = dbByItemId.get(String(item.id).trim());
        if (!dbTicket) return;

        try {
          const detailUrl = `https://sprintsapi.zoho.com/zsapi/team/${PORTAL_ID}/projects/${PROJ_ID}/item/${item.id}/?action=details`;
          const dRes = await fetch(detailUrl, { headers });
          if (!dRes.ok) return;

          const dData = await dRes.json();
          const dProps = dData.item_prop;
          const dArr = dData.itemJObj ? dData.itemJObj[item.id] || Object.values(dData.itemJObj)[0] : null;
          if (!dArr || !dProps) return;

          // Department
          const rawDept = dProps.UDF_PKL20 !== undefined ? dArr[dProps.UDF_PKL20] : null;
          const deptName = DEPT_MAP[rawDept] || null;

          // Requirement Weightage (UDF_LONG5)
          const rawWeight = dProps.UDF_LONG5 !== undefined ? dArr[dProps.UDF_LONG5] : null;
          const parsedWeight = rawWeight !== '' && rawWeight !== null && rawWeight !== undefined && rawWeight !== -1 && rawWeight !== '-1'
            ? parseFloat(String(rawWeight).trim())
            : NaN;

          // Current customFields
          const cf = (dbTicket.customFields && typeof dbTicket.customFields === 'object') ? { ...dbTicket.customFields } : {};

          if (deptName) {
            cf.UDF_PKL20 = {
              paramName: 'UDF_PKL20',
              label: 'Department',
              fieldType: 'Picklist / Dropdown',
              rawValue: rawDept,
              displayValue: deptName,
              sectionName: 'Default Section'
            };
          } else if (cf.UDF_PKL20 && rawDept === '') {
            delete cf.UDF_PKL20;
          }

          if (!isNaN(parsedWeight) && parsedWeight > 0) {
            cf.UDF_LONG5 = {
              paramName: 'UDF_LONG5',
              label: 'Requirement Weightage',
              fieldType: 'Number',
              rawValue: parsedWeight,
              displayValue: String(parsedWeight),
              sectionName: 'Requirement Info'
            };
          }

          // Build rawPayload with all live UDFs and status
          const updatedRaw = {
            ...(dbTicket.rawPayload || {}),
            ...item,
            sprintName: 'V4 Sprint 95',
            statusName: item.statusName
          };
          for (const [propName, propIdx] of Object.entries(dProps)) {
            if (propName.startsWith('UDF_') || propName.startsWith('proj') || propName === 'points') {
              updatedRaw[propName] = dArr[propIdx];
            }
          }

          // Map core status
          const rawStatusLower = (item.statusName || '').toLowerCase().trim();
          let coreStatus = 'In Progress';
          if (rawStatusLower.includes('to do') || rawStatusLower === 'backlog' || rawStatusLower === 'new') {
            coreStatus = 'To Do';
          } else if (rawStatusLower.includes('review') || rawStatusLower.includes('handoff')) {
            coreStatus = 'Under Review';
          } else if (rawStatusLower.includes('completed') || rawStatusLower === 'done' || rawStatusLower === 'closed') {
            coreStatus = 'Completed';
          }

          const effectiveTotalHours = !isNaN(parsedWeight) && parsedWeight > 0
            ? parsedWeight
            : (item.points ? Number(item.points) * 8 : dbTicket.totalEstimatedHours);

          await prisma.ticket.update({
            where: { id: dbTicket.id },
            data: {
              status: coreStatus,
              totalEstimatedHours: effectiveTotalHours,
              customFields: Object.keys(cf).length > 0 ? cf : undefined,
              rawPayload: updatedRaw
            }
          });

          // Sync assignment hours
          if (dbTicket.assignments.length > 0 && !isNaN(parsedWeight) && parsedWeight > 0) {
            const share = Math.round((effectiveTotalHours / dbTicket.assignments.length) * 10) / 10;
            for (const a of dbTicket.assignments) {
              await prisma.ticketAssignment.update({
                where: { id: a.id },
                data: { allocatedHours: share }
              });
            }
          }

          if (deptName === 'Requirement') {
            reqDeptCount++;
          }
          updatedCount++;
        } catch (e) {}
      })
    );
  }

  console.log(`\n========================================`);
  console.log(`Sync completed: ${updatedCount} tickets updated in DB.`);
  console.log(`Tickets in Sprint 95 with Department = Requirement: ${reqDeptCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
