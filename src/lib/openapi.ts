export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'RecActs SaaS API',
    version: '1.0.0',
    description:
      'Production-oriented multi-tenant REST API for RecActs - Work. Track. Achieve.',
    contact: {
      name: 'BlindMatrix & RecActs Architecture Team',
      email: 'support@demo.recacts.app',
    },
  },
  servers: [
    {
      url: '/api',
      description: 'Current Environment API Base',
    },
  ],
  tags: [
    { name: 'Auth', description: 'Authentication, session info, and role switching' },
    { name: 'Attendance', description: 'Check-in, check-out, sessions, and correction workflow' },
    { name: 'WorkLogs', description: 'Ticket-based daily time tracking and lead approvals' },
    { name: 'Tickets', description: 'Requirement tickets, shared weightages, and timelines' },
    { name: 'Blockers', description: 'Blocker tracking, next-day alerts, and escalation' },
    { name: 'Leave', description: 'Leave balances, requests, and approval workflow' },
    { name: 'KPI', description: 'Performance engine, target overrides, and negative impacts' },
    { name: 'EOD', description: 'Automated end-of-day report generation and delivery' },
    { name: 'Reports', description: 'Aggregated analytics and data exports' },
    { name: 'GodMode', description: 'Platform administration, feature flags, and multi-org management' },
  ],
  paths: {
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current authenticated user context, active role, and tenant',
        responses: {
          '200': { description: 'Authenticated user and organization context' },
          '401': { description: 'Not authenticated' },
        },
      },
    },
    '/auth/switch-role': {
      post: {
        tags: ['Auth'],
        summary: 'Switch active simulation role or user identity for authorized testing',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  role: { type: 'string', enum: ['member', 'lead', 'manager', 'hr', 'owner', 'god'] },
                  userId: { type: 'string' },
                },
                required: ['role'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Session updated with new role' },
        },
      },
    },
    '/attendance/status': {
      get: {
        tags: ['Attendance'],
        summary: 'Get attendance status and active sessions for today',
        responses: {
          '200': { description: 'Attendance summary and list of sessions' },
        },
      },
    },
    '/attendance/check-in': {
      post: {
        tags: ['Attendance'],
        summary: 'Check in for work session',
        responses: {
          '200': { description: 'Checked in successfully' },
        },
      },
    },
    '/attendance/check-out': {
      post: {
        tags: ['Attendance'],
        summary: 'Check out of current active session',
        responses: {
          '200': { description: 'Checked out successfully' },
        },
      },
    },
    '/work-logs': {
      get: {
        tags: ['WorkLogs'],
        summary: 'Get work logs for a given date or period',
        parameters: [
          { name: 'date', in: 'query', schema: { type: 'string' }, description: 'YYYY-MM-DD' },
        ],
        responses: {
          '200': { description: 'Work log with activity rows and status' },
        },
      },
      post: {
        tags: ['WorkLogs'],
        summary: 'Save draft activities for today',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  date: { type: 'string' },
                  activities: { type: 'array', items: { type: 'object' } },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Draft work log saved' },
        },
      },
    },
    '/work-logs/submit': {
      post: {
        tags: ['WorkLogs'],
        summary: 'Submit work log for Team Lead approval',
        responses: {
          '200': { description: 'Work log submitted for approval' },
        },
      },
    },
    '/work-logs/approvals': {
      get: {
        tags: ['WorkLogs'],
        summary: 'Get Team Lead approval queue of submitted work logs',
        responses: {
          '200': { description: 'List of submitted work logs pending review' },
        },
      },
      post: {
        tags: ['WorkLogs'],
        summary: 'Approve or return submitted work log with comments',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  workLogId: { type: 'string' },
                  action: { type: 'string', enum: ['approve', 'return'] },
                  comments: { type: 'string' },
                },
                required: ['workLogId', 'action'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Approval decision recorded' },
        },
      },
    },
    '/tickets': {
      get: {
        tags: ['Tickets'],
        summary: 'List requirement tickets with shared allocations and status',
        responses: {
          '200': { description: 'Array of tickets' },
        },
      },
      post: {
        tags: ['Tickets'],
        summary: 'Create a new ticket with shared weightage allocations',
        responses: {
          '201': { description: 'Ticket created' },
        },
      },
    },
    '/blockers': {
      get: {
        tags: ['Blockers'],
        summary: 'List open and historical blockers',
        responses: {
          '200': { description: 'List of blockers' },
        },
      },
      post: {
        tags: ['Blockers'],
        summary: 'Raise a new blocker from daily log or ticket',
        responses: {
          '201': { description: 'Blocker raised' },
        },
      },
    },
    '/leave/requests': {
      get: {
        tags: ['Leave'],
        summary: 'List leave requests and history',
        responses: {
          '200': { description: 'List of leave requests' },
        },
      },
      post: {
        tags: ['Leave'],
        summary: 'Submit a new leave application with overlap validation',
        responses: {
          '201': { description: 'Leave request submitted' },
        },
      },
    },
    '/kpi/calculate': {
      get: {
        tags: ['KPI'],
        summary: 'Calculate real-time KPI score, targets, and deductions for an employee or team',
        responses: {
          '200': { description: 'KPI calculation breakdown' },
        },
      },
    },
    '/kpi/overrides': {
      post: {
        tags: ['KPI'],
        summary: 'Submit or approve a target override',
        responses: {
          '200': { description: 'Target override processed' },
        },
      },
    },
    '/eod/generate': {
      post: {
        tags: ['EOD'],
        summary: 'Trigger automated end-of-day report generation',
        responses: {
          '200': { description: 'EOD report generated and dispatched' },
        },
      },
    },
    '/god/orgs': {
      get: {
        tags: ['GodMode'],
        summary: 'List all platform organizations, subscription plans, and health',
        responses: {
          '200': { description: 'Organizations summary' },
        },
      },
    },
  },
};
