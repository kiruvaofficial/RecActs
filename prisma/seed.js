"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new client_1.PrismaClient({
    datasources: {
        db: {
            url: process.env.DIRECT_URL || process.env.DATABASE_URL,
        },
    },
});
async function main() {
    console.log('Seeding RecActs database with BlindMatrix organization and KPI data...');
    // 1. Password hash for demo users (password: 'password123')
    const defaultPasswordHash = await bcrypt.hash('password123', 10);
    // 2. Clean up existing data for idempotent re-seeding
    console.log('Cleaning up existing data...');
    try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Organization", "User" CASCADE;`);
    }
    catch (e) {
        // Fallback if SQLite or tables don't exist
    }
    // 3. Create Platform Admin (God Mode)
    await prisma.user.upsert({
        where: { email: 'admin@recacts.app' },
        update: {},
        create: {
            email: 'admin@recacts.app',
            passwordHash: defaultPasswordHash,
            name: 'Platform Admin',
            initials: 'PA',
            isPlatformAdmin: true,
            platformRoles: {
                create: {
                    role: 'Super Admin',
                    mfaEnabled: true,
                },
            },
        },
    });
    // 4. Create BlindMatrix Organization
    const org = await prisma.organization.upsert({
        where: { slug: 'blindmatrix' },
        update: {
            productivityFactor: 90.0,
            capacityFactorMember: 100.0,
            capacityFactorLead: 90.0,
            capacityFactorManager: 80.0,
        },
        create: {
            slug: 'blindmatrix',
            name: 'BlindMatrix',
            legalName: 'BlindMatrix (demo record)',
            industry: 'Window coverings software',
            email: 'support@demo.recacts.app',
            timezone: 'Asia/Kolkata (UTC+05:30)',
            workDays: 'Mon,Tue,Wed,Thu,Fri',
            workHoursStart: '09:00',
            workHoursEnd: '18:00',
            gracePeriodMinutes: 15,
            productivityFactor: 90.0,
            capacityFactorMember: 100.0,
            capacityFactorLead: 90.0,
            capacityFactorManager: 80.0,
            kpiAggregationMethod: 'weighted',
            subscriptionTier: 'Business',
            subscriptionStatus: 'Active',
        },
    });
    // 5. Create Standard Roles
    const roleNames = [
        'Org Owner',
        'Admin / HR',
        'Manager',
        'Team Lead',
        'Team Member',
        'Log Approver',
        'Target Editor',
        'Target Approver',
    ];
    const roleMap = {};
    for (const rName of roleNames) {
        const role = await prisma.role.create({
            data: {
                organizationId: org.id,
                name: rName,
                isSystem: true,
            },
        });
        roleMap[rName] = role.id;
    }
    // 6. Create Teams
    const teamsData = ['Alpha', 'Beta', 'Requirements', 'Leadership', 'People Ops'];
    const teamMap = {};
    for (const tName of teamsData) {
        const t = await prisma.team.create({
            data: {
                organizationId: org.id,
                name: tName,
            },
        });
        teamMap[tName] = t.id;
    }
    const people = [
        { id: 'don', name: 'Don Michael', ini: 'DM', desig: 'Manager', team: 'Requirements', leadId: null, roles: ['Manager', 'Log Approver', 'Target Approver'], status: 'Active', join: '2019-06-03', email: 'don.michael@demo.recacts.app' },
        { id: 'kiru', name: 'Kiruvantham C', ini: 'KV', desig: 'Team Lead', team: 'Alpha', leadId: 'don', roles: ['Team Lead', 'Log Approver', 'Target Editor'], status: 'Active', join: '2021-02-15', email: 'kiruvantham@demo.recacts.app' },
        { id: 'rasiga', name: 'Rasiga Priya M', ini: 'RP', desig: 'Team Lead', team: 'Beta', leadId: 'don', roles: ['Team Lead', 'Log Approver'], status: 'Active', join: '2021-08-09', email: 'rasiga.priya@demo.recacts.app' },
        { id: 'yogesh', name: 'Yogesh', ini: 'YG', desig: 'Senior Designer', team: 'Alpha', leadId: 'kiru', roles: ['Team Member'], status: 'Active', join: '2022-01-10', email: 'yogesh@demo.recacts.app' },
        { id: 'hemanth', name: 'Hemanth', ini: 'HM', desig: 'Designer', team: 'Alpha', leadId: 'kiru', roles: ['Team Member'], status: 'Active', join: '2023-03-20', email: 'hemanth@demo.recacts.app' },
        { id: 'saravana', name: 'Saravana Priya', ini: 'SP', desig: 'UI/UX Designer', team: 'Alpha', leadId: 'kiru', roles: ['Team Member'], status: 'Active', join: '2023-07-03', email: 'saravana.priya@demo.recacts.app' },
        { id: 'dharshana', name: 'Dharshana', ini: 'DH', desig: 'Designer', team: 'Alpha', leadId: 'kiru', roles: ['Team Member'], status: 'Active', join: '2024-01-08', email: 'dharshana@demo.recacts.app' },
        { id: 'sharath', name: 'Sharath', ini: 'SH', desig: 'Associate Designer', team: 'Beta', leadId: 'rasiga', roles: ['Team Member'], status: 'Active', join: '2025-02-17', email: 'sharath@demo.recacts.app' },
        { id: 'srinath', name: 'Srinath', ini: 'SN', desig: 'Designer', team: 'Beta', leadId: 'rasiga', roles: ['Team Member'], status: 'Active', join: '2023-05-15', email: 'srinath@demo.recacts.app' },
        { id: 'karuppaiah', name: 'Karuppaiah', ini: 'KP', desig: 'Senior Designer', team: 'Beta', leadId: 'rasiga', roles: ['Team Member', 'Target Editor'], status: 'Active', join: '2022-09-12', email: 'karuppaiah@demo.recacts.app' },
        { id: 'dinesh', name: 'Dinesh Yadav', ini: 'DY', desig: 'Designer', team: 'Beta', leadId: 'rasiga', roles: ['Team Member'], status: 'Active', join: '2024-04-01', email: 'dinesh.yadav@demo.recacts.app' },
        { id: 'madhan', name: 'Madhan R', ini: 'MR', desig: 'Associate Designer', team: 'Beta', leadId: 'rasiga', roles: ['Team Member'], status: 'Onboarding', join: '2026-10-01', email: 'madhan.r@demo.recacts.app' },
        { id: 'meena', name: 'Meena S', ini: 'MS', desig: 'HR Executive', team: 'People Ops', leadId: null, roles: ['Admin / HR'], status: 'Active', join: '2022-11-01', email: 'meena.s@demo.recacts.app' },
        { id: 'arun', name: 'Arun Kumar', ini: 'AK', desig: 'Director', team: 'Leadership', leadId: null, roles: ['Org Owner', 'Admin / HR'], status: 'Active', join: '2018-03-01', email: 'arun.kumar@demo.recacts.app' },
    ];
    const memberMap = {}; // person id -> membership id
    for (const p of people) {
        const user = await prisma.user.upsert({
            where: { email: p.email },
            update: { name: p.name, initials: p.ini },
            create: {
                email: p.email,
                passwordHash: defaultPasswordHash,
                name: p.name,
                initials: p.ini,
                location: 'Chennai',
            },
        });
        const membership = await prisma.organizationMembership.create({
            data: {
                organizationId: org.id,
                userId: user.id,
                designation: p.desig,
                teamId: teamMap[p.team] || null,
                employmentStatus: p.status,
                joiningDate: p.join,
            },
        });
        memberMap[p.id] = membership.id;
        // Attach roles
        for (const rName of p.roles) {
            if (roleMap[rName]) {
                await prisma.membershipRole.create({
                    data: {
                        membershipId: membership.id,
                        roleId: roleMap[rName],
                    },
                });
            }
        }
    }
    // Update reporting hierarchy
    for (const p of people) {
        if (p.leadId && memberMap[p.leadId]) {
            await prisma.organizationMembership.update({
                where: { id: memberMap[p.id] },
                data: {
                    reportingLeadId: memberMap[p.leadId],
                    reportingManagerId: memberMap['don'],
                },
            });
        }
    }
    // 8. Leave Types & Balances
    const leaveTypes = [
        { code: 'CL', name: 'Casual Leave', quota: 12, carry: 0, color: '#4F46E5', isUnl: false },
        { code: 'SL', name: 'Sick Leave', quota: 12, carry: 0, color: '#0F766E', isUnl: false },
        { code: 'EL', name: 'Earned Leave', quota: 15, carry: 30, color: '#B45309', isUnl: false },
        { code: 'LOP', name: 'Loss of Pay', quota: 0, carry: 0, color: '#64748B', isUnl: true },
        { code: 'CO', name: 'Comp Off', quota: 2, carry: 0, color: '#BE185D', isUnl: false },
    ];
    const leaveTypeMap = {};
    for (const lt of leaveTypes) {
        const record = await prisma.leaveType.create({
            data: {
                organizationId: org.id,
                code: lt.code,
                name: lt.name,
                quotaDays: lt.quota,
                carryForwardDays: lt.carry,
                colorHex: lt.color,
                isUnlimited: lt.isUnl,
            },
        });
        leaveTypeMap[lt.code] = record.id;
    }
    // Balances
    const balances = {
        yogesh: { CL: 4, SL: 1, EL: 3 },
        hemanth: { CL: 3, SL: 2, EL: 2 },
        saravana: { CL: 5, SL: 3, EL: 1 },
        dharshana: { CL: 6, SL: 1, EL: 4 },
        sharath: { CL: 2, SL: 0, EL: 1 },
        srinath: { CL: 4, SL: 2, EL: 3 },
        karuppaiah: { CL: 3, SL: 1, EL: 6 },
        dinesh: { CL: 5, SL: 2, EL: 2 },
        madhan: { CL: 0, SL: 0, EL: 0 },
        kiru: { CL: 3, SL: 1, EL: 5 },
        rasiga: { CL: 4, SL: 0, EL: 4 },
        don: { CL: 2, SL: 1, EL: 6 },
        meena: { CL: 3, SL: 1, EL: 2 },
        arun: { CL: 1, SL: 0, EL: 3 },
    };
    for (const [pId, b] of Object.entries(balances)) {
        if (memberMap[pId]) {
            for (const [code, used] of Object.entries(b)) {
                if (leaveTypeMap[code]) {
                    await prisma.leaveBalance.create({
                        data: {
                            membershipId: memberMap[pId],
                            leaveTypeId: leaveTypeMap[code],
                            allocatedDays: code === 'EL' ? 15 : 12,
                            usedDays: used,
                            pendingDays: 0,
                            year: 2026,
                        },
                    });
                }
            }
        }
    }
    // Holidays
    const holidays = [
        { d: '2026-10-31', n: "Founders' Day" },
        { d: '2026-12-25', n: 'Christmas Day' },
        { d: '2027-01-01', n: "New Year's Day" },
        { d: '2027-01-15', n: 'Pongal' },
        { d: '2027-01-26', n: 'Republic Day' },
    ];
    for (const h of holidays) {
        await prisma.holiday.create({
            data: {
                organizationId: org.id,
                holidayDate: h.d,
                name: h.n,
            },
        });
    }
    const rawTickets = [
        // Madhan R (5 tickets, 226h est, 211h act, 1 reassign)
        { ref: 'REQ-12910', title: 'Forma Living: Purchase Order Issue', staff: 'madhan', est: 24, reassign: 0, act: 20, cust: 'Forma Living' },
        { ref: 'REQ-12882', title: 'Carter Blinds Fabric Stock Update via Excel Import', staff: 'madhan', est: 36, reassign: 0, act: 35, cust: 'Carter Blinds' },
        { ref: 'REQ-12899', title: 'Phoenix Blinds - Min/Max for Numeric X and Numeric Y Field Types', staff: 'madhan', est: 20, reassign: 0, act: 16, cust: 'Phoenix Blinds' },
        { ref: 'REQ-12883', title: 'Studio Shade: Multi-Point Signing on Quote/Invoice Terms & Conditions', staff: 'madhan', est: 120, reassign: 1, act: 115, cust: 'Studio Shade' },
        { ref: 'REQ-12982', title: 'Desktop Mobile UI', staff: 'madhan', est: 26, reassign: 0, act: 25, cust: 'Internal Platform' },
        // Dinesh Yadav (6 tickets, 67h est, 65h act, 0 reassign)
        { ref: 'LA-I6908', title: 'REQ-12920 | Credit Limit in Accounts Import - JRS V4', staff: 'dinesh', est: 3, reassign: 0, act: 2, cust: 'JRS V4' },
        { ref: 'REQ-12901', title: 'VI-1044 Forma Living : US Region Number Formatting (Decimal & comma Thousands Separator)', staff: 'dinesh', est: 16, reassign: 0, act: 15, cust: 'Forma Living' },
        { ref: 'REQ-I2803', title: 'Talbot & Son (Blinds) Ltd | #105195 | Price increases', staff: 'dinesh', est: 34, reassign: 0, act: 35, cust: 'Talbot & Son' },
        { ref: 'LA-I6992', title: 'LA-I6992 | REQ-12975 | Ability to duplicate an order item', staff: 'dinesh', est: 4, reassign: 0, act: 3, cust: 'BM Core' },
        { ref: 'REQ-I3003', title: 'Implement Markup fields in line item price details in the Mobile App', staff: 'dinesh', est: 2, reassign: 0, act: 2, cust: 'Mobile Team' },
        { ref: 'LA-I7331', title: 'LA-I7331 | Product variants in mobile', staff: 'dinesh', est: 8, reassign: 0, act: 8, cust: 'Mobile Team' },
        // Karuppaiah (4 tickets, 55h est, 45h act, 0 reassign)
        { ref: 'REQ-12878', title: 'Sienna Shutters - Add disable toggle button for Automations', staff: 'karuppaiah', est: 5, reassign: 0, act: 4, cust: 'Sienna Shutters' },
        { ref: 'REQ-12879', title: 'Shades blinds_V4_Due Date Calculation & Batch Printing Enhancements', staff: 'karuppaiah', est: 24, reassign: 0, act: 18, cust: 'Shades Blinds' },
        { ref: 'LA-I7234', title: 'LA-I7234 | City Blinds | Copy Line-Item Validation setting in desktop', staff: 'karuppaiah', est: 2, reassign: 0, act: 1, cust: 'City Blinds' },
        { ref: 'LA-I7332', title: 'BM postcode API for desktop', staff: 'karuppaiah', est: 24, reassign: 0, act: 22, cust: 'Internal Platform' },
        // Srinath (5 tickets, 98h est, 92h act, 0 reassign)
        { ref: 'REQ-12898', title: 'Price Table Control/Filter for Apollo Blinds & important for all customers', staff: 'srinath', est: 80, reassign: 0, act: 80, cust: 'Apollo Blinds' },
        { ref: 'REQ-12974', title: "Retain user's sequence in appointment type user selection dropdown", staff: 'srinath', est: 5, reassign: 0, act: 4, cust: 'Trade App' },
        { ref: 'REQ-I3015', title: 'Ability to choose linked supplier in Trade app', staff: 'srinath', est: 8, reassign: 0, act: 4, cust: 'Trade App' },
        { ref: 'LA-I6941', title: 'BM Copilot UI Enhancements', staff: 'srinath', est: 3, reassign: 0, act: 2, cust: 'BM Copilot' },
        { ref: 'LA-I6802', title: 'BM Copilot - Email & SMS Template in Chat', staff: 'srinath', est: 2, reassign: 0, act: 2, cust: 'BM Copilot' },
        // Sharath (3 tickets, 5h est, 4h act, 0 reassign)
        { ref: 'LA-I7006', title: 'LA-I7006 | Sinexit (DENIZCAM) - Transfer product ID via API #163223', staff: 'sharath', est: 2, reassign: 0, act: 2, cust: 'Sinexit' },
        { ref: 'REQ-I3002', title: 'REQ-I3002 | Mobile - Support BOM Cost Pricing, Price Table Setting Pricing', staff: 'sharath', est: 1, reassign: 0, act: 1, cust: 'Mobile Team' },
        { ref: 'REQ-I3030', title: 'REQ-I3030 | Need ability to duplicate product in mobile', staff: 'sharath', est: 2, reassign: 0, act: 1, cust: 'Mobile Team' },
        // Yogesh (4 tickets, 241h est, 208h act, 2 reassigns)
        { ref: 'LA-I6923', title: 'LA-I6923 REQ-12480-Bulk user allocation for jobs & ability to view jobs from production', staff: 'yogesh', est: 125, reassign: 1, act: 112, cust: 'Production Ops' },
        { ref: '#I8079', title: 'LA-I6931-REQ-12773-Quote Comparison requirement from Sales', staff: 'yogesh', est: 45, reassign: 0, act: 35, cust: 'Sales Team' },
        { ref: 'REQ-I3001', title: 'REQ-I3001 | Save Button Color Change - Mobile', staff: 'yogesh', est: 1, reassign: 0, act: 1, cust: 'Mobile Team' },
        { ref: 'REQ-I2711', title: 'REQ-I2711-LA-15472-AFTBLINDS-TIP-I6436-Turnable functionality worked on Optimize page', staff: 'yogesh', est: 70, reassign: 1, act: 60, cust: 'AFT Blinds' },
        // Dharshana (2 tickets, 2h est, 2h act, 0 reassign)
        { ref: 'REQ-I3035', title: 'REQ-I3035 | Mobile - Sync Conflict Popup - Display User-Friendly Field Names', staff: 'dharshana', est: 1, reassign: 0, act: 1, cust: 'Mobile Team' },
        { ref: 'REQ-I3024', title: 'REQ-I3024 | Direct Colour Selection and Settings Access - Internal & Apollo', staff: 'dharshana', est: 1, reassign: 0, act: 1, cust: 'Apollo Blinds' },
        // Saravana Priya (1 ticket, 1h est, 1h act, 0 reassign)
        { ref: 'REQ-I2999', title: 'REQ-I2999-Add Unit type - Foot and Yard in Application setup and Price table', staff: 'saravana', est: 1, reassign: 0, act: 1, cust: 'App Setup' },
        // Hemanth (1 ticket, 30h est, 24h act, 0 reassign)
        { ref: 'LA-I7181', title: 'LA-I7181 - REQ-I2964-Forma Living : Stock Dashboard implementation', staff: 'hemanth', est: 30, reassign: 0, act: 24, cust: 'Forma Living' },
    ];
    const ticketMap = {};
    for (const t of rawTickets) {
        const memberId = memberMap[t.staff];
        const teamId = ['yogesh', 'hemanth', 'saravana', 'dharshana'].includes(t.staff)
            ? teamMap['Alpha']
            : teamMap['Beta'];
        const created = await prisma.ticket.create({
            data: {
                organizationId: org.id,
                reference: t.ref,
                title: t.title,
                customerName: t.cust || 'BlindMatrix Client',
                priority: t.est >= 50 ? 'Critical' : t.est >= 20 ? 'High' : 'Medium',
                status: 'Completed',
                plannedStartDate: '2026-10-01',
                plannedDueDate: '2026-10-31',
                completedDate: '2026-10-31',
                totalEstimatedHours: t.est,
                reassignmentCount: t.reassign,
                teamId: teamId || null,
                description: `Requirement ticket ${t.ref}: ${t.title}. Estimated effort: ${t.est}h. Completed actual: ${t.act}h.`,
            },
        });
        ticketMap[t.ref] = created.id;
        if (memberId) {
            await prisma.ticketAssignment.create({
                data: {
                    ticketId: created.id,
                    membershipId: memberId,
                    allocatedHours: t.est,
                    loggedHours: t.act,
                    status: 'Completed',
                },
            });
        }
    }
    // Seed dedicated multi-designer shared ticket for testing and demonstration of Requirement #9
    const sharedTicket = await prisma.ticket.create({
        data: {
            organizationId: org.id,
            reference: 'REQ-SHARED-01',
            title: 'Dealer portal - bulk quote import (Shared Allocation)',
            customerName: 'Northwind Interiors',
            priority: 'High',
            status: 'In Progress',
            plannedStartDate: '2026-10-10',
            plannedDueDate: '2026-10-25',
            totalEstimatedHours: 22.0,
            reassignmentCount: 0,
            teamId: teamMap['Alpha'] || null,
            description: 'Shared allocation between Yogesh (10h) and Hemanth (12h). Independent work logging.',
        },
    });
    ticketMap['REQ-SHARED-01'] = sharedTicket.id;
    await prisma.ticketAssignment.create({
        data: {
            ticketId: sharedTicket.id,
            membershipId: memberMap['yogesh'],
            allocatedHours: 10.0,
            loggedHours: 6.5,
            status: 'In Progress',
        },
    });
    await prisma.ticketAssignment.create({
        data: {
            ticketId: sharedTicket.id,
            membershipId: memberMap['hemanth'],
            allocatedHours: 12.0,
            loggedHours: 7.0,
            status: 'In Progress',
        },
    });
    // 10. Blockers & Escalation
    const blockers = [
        {
            id: 'B-104',
            ref: 'REQ-12883',
            title: 'Customer legal team delay on signing multi-point terms',
            desc: 'Studio Shade legal council requested modifications to Clause 4 on terms & conditions.',
            sev: 'High',
            by: 'madhan',
            lead: 'rasiga',
            status: 'Acknowledged',
        },
        {
            id: 'B-105',
            ref: 'LA-I6923',
            title: 'Conflicting cut-width rules on production jobs',
            desc: 'Two plants have conflicting tolerances. Production manager consultation required.',
            sev: 'Critical',
            by: 'yogesh',
            lead: 'kiru',
            status: 'In Progress',
            esc: true,
        },
        {
            id: 'B-101',
            ref: 'REQ-12898',
            title: 'Price table schema filter ambiguity',
            desc: 'Apollo Blinds catalog had inconsistent subcategory IDs for honeycomb shades.',
            sev: 'Low',
            by: 'srinath',
            lead: 'rasiga',
            status: 'Resolved',
            res: 'Catalog mapped successfully with updated hierarchy.',
        },
    ];
    for (const b of blockers) {
        await prisma.blocker.create({
            data: {
                organizationId: org.id,
                ticketId: ticketMap[b.ref] || null,
                reference: b.ref,
                title: b.title,
                description: b.desc,
                severity: b.sev,
                raisedByMembershipId: memberMap[b.by],
                responsibleLeadMembershipId: memberMap[b.lead],
                status: b.status,
                resolutionNotes: b.res || null,
                escalatedToManager: b.esc || false,
                escalatedToMembershipId: b.esc ? memberMap['don'] : null,
            },
        });
    }
    // 11. Work Logs for Today and Friday
    const TODAY = '2026-10-31';
    await prisma.workLog.create({
        data: {
            organizationId: org.id,
            membershipId: memberMap['yogesh'],
            workDate: TODAY,
            submissionStatus: 'Draft',
            activities: {
                create: [
                    {
                        ticketId: ticketMap['LA-I6923'],
                        activityType: 'Requirement Analysis',
                        description: 'Analyzed job allocation rules and production view filters',
                        startTime: '09:30',
                        endTime: '11:30',
                        durationMinutes: 120,
                        progressStatus: 'In Progress',
                    },
                    {
                        ticketId: ticketMap['REQ-I2711'],
                        activityType: 'Customer Discussion',
                        description: 'Clarified turnable optimization requirements with AFT Blinds',
                        startTime: '12:00',
                        endTime: '13:00',
                        durationMinutes: 60,
                        progressStatus: 'In Progress',
                    },
                ],
            },
        },
    });
    // Submitted work log awaiting approval
    await prisma.workLog.create({
        data: {
            organizationId: org.id,
            membershipId: memberMap['hemanth'],
            workDate: '2026-10-24',
            submissionStatus: 'Submitted',
            submittedAt: new Date('2026-10-24T18:52:00Z'),
            activities: {
                create: [
                    {
                        ticketId: ticketMap['LA-I7181'],
                        activityType: 'Requirement Analysis',
                        description: 'Stock dashboard inventory calculation models',
                        startTime: '09:10',
                        endTime: '12:40',
                        durationMinutes: 210,
                        progressStatus: 'In Progress',
                    },
                ],
            },
        },
    });
    // 12. Attendance Sessions
    await prisma.attendanceSession.create({
        data: {
            membershipId: memberMap['kiru'],
            workDate: TODAY,
            checkInTime: '08:50',
            totalMinutes: 310,
            status: 'Present',
        },
    });
    await prisma.attendanceSession.create({
        data: {
            membershipId: memberMap['yogesh'],
            workDate: TODAY,
            checkInTime: '09:15',
            totalMinutes: 285,
            status: 'Present',
        },
    });
    await prisma.attendanceSession.create({
        data: {
            membershipId: memberMap['don'],
            workDate: TODAY,
            checkInTime: '08:45',
            totalMinutes: 320,
            status: 'Present',
        },
    });
    // 13. Target Override for Madhan R (joined 2 Nov)
    await prisma.targetOverride.create({
        data: {
            organizationId: org.id,
            membershipId: memberMap['madhan'],
            period: 'Oct 2026',
            calculatedTargetHours: 158.0,
            revisedTargetHours: 158.0,
            reason: 'Standard monthly weightage target allocation',
            status: 'Approved',
            submittedByMembershipId: memberMap['rasiga'],
            reviewedByMembershipId: memberMap['don'],
            reviewedAt: new Date('2026-10-20T11:00:00Z'),
        },
    });
    // 14. Negative Impact Records for Reassigned Tickets (5% and 10%)
    await prisma.employeeNegativeImpact.create({
        data: {
            organizationId: org.id,
            membershipId: memberMap['yogesh'],
            ticketId: ticketMap['LA-I6923'],
            category: 'Reassignment',
            impactValue: 5.0,
            valueType: 'percentage',
            basisRule: 'First reassignment: 5% of ticket weightage (6.2h)',
            reason: '1st reassignment on LA-I6923 (125h ticket)',
            effectiveDate: '2026-10-04',
            appliedByMembershipId: memberMap['kiru'],
            status: 'Approved',
        },
    });
    await prisma.employeeNegativeImpact.create({
        data: {
            organizationId: org.id,
            membershipId: memberMap['yogesh'],
            ticketId: ticketMap['REQ-I2711'],
            category: 'Reassignment',
            impactValue: 5.0,
            valueType: 'percentage',
            basisRule: 'First reassignment: 5% of ticket weightage (3.5h)',
            reason: '1st reassignment on REQ-I2711 (70h ticket)',
            effectiveDate: '2026-10-05',
            appliedByMembershipId: memberMap['kiru'],
            status: 'Approved',
        },
    });
    await prisma.employeeNegativeImpact.create({
        data: {
            organizationId: org.id,
            membershipId: memberMap['madhan'],
            ticketId: ticketMap['REQ-12883'],
            category: 'Reassignment',
            impactValue: 5.0,
            valueType: 'percentage',
            basisRule: 'First reassignment: 5% of ticket weightage (6.0h)',
            reason: '1st reassignment on REQ-12883 (120h ticket)',
            effectiveDate: '2026-10-24',
            appliedByMembershipId: memberMap['rasiga'],
            status: 'Approved',
        },
    });
    // 15. Feature Flags (Platform God Mode)
    const flags = [
        { key: 'gantt_drag', name: 'Gantt drag-and-drop scheduling', description: 'Allows drag-and-drop schedule changes in Gantt view', isEnabled: true, scope: 'All plans' },
        { key: 'kpi_hierarchy', name: 'Hierarchical KPI', description: 'Aggregates member scores to lead and manager dashboards', isEnabled: true, scope: 'Business and Enterprise' },
        { key: 'eod_summary_drafts', name: 'EOD summary drafts', description: 'Auto-generates draft tomorrow plan for approval', isEnabled: false, scope: 'Enterprise beta' },
        { key: 'mobile_geo_checkin', name: 'Mobile check-in location', description: 'Stores GPS coordinates on mobile check-in', isEnabled: false, scope: 'Opt-in per organization' },
        { key: 'saml_sso', name: 'SAML single sign-on', description: 'Enterprise identity provider integration', isEnabled: true, scope: 'Enterprise' },
    ];
    for (const f of flags) {
        await prisma.featureFlag.upsert({
            where: { key: f.key },
            update: {},
            create: f,
        });
    }
    // 16. Other Platform Organizations for God Mode Multi-Tenancy
    const otherOrgs = [
        { slug: 'northwind', name: 'Northwind Labs', plan: 'Enterprise', status: 'Active', tz: 'Europe/London' },
        { slug: 'acme', name: 'Acme Analytics', plan: 'Business', status: 'Active', tz: 'America/New_York' },
        { slug: 'lumen', name: 'Lumen Retail Ops', plan: 'Trial', status: 'Trial', tz: 'Asia/Kolkata' },
        { slug: 'harbor', name: 'Harbor Health', plan: 'Starter', status: 'Suspended', tz: 'Australia/Sydney' },
        { slug: 'kestrel', name: 'Kestrel Systems', plan: 'Enterprise', status: 'Active', tz: 'Asia/Singapore' },
    ];
    for (const o of otherOrgs) {
        await prisma.organization.upsert({
            where: { slug: o.slug },
            update: {},
            create: {
                slug: o.slug,
                name: o.name,
                subscriptionTier: o.plan,
                subscriptionStatus: o.status,
                timezone: o.tz,
            },
        });
    }
    // 17. Audit Log
    await prisma.auditLog.create({
        data: {
            organizationId: org.id,
            actorName: 'Kiruvantham C',
            module: 'Approvals',
            action: 'Approved work log (Yogesh, 6 Nov)',
        },
    });
    await prisma.platformAuditLog.create({
        data: {
            actorName: 'Platform Admin',
            action: 'Started support session SS-118 on Northwind Labs (consent: org owner)',
            module: 'Support',
        },
    });
    console.log('Seeding completed successfully with 31 tickets and full BlindMatrix KPI hierarchy!');
}
main()
    .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
