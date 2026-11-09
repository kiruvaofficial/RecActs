# RecActs — Work. Track. Achieve.

> **Production-Oriented Multi-Tenant SaaS Web Application**  
> Initial Organization: BlindMatrix Requirements Team

---

## 1. Executive Overview

**RecActs** is a centralized SaaS platform replacing manual Excel timesheets, ticket allocations, and performance calculations with an auditable, normalized system.

### Key Capabilities

1. **Multi-Tenant Architecture**: Strict organizational isolation, multi-org support, timezone handling, and custom policy configurations.
2. **Employee Hierarchy**: Team assignments, dynamic reporting relationships, designations, and effective dates.
3. **Attendance Management**: Daily check-in/out, live session duration tracking, break management, and attendance correction workflows.
4. **Daily Work Logs**: Integer-minute effort logging against assigned requirement tickets, draft editing, and timesheet submission.
5. **Team Lead Approvals**: Approval queue, drill-down activity review, one-click approve, return for correction with mandatory review notes, and bulk approval.
6. **Automated EOD Reporting**: Automated end-of-day report generation, attendance vs logged hours reconciliation, and retry mechanisms.
7. **Requirement Tickets & Shared Weightages**: Shared ticket allocations (e.g., REQ-I3001: 22h split into Yogesh 10h + Hemanth 12h) preventing double counting.
8. **Interactive Gantt Timeline**: Day/Week/Month views with planned vs actual progress, milestone markers, and leave overlays.
9. **Blocker & Impediment Board**: Severity ranking (Critical/High/Medium/Low), next-day visibility rules, escalation to Manager, and resolution tracking.
10. **Leave Planner**: Leave balances (CL, SL, EL, CO, LOP), half-day support, approval workflows, and conflict detection.
11. **Configurable KPI Engine**: Formula-driven calculations (`Available Days × Daily Hours × 90% Productivity × Capacity Factor`).
12. **Target Overrides & Negative Impacts**: Manager-approved overrides and rule-based performance deductions (e.g., 1st reassignment: 5%, rework hours).
13. **God Mode Platform Administration**: Dedicated platform management area for managing organizations, subscription tiers, feature flags, and audited support sessions.
14. **Audit Trail**: Immutable chronological audit logs for all security, approval, ticket weightage, and override events.
15. **REST API & OpenAPI 3.0 Documentation**: Documented endpoints accessible via `/api/docs`.

---

## 2. Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons
- **Backend**: Next.js REST API Route Handlers, OpenAPI / Swagger Specification
- **Database & ORM**: PostgreSQL / SQLite, Prisma ORM 5
- **Authentication**: Secure Session Management, HTTP-only Cookies, Password Hashing (bcryptjs), JWT
- **Automated Testing**: Node.js Test Runner covering KPI engine, tenant isolation, attendance, work logs, shared tickets, leave planner, and blockers

---

## 3. Seeded Demonstration Data (BlindMatrix)

### Management & Leadership
- **Manager**: Don Michael (`don.michael@demo.recacts.app`)
- **Director / Org Owner**: Arun Kumar (`arun.kumar@demo.recacts.app`)
- **HR Executive**: Meena S (`meena.s@demo.recacts.app`)

### Team Alpha
- **Team Lead**: Kiruvantham (`kiruvantham@demo.recacts.app`)
- **Senior Business Analyst**: Yogesh (`yogesh@demo.recacts.app`)
- **Business Analyst**: Hemanth (`hemanth@demo.recacts.app`)
- **UI/UX Analyst**: Saravana Priya (`saravana.priya@demo.recacts.app`)
- **Business Analyst**: Dharshana (`dharshana@demo.recacts.app`)
- **Associate Analyst**: Sharath (`sharath@demo.recacts.app`)

### Team Beta
- **Team Lead**: Rasiga Priya (`rasiga.priya@demo.recacts.app`)
- **Business Analyst**: Srinath (`srinath@demo.recacts.app`)
- **Senior Business Analyst**: Karuppaiah (`karuppaiah@demo.recacts.app`)
- **Business Analyst**: Dinesh Yadav (`dinesh.yadav@demo.recacts.app`)
- **Associate Analyst (Onboarding)**: Madhan R (`madhan.r@demo.recacts.app`)

### Platform God Mode
- **Platform Super Admin**: Admin (`admin@recacts.app`)

*Default password for demo accounts:* `password123`

---

## 4. Getting Started Locally

### Prerequisites
- Node.js 18+ (tested with Node.js 20 & 26)
- npm 10+

### Setup Steps
```bash
# 1. Install dependencies
npm install

# 2. Synchronize Prisma database schema
npx prisma db push

# 3. Seed demonstration data
node prisma/seed.js

# 4. Run automated test suite
npm test

# 5. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 5. Docker Deployment

Deploy with Docker Compose:
```bash
docker compose -f docker/docker-compose.yml up -d --build
```
This launches:
- `recacts-web`: Next.js web application on port 3000
- `recacts-postgres`: PostgreSQL 16 database on port 5432
- `recacts-redis`: Redis 7 instance on port 6379

---

## 6. Automated Test Suite

Run all automated unit and integration tests:
```bash
npm test
```
Test results verify:
- Attendance recording and duration calculation
- Blocker lifecycle and manager escalation
- Leave-adjusted KPI target calculation
- Capacity factor differentiation (Member: 100%, Lead: 90%, Manager: 80%)
- Target override calculation
- Negative impact deduction mechanics
- Zero-denominator safety
- Team hierarchical aggregation
- Leave balance decrement and half-day support
- Shared ticket weightage allocation and no double-counting
- Multi-tenant data isolation across organizations
- Work log approval and locking mechanics
