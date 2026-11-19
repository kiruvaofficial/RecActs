import fs from 'fs';
import path from 'path';

export interface ZohoProjectItem {
  id: string;
  name: string;
  prefix?: string;
  itemCount?: number;
  status?: string;
  isKnownDefault?: boolean;
}

export const KNOWN_ZOHO_PROJECTS: ZohoProjectItem[] = [
  { id: "101301000000105539", name: "Requirements in progress", prefix: "LA-I", isKnownDefault: true },
  { id: "101301000007065415", name: "AI Agentic team", prefix: "AGT", isKnownDefault: true },
  { id: "101301000006534930", name: "Fabritec LLC", prefix: "FAB", isKnownDefault: true },
  { id: "101301000005400082", name: "Apollo Blinds", prefix: "APO" },
  { id: "101301000004579607", name: "EDI Tickets", prefix: "EDI" },
  { id: "101301000006382424", name: "TEST1", prefix: "TST" },
  { id: "101301000004830726", name: "Offline - Dev in progress", prefix: "OFF" },
  { id: "101301000004803518", name: "Offline- Testing in progress", prefix: "OTST" },
  { id: "101301000004567744", name: "Mobile - Dev backlog", prefix: "MOB" },
  { id: "101301000004567631", name: "Online - Dev in progress", prefix: "ONL" },
  { id: "101301000004567428", name: "Online - Testing in progress", prefix: "OTST" },
  { id: "101301000004567369", name: "Mobile - Testing backlog-Online App", prefix: "MTST" },
  { id: "101301000004449872", name: "Onboarding & Support team waiting", prefix: "ONB" },
  { id: "101301000004036615", name: "UK Data Tickets", prefix: "UKD" },
  { id: "101301000004029546", name: "Version 4 updated live", prefix: "V4L" },
  { id: "101301000004025616", name: "In Progress-Testing", prefix: "IPT" },
  { id: "101301000003990795", name: "Vision Board - Low priority", prefix: "VBL" },
  { id: "101301000003969078", name: "Testing Backlog", prefix: "TB" },
  { id: "101301000003967841", name: "Version 4 backlog", prefix: "V4B" },
  { id: "101301000003678002", name: "Vision board - High priority", prefix: "VBH" },
  { id: "101301000000645041", name: "Report tickets (Workload)", prefix: "RPT" },
  { id: "101301000000640359", name: "Data tickets (workload)", prefix: "DT" },
  { id: "101301000000509437", name: "Homefair", prefix: "HF" },
  { id: "101301000000436327", name: "DB - Update", prefix: "DB" },
  { id: "101301000000010327", name: "Ecommerce", prefix: "ECM" },
  { id: "101301000000010271", name: "Version 4 in progress", prefix: "V4", isKnownDefault: true },
  { id: "101301000000010223", name: "Version 3 PHP", prefix: "V3" },
];

const CONFIG_FILE_PATH = path.resolve(process.cwd(), '.zoho-sync-projects.json');

const DEFAULT_SELECTED_IDS = [
  "101301000000010271", // Version 4 in progress
  "101301000000105539", // Requirements in progress
  "101301000007065415", // AI Agentic team
  "101301000006534930", // Fabritec LLC
];

export function getSelectedProjectIds(): string[] {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const data = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed?.selectedProjectIds) && parsed.selectedProjectIds.length > 0) {
        return parsed.selectedProjectIds;
      }
    }
  } catch (e) {
    console.warn('Could not read .zoho-sync-projects.json:', e);
  }

  // Fallback to environment variable or defaults
  if (process.env.ZOHO_SELECTED_PROJECTS) {
    const fromEnv = process.env.ZOHO_SELECTED_PROJECTS.split(',').map((s) => s.trim()).filter(Boolean);
    if (fromEnv.length > 0) return fromEnv;
  }

  return DEFAULT_SELECTED_IDS;
}

export function saveSelectedProjectIds(projectIds: string[]): string[] {
  try {
    const cleanIds = Array.from(new Set(projectIds.filter(Boolean)));
    const content = JSON.stringify(
      {
        selectedProjectIds: cleanIds,
        updatedAt: new Date().toISOString(),
      },
      null,
      2
    );
    fs.writeFileSync(CONFIG_FILE_PATH, content, 'utf8');
    return cleanIds;
  } catch (e) {
    console.error('Failed saving selected Zoho project IDs:', e);
    return projectIds;
  }
}

/**
 * Fetch dynamic projects list from Zoho Sprints API (per Zoho Sprints Documentation)
 * Endpoint: GET /zsapi/team/{portal_id}/projects/?action=data&index=1&range=100
 */
export async function fetchZohoProjectsList(
  accessToken: string,
  portalId: string = '730202335',
  region: 'us' | 'in' | 'eu' | 'au' = 'us'
): Promise<ZohoProjectItem[]> {
  const accountsUrl = region === 'in' ? 'https://sprintsapi.zoho.in' : 'https://sprintsapi.zoho.com';
  const urlsToTry = [
    `${accountsUrl}/zsapi/team/${portalId}/projects/?action=data&index=1&range=100`,
    `${accountsUrl}/zsapi/team/${portalId}/projects/?action=allprojects&index=1&range=100`,
    `${accountsUrl}/zsapi/team/${portalId}/projects/`,
  ];

  const headers = {
    Authorization: `Zoho-oauthtoken ${accessToken}`,
    Accept: 'application/json',
  };

  const dynamicProjectsMap = new Map<string, ZohoProjectItem>();

  // Pre-seed with known projects
  for (const kp of KNOWN_ZOHO_PROJECTS) {
    dynamicProjectsMap.set(kp.id, { ...kp });
  }

  for (const url of urlsToTry) {
    try {
      const res = await fetch(url, { headers });
      if (res.ok) {
        const json = await res.json();
        const list = json.projects || json.project_details || json.data || (Array.isArray(json) ? json : []);
        if (Array.isArray(list)) {
          for (const item of list) {
            const pId = String(item.id || item.proj_id || item.projId || '');
            const pName = item.projName || item.name || item.project_name || `Project ${pId}`;
            const pPrefix = item.prefix || item.project_prefix || item.item_prefix || '';
            const status = item.status || 'Active';
            if (pId) {
              dynamicProjectsMap.set(pId, {
                id: pId,
                name: pName,
                prefix: pPrefix,
                status: String(status),
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn(`Error fetching projects from ${url}:`, e);
    }
  }

  return Array.from(dynamicProjectsMap.values());
}
