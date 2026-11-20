/**
 * Helper to generate direct deep-link URLs to Zoho Sprints work items.
 *
 * Zoho Sprints SPA URL Format:
 * https://sprints.zoho.[com|in|eu]/workspace/{portalName}#{projectKey}/itemdetails/{itemKey}
 *
 * Example:
 * https://sprints.zoho.com/workspace/bmdevelopment#P5/itemdetails/I7306
 */

// Mapping of Zoho Sprints Project IDs to their Project Keys (P + projNo)
const ZOHO_PROJECT_KEY_MAP: Record<string, string> = {
  '101301000000010271': 'P5', // Version 4 in progress
  '101301000000105539': 'P8', // Requirements in progress
  '101301000007065415': 'P55', // AI Agentic team
  '101301000006534930': 'P54', // Fabritec LLC
  '101301000005400082': 'P50', // Apollo Blinds
  '101301000004579607': 'P47', // EDI Tickets
  '101301000004830726': 'P49', // Offline - Dev in progress
  '101301000004803518': 'P48', // Offline- Testing in progress
  '101301000004567744': 'P46', // Mobile - Dev backlog
  '101301000004567631': 'P45', // Online - Dev in progress
  '101301000004567428': 'P44', // Online - Testing in progress
  '101301000004567369': 'P43', // Mobile - Testing backlog-Online App
  '101301000004449872': 'P38', // Onboarding & Support team waiting
  '101301000004036615': 'P37', // UK Data Tickets
  '101301000004029546': 'P36', // Version 4 updated live
  '101301000004025616': 'P35', // Old_In Progress-Testing
  '101301000003990795': 'P34', // Vision Board - Low priority
  '101301000003969078': 'P33', // Testing Backlog
  '101301000003967841': 'P32', // Version 4 backlog
  '101301000003678002': 'P31', // Vision board - High priority
  '101301000000645041': 'P21', // Report tickets (Workload)
  '101301000000640359': 'P20', // Data tickets (workload)
  '101301000000509437': 'P12', // Homefair
  '101301000000436327': 'P10', // DB - Update
  '101301000000010327': 'P6', // Ecommerce
  '101301000000010223': 'P4', // Version 3 PHP
};

export function buildZohoSprintTicketUrl(ticket: {
  id?: string;
  reference?: string;
  rawPayload?: any;
}): string {
  const portalName =
    process.env.NEXT_PUBLIC_ZOHO_PORTAL_NAME ||
    process.env.ZOHO_PORTAL_NAME ||
    'bmdevelopment';
  const region = (
    process.env.NEXT_PUBLIC_ZOHO_REGION ||
    process.env.ZOHO_REGION ||
    'us'
  ).toLowerCase();

  const baseDomain =
    region === 'in'
      ? 'https://sprints.zoho.in'
      : region === 'eu'
      ? 'https://sprints.zoho.eu'
      : region === 'au'
      ? 'https://sprints.zoho.com.au'
      : 'https://sprints.zoho.com';

  const raw = ticket.rawPayload || {};

  // 1. Determine Project Key (e.g. P5)
  let projectKey = 'P5';
  const rawProjId = String(raw.projectId || raw.projId || raw.project_id || '').trim();
  if (rawProjId && ZOHO_PROJECT_KEY_MAP[rawProjId]) {
    projectKey = ZOHO_PROJECT_KEY_MAP[rawProjId];
  } else {
    const sName = String(raw.sprintName || raw.sprintInfo?.name || '').toLowerCase();
    const ref = String(ticket.reference || '').toUpperCase();
    if (sName.includes('agentic') || ref.startsWith('AGT-') || ref.startsWith('AI-')) {
      projectKey = 'P55';
    } else if (sName.includes('fabritec') || ref.startsWith('FAB-')) {
      projectKey = 'P54';
    } else if (sName.includes('requirements') || ref.startsWith('REQ-')) {
      projectKey = 'P8';
    } else {
      projectKey = 'P5'; // Version 4 in progress default
    }
  }

  // 2. Determine Item Key (e.g. I7306)
  let itemNum = '';
  if (raw.itemNo) {
    itemNum = String(raw.itemNo).trim();
  } else if (ticket.reference) {
    const match = ticket.reference.match(/I?(\d+)/i);
    if (match) itemNum = match[1];
  }

  if (itemNum) {
    const itemKey = `I${itemNum}`;
    return `${baseDomain}/workspace/${portalName}#${projectKey}/itemdetails/${itemKey}`;
  }

  // Fallback to itemId if itemNo is unavailable
  const itemId = String(raw.itemId || raw.id || raw.item_id || '').trim();
  if (itemId) {
    return `${baseDomain}/workspace/${portalName}#${projectKey}/itemdetails/${itemId}`;
  }

  return `${baseDomain}/workspace/${portalName}`;
}
