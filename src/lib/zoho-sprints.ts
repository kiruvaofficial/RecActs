import fs from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';
import { invalidateBootstrapCache } from '@/lib/bootstrap';
import { getSelectedProjectIds, KNOWN_ZOHO_PROJECTS } from '@/lib/zoho-project-config';
import { saveRawZohoItems, saveDiscoveredCustomFields, ZohoCustomFieldDefinition } from '@/lib/zoho-raw-store';
import { recordSyncCompletion } from '@/lib/zoho-schedule';

export interface ZohoSprintsConfig {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  accessToken?: string;
  portalId?: string;
  region?: 'us' | 'in' | 'eu' | 'au';
}

const REGION_DOMAINS: Record<string, { accounts: string; api: string }> = {
  us: { accounts: 'https://accounts.zoho.com', api: 'https://sprintsapi.zoho.com' },
  in: { accounts: 'https://accounts.zoho.in', api: 'https://sprintsapi.zoho.in' },
  eu: { accounts: 'https://accounts.zoho.eu', api: 'https://sprintsapi.zoho.eu' },
  au: { accounts: 'https://accounts.zoho.com.au', api: 'https://sprintsapi.zoho.com.au' },
};

const KNOWN_PROJECT_IDS: Record<string, string> = {
  "Requirements in progress": "101301000000105539",
  "Requirements": "101301000000105539",
  "AI Agentic team": "101301000007065415",
  "Fabritec LLC": "101301000006534930",
  "TEST1": "101301000006382424",
  "Apollo Blinds": "101301000005400082",
  "Offline - Dev in progress": "101301000004830726",
  "Offline- Testing in progress": "101301000004803518",
  "EDI Tickets": "101301000004579607",
  "Mobile - Dev backlog": "101301000004567744",
  "Online - Dev in progress": "101301000004567631",
  "Online - Testing in progress": "101301000004567428",
  "Mobile - Testing backlog-Online App": "101301000004567369",
  "Onboarding & Support team waiting": "101301000004449872",
  "UK Data Tickets": "101301000004036615",
  "Version 4 updated live": "101301000004029546",
  "In Progress-Testing": "101301000004025616",
  "Vision Board - Low priority": "101301000003990795",
  "Testing Backlog": "101301000003969078",
  "Version 4 backlog": "101301000003967841",
  "Vision board - High priority": "101301000003678002",
  "Report tickets (Workload)": "101301000000645041",
  "Data tickets (workload)": "101301000000640359",
  "Homefair": "101301000000509437",
  "DB - Update": "101301000000436327",
  "Ecommerce": "101301000000010327",
  "Version 4 in progress": "101301000000010271",
  "Version 3 PHP": "101301000000010223"
};

const KNOWN_STATUS_IDS: Record<string, string> = {
  "101301000005175647": "Requirement Analysis",
  "101301000000051001": "New",
  "101301000000051002": "Analysis",
  "101301000000051003": "Documentation",
  "101301000000051004": "Waiting Review",
  "101301000000051005": "Waiting Clarification",
  "101301000000051006": "Development",
  "101301000000051007": "Testing",
  "101301000000051008": "Completed",
};

// Global cached access token in memory with timestamp
let cachedToken: { accessToken: string; expiresAt: number; region: string } | null = null;
let lastSyncMetadata: {
  timestamp: string;
  totalSynced: number;
  created: number;
  updated: number;
  error?: string;
} | null = null;

export function getLastSyncMetadata() {
  return lastSyncMetadata;
}

export function saveZohoRefreshTokenToEnv(token: string) {
  if (!token || token.trim().length < 15) return;
  try {
    process.env.ZOHO_REFRESH_TOKEN = token.trim();
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      let content = fs.readFileSync(envPath, 'utf8');
      if (content.includes('ZOHO_REFRESH_TOKEN=')) {
        content = content.replace(/ZOHO_REFRESH_TOKEN=.*(\r?\n|$)/, `ZOHO_REFRESH_TOKEN="${token.trim()}"$1`);
      } else {
        content += `\nZOHO_REFRESH_TOKEN="${token.trim()}"\n`;
      }
      fs.writeFileSync(envPath, content, 'utf8');
    }
  } catch (e) {
    console.error('Failed to update .env with refresh token:', e);
  }
}

/**
 * Resolves active Zoho OAuth Access Token across regions
 */
export async function getActiveZohoAccessToken(overrideConfig?: ZohoSprintsConfig): Promise<{
  accessToken: string;
  region: 'us' | 'in' | 'eu' | 'au';
  portalId: string;
}> {
  const clientId =
    overrideConfig?.clientId ||
    process.env.ZOHO_CLIENT_ID ||
    process.env.VITE_ZOHO_CLIENT_ID ||
    '1000.O1OL92CNYEKKMU9P7ABHC4NNR9XJCP';

  const clientSecret =
    overrideConfig?.clientSecret ||
    process.env.ZOHO_CLIENT_SECRET ||
    process.env.VITE_ZOHO_CLIENT_SECRET ||
    '85015712e3bbd0f9763d9ac4142370ca7a2cc32319';

  const refreshToken =
    overrideConfig?.refreshToken ||
    process.env.ZOHO_REFRESH_TOKEN ||
    process.env.VITE_ZOHO_REFRESH_TOKEN ||
    '';

  const portalId =
    overrideConfig?.portalId ||
    process.env.ZOHO_PORTAL_ID ||
    process.env.VITE_ZOHO_PORTAL_ID ||
    '730202335';

  const preferredRegion = (overrideConfig?.region || process.env.ZOHO_REGION || 'us') as 'us' | 'in' | 'eu' | 'au';
  const regionsToTry: Array<'us' | 'in' | 'eu' | 'au'> = Array.from(new Set([preferredRegion, 'us', 'in', 'eu', 'au'])) as Array<'us' | 'in' | 'eu' | 'au'>;

  // 1. If explicit access token passed and fresh
  if (overrideConfig?.accessToken && overrideConfig.accessToken.length > 20) {
    return {
      accessToken: overrideConfig.accessToken,
      region: preferredRegion,
      portalId,
    };
  }

  // 2. If memory cache still valid
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return {
      accessToken: cachedToken.accessToken,
      region: cachedToken.region as any,
      portalId,
    };
  }

  const debugLogs: string[] = [];
  const redirectUrisToTry = [
    'http://localhost:3000/oauth/callback',
    'http://localhost:3000',
    '',
  ];

  // 1. If explicit access token passed or token looks like direct access_token (test directly)
  if (refreshToken && refreshToken.length > 20) {
    for (const r of regionsToTry) {
      const endpoints = REGION_DOMAINS[r] || REGION_DOMAINS.us;
      try {
        const testRes = await fetch(`${endpoints.api}/zsapi/teams/`, {
          headers: { Authorization: `Zoho-oauthtoken ${refreshToken}` },
        });
        if (testRes.ok) {
          const tData = await testRes.json();
          if (tData.portals || tData.teams || tData.defaultPortalId || tData.data) {
            cachedToken = {
              accessToken: refreshToken,
              expiresAt: Date.now() + 3600 * 1000,
              region: r,
            };
            return { accessToken: refreshToken, region: r, portalId };
          }
        }
      } catch (e: any) {
        debugLogs.push(`[Direct Token .${r}]: ${e?.message}`);
      }
    }
  }

  // 2. Try as Refresh Token
  if (refreshToken && refreshToken.length > 20) {
    for (const r of regionsToTry) {
      const endpoints = REGION_DOMAINS[r] || REGION_DOMAINS.us;

      for (const redUri of redirectUrisToTry) {
        try {
          const body = new URLSearchParams();
          body.append('grant_type', 'refresh_token');
          body.append('client_id', clientId);
          body.append('client_secret', clientSecret);
          body.append('refresh_token', refreshToken);
          if (redUri) body.append('redirect_uri', redUri);

          const res = await fetch(`${endpoints.accounts}/oauth/v2/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
          });

          const data = await res.json().catch(() => null);
          if (res.ok && data?.access_token) {
            const expiresIn = (data.expires_in || 3600) * 1000;
            cachedToken = {
              accessToken: data.access_token,
              expiresAt: Date.now() + expiresIn,
              region: r,
            };
            if (refreshToken && refreshToken.length > 20) {
              saveZohoRefreshTokenToEnv(refreshToken);
            }
            return { accessToken: data.access_token, region: r, portalId };
          } else if (data?.error) {
            debugLogs.push(`[Refresh .${r} uri=${redUri || 'none'}]: ${data.error}`);
          }
        } catch (e: any) {
          debugLogs.push(`[Refresh Err .${r}]: ${e?.message}`);
        }
      }
    }

    // 3. Try as Authorization Code (Grant code)
    for (const r of regionsToTry) {
      const endpoints = REGION_DOMAINS[r] || REGION_DOMAINS.us;

      for (const redUri of redirectUrisToTry) {
        try {
          const codeBody = new URLSearchParams();
          codeBody.append('grant_type', 'authorization_code');
          codeBody.append('client_id', clientId);
          codeBody.append('client_secret', clientSecret);
          codeBody.append('code', refreshToken);
          if (redUri) codeBody.append('redirect_uri', redUri);

          const codeRes = await fetch(`${endpoints.accounts}/oauth/v2/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: codeBody.toString(),
          });

          const codeData = await codeRes.json().catch(() => null);
          if (codeRes.ok && codeData?.access_token) {
            const expiresIn = (codeData.expires_in || 3600) * 1000;
            cachedToken = {
              accessToken: codeData.access_token,
              expiresAt: Date.now() + expiresIn,
              region: r,
            };
            if (codeData.refresh_token) {
              saveZohoRefreshTokenToEnv(codeData.refresh_token);
            }
            return { accessToken: codeData.access_token, region: r, portalId };
          } else if (codeData?.error) {
            debugLogs.push(`[GrantCode .${r} uri=${redUri || 'none'}]: ${codeData.error}`);
          }
        } catch (e: any) {
          debugLogs.push(`[GrantCode Err .${r}]: ${e?.message}`);
        }
      }
    }
  }

  const logSummary = debugLogs.slice(-6).join(' | ');
  throw new Error(
    `Zoho OAuth verification failed. ${logSummary || 'Please check your Grant Code or Refresh Token.'}`
  );
}

/**
 * Extracts clean customer name from title, tags, or fields
 */
function extractCustomer(rawTitle: string, explicitCustomer?: string | null): string {
  if (explicitCustomer && explicitCustomer.trim()) return explicitCustomer.trim();
  const lower = rawTitle.toLowerCase();

  if (lower.includes('sienna shutter')) return 'Sienna Shutters';
  if (lower.includes('apollo')) return 'Apollo Blinds';
  if (lower.includes('eclipse')) return 'Eclipse Blinds';
  if (lower.includes('hillarys')) return 'Hillarys UK';
  if (lower.includes('premier')) return 'Premier Blinds';
  if (lower.includes('shuttercraft')) return 'Shuttercraft Ltd';
  if (lower.includes('luxaflex')) return 'Luxaflex UK';
  if (lower.includes('carter blind')) return 'Carter Blinds';
  if (lower.includes('chennai blind')) return 'Chennai Blinds';
  if (lower.includes('talbot')) return 'Talbot & Son';
  if (lower.includes('seaview')) return 'Seaview';
  if (lower.includes('aft')) return 'AFT Blinds';
  if (lower.includes('rainbow')) return 'Rainbow';
  if (lower.includes('cityblindsni')) return 'Cityblindsni';
  if (lower.includes('nerval')) return 'Nerval Corp';
  if (lower.includes('umbra shading')) return 'Umbra Shading';
  if (lower.includes('shades blind')) return 'Shades Blinds';
  if (lower.includes('advance shutter')) return 'Advance Shutters';
  if (lower.includes('master blind')) return 'Master Blinds';
  if (lower.includes('kenlow')) return 'Kenlow';
  if (lower.includes('reuther')) return 'Reuther';
  if (lower.includes('solis')) return 'Solis';
  if (lower.includes('fabritec')) return 'Fabritec LLC';
  if (lower.includes('forma living')) return 'Forma Living';
  if (lower.includes('phoenix blind')) return 'Phoenix Blinds';
  if (lower.includes('studio shade')) return 'Studio Shade';
  if (lower.includes('bm copilot')) return 'BM Copilot';

  return 'BlindMatrix Client';
}

/**
 * Maps raw Zoho status to RecActs 4-column Kanban workflow:
 * 'To Do' | 'In Progress' | 'Under Review' | 'Completed'
 */
function mapZohoStatusToRecActs(rawStatus: any): 'To Do' | 'In Progress' | 'Under Review' | 'Completed' {
  if (!rawStatus) return 'In Progress';
  const str = String(
    typeof rawStatus === 'string'
      ? rawStatus
      : rawStatus.name || rawStatus.status_name || rawStatus.statusName || ''
  ).trim();

  const resolved = KNOWN_STATUS_IDS[str] || str;
  const lower = resolved.toLowerCase();

  if (
    lower.includes('complete') ||
    lower.includes('done') ||
    lower.includes('close') ||
    lower.includes('resolved')
  ) {
    return 'Completed';
  }

  if (
    lower.includes('review') ||
    lower.includes('clarification') ||
    lower.includes('documentation') ||
    lower.includes('prd') ||
    lower.includes('approval') ||
    lower.includes('waiting')
  ) {
    return 'Under Review';
  }

  if (
    lower.includes('new') ||
    lower.includes('backlog') ||
    lower.includes('not started') ||
    lower.includes('not yet')
  ) {
    return 'To Do';
  }

  return 'In Progress';
}

/**
 * Maps priority to RecActs standard: Low | Medium | High | Critical
 */
function mapZohoPriority(rawPriority: any): 'Low' | 'Medium' | 'High' | 'Critical' {
  if (!rawPriority) return 'Medium';
  const str = String(
    typeof rawPriority === 'string' ? rawPriority : rawPriority.name || rawPriority.priority_name || ''
  ).toLowerCase();

  if (str.includes('critical') || str.includes('highest') || str.includes('blocker') || str === '1' || str === 'p1') {
    return 'Critical';
  }
  if (str.includes('high') || str === '2' || str === 'p2') {
    return 'High';
  }
  if (str.includes('low') || str.includes('minor') || str === '4' || str === 'p4') {
    return 'Low';
  }
  return 'Medium';
}

export interface NormalizedCustomField {
  paramName: string;
  label: string;
  fieldType: string;
  rawValue: any;
  displayValue: string;
  sectionName?: string;
}

export interface NormalizedZohoTicket {
  reference: string;
  title: string;
  customerName: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'To Do' | 'In Progress' | 'Under Review' | 'Completed';
  rawStatusName: string;
  plannedStartDate: string;
  plannedDueDate: string;
  actualStartDate?: string | null;
  completedDate?: string | null;
  totalEstimatedHours: number;
  points?: number;
  description?: string;
  assigneeName?: string | null;
  projectName: string;
  sprintName?: string | null;
  customFields?: Record<string, NormalizedCustomField>;
  rawPayload?: any;
}

interface ProjectCustomFieldSchema {
  fieldDefinitions: Map<string, {
    udfName: string;
    fieldName: string;
    fieldType: number;
    fieldTypeName: string;
    sectionName?: string;
    isMandatory?: boolean;
    tooltip?: string;
  }>;
  optionIdToName: Map<string, string>;
}

function mapZohoFieldType(code: number, udfName: string): string {
  if (udfName.startsWith('UDF_DATE') && !udfName.startsWith('UDF_DATETIME')) return 'Date';
  if (udfName.startsWith('UDF_DATETIME')) return 'Date & Time';
  if (udfName.startsWith('UDF_MULTIPKL')) return 'Multi-Picklist';
  if (udfName.startsWith('UDF_PKL')) return 'Picklist / Dropdown';
  if (udfName.startsWith('UDF_RADIO')) return 'Radio Option';
  if (udfName.startsWith('UDF_CHKBOX')) return 'Checkbox';
  if (udfName.startsWith('UDF_URI')) return 'URL / Link';
  if (udfName.startsWith('UDF_LONG') || udfName.startsWith('UDF_DECIMAL')) return 'Number';
  if (udfName.startsWith('UDF_TEXT')) return 'Multi-Line Text';
  if (udfName.startsWith('UDF_CHAR')) return 'Single Line Text';

  switch (code) {
    case 1: return 'Single Line Text';
    case 2: return 'Date';
    case 3: return 'Date & Time';
    case 4: return 'Integer';
    case 5: return 'Long Number';
    case 6: return 'Decimal';
    case 7: return 'Picklist / Dropdown';
    case 8: return 'Checkbox';
    case 9: return 'Multi-Picklist';
    case 10: return 'URL / Link';
    case 11: return 'Checkbox Multi-Option';
    case 12: return 'Radio Option';
    case 13: return 'URL / Link';
    default: return 'Custom Field';
  }
}

/**
 * Fetches Custom Layouts and Fields schema for a project from Zoho Sprints API
 */
async function fetchProjectCustomFieldsSchema(
  baseUrl: string,
  portalId: string,
  projectId: string,
  projectName: string,
  headers: Record<string, string>
): Promise<ProjectCustomFieldSchema> {
  const schema: ProjectCustomFieldSchema = {
    fieldDefinitions: new Map(),
    optionIdToName: new Map(),
  };

  try {
    const res = await fetch(
      `${baseUrl}/team/${portalId}/projects/${projectId}/modules/101301000000002027/?action=formfields`,
      { headers }
    );
    if (!res.ok) return schema;

    const json = await res.json();
    const discoveredDefs: ZohoCustomFieldDefinition[] = [];

    const sectionVSfields = json.sectionVSfields || {};
    const sectionNames = json.sectionData?.customsectionJObj || {};

    for (const [secId, secData] of Object.entries<any>(sectionVSfields)) {
      const secTitle = sectionNames[secId]?.[1] || 'General';
      const fieldJObj = secData?.fieldJObj || {};

      for (const [fId, fVal] of Object.entries<any>(fieldJObj)) {
        if (!Array.isArray(fVal)) continue;
        const fieldName = String(fVal[0] || '').trim();
        const udfName = String(fVal[6] || fVal[7] || '').trim();
        const fieldTypeCode = Number(fVal[3] ?? 0);
        const isMandatory = Boolean(fVal[12]);
        const tooltip = String(fVal[14] || '');
        const optionGroups = fVal[19];

        const optionsList: Array<{ id: string; name: string }> = [];

        if (optionGroups && typeof optionGroups === 'object' && optionGroups.groupJObj) {
          for (const grp of Object.values<any>(optionGroups.groupJObj)) {
            const optJObj = grp[1]?.optionJObj || {};
            for (const [optId, optData] of Object.entries<any>(optJObj)) {
              const optName = Array.isArray(optData) ? String(optData[0] || '').trim() : String(optData || '').trim();
              if (optName) {
                schema.optionIdToName.set(optId, optName);
                optionsList.push({ id: optId, name: optName });
              }
            }
          }
        }

        const fieldTypeName = mapZohoFieldType(fieldTypeCode, udfName);

        if (udfName && (udfName.startsWith('UDF_') || udfName.toLowerCase().includes('custom'))) {
          schema.fieldDefinitions.set(udfName, {
            udfName,
            fieldName: fieldName || udfName,
            fieldType: fieldTypeCode,
            fieldTypeName,
            sectionName: secTitle,
            isMandatory,
            tooltip,
          });

          discoveredDefs.push({
            paramName: udfName,
            fieldName: fieldName || udfName,
            fieldType: fieldTypeCode,
            fieldTypeName,
            projectId,
            projectName,
            sectionName: secTitle,
            isMandatory,
            tooltip,
            options: optionsList.length > 0 ? optionsList : undefined,
          });
        }
      }
    }

    if (discoveredDefs.length > 0) {
      saveDiscoveredCustomFields(discoveredDefs);
    }
  } catch (e) {
    console.warn(`Failed fetching custom fields schema for project ${projectId}:`, e);
  }

  return schema;
}

/**
 * Enriches item list with full details & custom fields (UDF_*) from Zoho Sprints
 */
async function enrichItemsWithDetails(
  rawItems: any[],
  projectId: string,
  sprintId: string | undefined,
  baseUrl: string,
  portalId: string,
  headers: Record<string, string>
): Promise<any[]> {
  const concurrency = 6;
  const enriched: any[] = [];

  for (let i = 0; i < rawItems.length; i += concurrency) {
    const chunk = rawItems.slice(i, i + concurrency);
    const chunkResults = await Promise.all(
      chunk.map(async (raw) => {
        const itemNo = raw.itemNo;
        const itemId = raw.itemId || raw.id;

        const detailUrls: string[] = [];
        if (itemNo) {
          detailUrls.push(`${baseUrl}/team/${portalId}/projects/${projectId}/item/no-${itemNo}/?action=details`);
        }
        if (sprintId && itemId) {
          detailUrls.push(`${baseUrl}/team/${portalId}/projects/${projectId}/sprints/${sprintId}/item/${itemId}/?action=details`);
        }
        if (itemId) {
          detailUrls.push(`${baseUrl}/team/${portalId}/projects/${projectId}/item/${itemId}/?action=details`);
        }

        for (const url of detailUrls) {
          try {
            const res = await fetch(url, { headers });
            if (res.ok) {
              const json = await res.json();
              if (json.items && json.items.length > 0) {
                return { ...raw, ...json.items[0] };
              }
              if (json.itemJObj && json.item_prop && (itemId || json.itemIds?.[0])) {
                const effectiveId = itemId || json.itemIds[0];
                const arr = json.itemJObj[effectiveId];
                if (Array.isArray(arr)) {
                  const mappedProps: Record<string, any> = {};
                  for (const [propName, propIdx] of Object.entries<number>(json.item_prop)) {
                    mappedProps[propName] = arr[propIdx];
                  }
                  return { ...raw, ...mappedProps };
                }
              }
            }
          } catch {}
        }

        return raw;
      })
    );
    enriched.push(...chunkResults);
  }

  return enriched;
}

/**
 * Fetches all live items from Zoho Sprints REST API across active projects and backlog
 */
export async function fetchAllZohoTickets(
  config?: ZohoSprintsConfig,
  selectedProjectIds?: string[]
): Promise<NormalizedZohoTicket[]> {
  const { accessToken, region, portalId } = await getActiveZohoAccessToken(config);
  const endpoints = REGION_DOMAINS[region] || REGION_DOMAINS.us;
  const baseUrl = `${endpoints.api}/zsapi`;

  const headers: Record<string, string> = {
    Authorization: `Zoho-oauthtoken ${accessToken}`,
    'x-convert-response': 'true',
    Accept: 'application/json',
  };

  const projectIdsToFetch = (selectedProjectIds && selectedProjectIds.length > 0)
    ? selectedProjectIds
    : getSelectedProjectIds();

  const projectListToSync: Array<{ id: string; name: string }> = [];

  for (const pId of projectIdsToFetch) {
    const knownItem = KNOWN_ZOHO_PROJECTS.find((k) => k.id === pId);
    if (knownItem) {
      projectListToSync.push({ id: pId, name: knownItem.name });
    } else {
      const knownEntry = Object.entries(KNOWN_PROJECT_IDS).find(([_, id]) => id === pId);
      projectListToSync.push({ id: pId, name: knownEntry ? knownEntry[0] : `Project ${pId}` });
    }
  }

  // Try fetching official live projects list to enrich names if needed
  try {
    const pRes = await fetch(`${baseUrl}/team/${portalId}/projects/?action=data&index=1&range=100`, { headers });
    if (pRes.ok) {
      const pJson = await pRes.json();
      const list = pJson.projects || pJson.data || [];
      for (const p of list) {
        const pId = String(p.id || p.proj_id || p.projId || '');
        const pName = p.projName || p.name || p.project_name;
        const existing = projectListToSync.find((x) => x.id === pId);
        if (existing && pName) {
          existing.name = pName;
        }
      }
    }
  } catch (e) {
    console.warn('Failed listing dynamic Zoho projects:', e);
  }

  const rawTickets: NormalizedZohoTicket[] = [];
  const todayStr = new Date().toISOString().split('T')[0];

  // Fetch work items and schemas for each project
  for (const proj of projectListToSync) {
    const projId = proj.id;
    const projName = proj.name;

    // 0. Fetch custom fields schema for this project
    const schema = await fetchProjectCustomFieldsSchema(baseUrl, portalId, projId, projName, headers);

    // 1. Fetch Backlog items (with full pagination)
    try {
      const bInfoRes = await fetch(`${baseUrl}/team/${portalId}/projects/${projId}/?action=getbacklog`, { headers });
      if (bInfoRes.ok) {
        const bInfo = await bInfoRes.json();
        const bId = bInfo.backlogId || bInfo.id || bInfo.backlog_id;
        if (bId) {
          let bIndex = 1;
          let bHasMore = true;
          while (bHasMore && bIndex <= 1000) {
            const bItemsRes = await fetch(
              `${baseUrl}/team/${portalId}/projects/${projId}/sprints/${bId}/item/?action=data&index=${bIndex}&range=100`,
              { headers }
            );
            if (bItemsRes.ok) {
              const bJson = await bItemsRes.json();
              const items = bJson.items || bJson.item_details || bJson.data || [];
              if (items.length === 0) {
                bHasMore = false;
                break;
              }
              processRawItems(items, projName, 'Backlog', rawTickets, todayStr, schema);
              if (items.length < 100) {
                bHasMore = false;
              } else {
                bIndex += 100;
              }
            } else {
              bHasMore = false;
            }
          }
        }
      }
    } catch (e) {
      console.warn(`Backlog fetch failed for ${projName}:`, e);
    }

    // 2. Fetch Sprint items (with full pagination across all sprint items)
    try {
      const sListRes = await fetch(
        `${baseUrl}/team/${portalId}/projects/${projId}/sprints/?action=data&index=1&range=50&type=%5B1%2C2%2C3%5D`,
        { headers }
      );
      if (sListRes.ok) {
        const sJson = await sListRes.json();
        const sprints = sJson.sprints || sJson.sprint_details || sJson.data || [];
        for (const sp of sprints.slice(0, 3)) {
          const sId = sp.id || sp.sprintId;
          const sName = sp.name || sp.sprintName || `Sprint ${sId}`;
          if (sId) {
            let sIndex = 1;
            let sHasMore = true;
            while (sHasMore && sIndex <= 1000) {
              const sItemsRes = await fetch(
                `${baseUrl}/team/${portalId}/projects/${projId}/sprints/${sId}/item/?action=data&index=${sIndex}&range=100`,
                { headers }
              );
              if (sItemsRes.ok) {
                const sItemsJson = await sItemsRes.json();
                const items = sItemsJson.items || sItemsJson.item_details || sItemsJson.data || [];
                if (items.length === 0) {
                  sHasMore = false;
                  break;
                }
                processRawItems(items, projName, sName, rawTickets, todayStr, schema);
                if (items.length < 100) {
                  sHasMore = false;
                } else {
                  sIndex += 100;
                }
              } else {
                sHasMore = false;
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn(`Sprint fetch failed for ${projName}:`, e);
    }

    // 3. Direct Project Item fallback if needed
    if (rawTickets.length === 0) {
      try {
        const directRes = await fetch(
          `${baseUrl}/team/${portalId}/projects/${projId}/item/?action=data&index=1&range=100`,
          { headers }
        );
        if (directRes.ok) {
          const directJson = await directRes.json();
          const items = directJson.items || directJson.item_details || directJson.data || [];
          const enrichedItems = await enrichItemsWithDetails(items, projId, undefined, baseUrl, portalId, headers);
          processRawItems(enrichedItems, projName, 'General', rawTickets, todayStr, schema);
        }
      } catch (e) {}
    }
  }

  // Deduplicate by reference
  const uniqueMap = new Map<string, NormalizedZohoTicket>();
  for (const t of rawTickets) {
    if (!uniqueMap.has(t.reference)) {
      uniqueMap.set(t.reference, t);
    }
  }

  return Array.from(uniqueMap.values());
}

function processRawItems(
  items: any[],
  projectName: string,
  sprintName: string,
  targetList: NormalizedZohoTicket[],
  todayStr: string,
  schema?: ProjectCustomFieldSchema
) {
  if (!Array.isArray(items)) return;

  for (const raw of items) {
    // 1. Reference ID
    let reference = '';
    if (raw.itemNo) {
      reference = `REQ-I${raw.itemNo}`;
    } else {
      const rawId = raw.id || raw.item_id || raw.seq_id || raw.itemId;
      const prefix = raw.prefix || raw.item_prefix || raw.project_prefix || 'REQ';
      const seq = raw.seq_id || raw.seqId || raw.sequence_id;
      reference = prefix && seq ? `${prefix}-${seq}` : rawId ? `REQ-I${rawId}` : '';
    }

    if (!reference) continue;

    // 2. Title
    const title =
      raw.itemName ||
      raw.item_name ||
      raw.summary ||
      raw.name ||
      raw.title ||
      raw.item_summary ||
      `Requirement ${reference}`;

    // 3. Customer
    const customer = extractCustomer(title, raw.customer_name || raw.customerName || raw.client_name);

    // 4. Status
    const rawStatus =
      raw.status_name ||
      raw.statusName ||
      raw.status_details?.status_name ||
      raw.stage_name ||
      raw.statusId ||
      raw.status_id ||
      'In Progress';
    const mappedStatus = mapZohoStatusToRecActs(rawStatus);

    // 5. Priority
    const mappedPriority = mapZohoPriority(raw.priority_name || raw.priorityName || raw.priority);

    // 6. Dates
    // Requirement Start Date: UDF_DATETIME10 is ticket start date, fallback to UDF_DATE4 / createdTime
    const rawReqStartDate =
      raw.UDF_DATETIME10 ||
      raw.UDF_DATE4 ||
      raw.createdTime ||
      raw.created_date;
    const plannedStartDate =
      rawReqStartDate && rawReqStartDate !== '-1'
        ? String(rawReqStartDate).substring(0, 10)
        : todayStr;

    // Requirement End Date: UDF_DATETIME6 is ticket end date, fallback to UDF_DATE3, UDF_DATE5, endDate
    const rawReqEndDate =
      raw.UDF_DATETIME6 ||
      raw.UDF_DATE3 ||
      raw.UDF_DATE5 ||
      raw.endDate ||
      raw.end_date ||
      raw.due_date ||
      raw.dueDate;
    const plannedDueDate =
      rawReqEndDate && rawReqEndDate !== '-1'
        ? String(rawReqEndDate).substring(0, 10)
        : todayStr;

    const actualStartDate = raw.actualStartDate ? String(raw.actualStartDate).substring(0, 10) : plannedStartDate;
    const completedDate = mappedStatus === 'Completed' ? plannedDueDate : null;

    // 7. Estimated hours (default 24h if unspecified)
    const durationHours = Number(raw.durationHours || raw.estimated_hours || raw.points || 24);

    // 8. Custom Layouts and Fields (UDF_*) Resolution
    const resolvedCustomFields: Record<string, NormalizedCustomField> = {};
    for (const [k, val] of Object.entries(raw)) {
      if (
        (k.startsWith('UDF_') || k.toLowerCase().includes('custom')) &&
        val !== '' &&
        val !== '-1' &&
        val !== null &&
        val !== undefined
      ) {
        const def = schema?.fieldDefinitions.get(k);
        const label = def?.fieldName || k;
        const fieldType = def?.fieldTypeName || mapZohoFieldType(0, k);

        let displayValue = String(val);
        if (Array.isArray(val)) {
          displayValue = val
            .map((v) => schema?.optionIdToName.get(String(v)) || String(v))
            .filter(Boolean)
            .join(', ');
        } else if (typeof val === 'string' && schema?.optionIdToName.has(val)) {
          displayValue = schema.optionIdToName.get(val) || val;
        }

        resolvedCustomFields[k] = {
          paramName: k,
          label,
          fieldType,
          rawValue: val,
          displayValue,
          sectionName: def?.sectionName,
        };
      }
    }

    // 9. Assignee name: prefer explicit owner, fallback to Developers custom field
    const developerCustomField = resolvedCustomFields['UDF_MULTIPKL1']?.displayValue;
    const assigneeName =
      raw.assignee_name ||
      raw.assigneeName ||
      raw.owner_name ||
      developerCustomField ||
      raw.itemTypeName ||
      null;

    const points = raw.points !== undefined && raw.points !== null ? Number(raw.points) : 0;

    targetList.push({
      reference,
      title,
      customerName: customer,
      priority: mappedPriority,
      status: mappedStatus,
      rawStatusName: String(rawStatus),
      plannedStartDate,
      plannedDueDate,
      actualStartDate,
      completedDate,
      totalEstimatedHours: Math.max(8, durationHours),
      points,
      description: raw.description || raw.summary || title,
      assigneeName,
      projectName,
      sprintName,
      customFields: Object.keys(resolvedCustomFields).length > 0 ? resolvedCustomFields : undefined,
      rawPayload: {
        ...raw,
        sprintName,
        statusName: rawStatus,
        points,
      },
    });
  }
}

/**
 * Main Sync Engine: Pulls tickets from Zoho Sprints and upserts into RecActs PostgreSQL via Prisma
 */
export async function syncZohoTicketsToRecActs(
  organizationId: string,
  options?: {
    config?: ZohoSprintsConfig;
    selectedProjectIds?: string[];
    actorName?: string;
    actorMembershipId?: string;
  }
): Promise<{
  success: boolean;
  totalSynced: number;
  created: number;
  updated: number;
  tickets: any[];
  error?: string;
}> {
  const actorName = options?.actorName || 'Zoho Sync Engine';
  const actorMembershipId = options?.actorMembershipId || null;

  try {
    const fetched = await fetchAllZohoTickets(options?.config, options?.selectedProjectIds);
    if (!fetched || fetched.length === 0) {
      recordSyncCompletion(0);
      return {
        success: true,
        totalSynced: 0,
        created: 0,
        updated: 0,
        tickets: [],
      };
    }

    // Persist complete raw items payload to JSON store
    try {
      saveRawZohoItems(
        fetched.map((f) => ({
          reference: f.reference,
          rawPayload: f.rawPayload,
          customFields: f.customFields,
        }))
      );
    } catch (e) {
      console.warn('Failed saving raw Zoho payload to store:', e);
    }

    // Fetch all staff members in this organization for automatic assignment matching
    const members = await prisma.organizationMembership.findMany({
      where: { organizationId },
      include: { user: true, team: true },
    });

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { zohoDesignerField: true },
    });
    const designerParam = org?.zohoDesignerField || 'UDF_MULTIPKL10';

    const defaultTeam = await prisma.team.findFirst({
      where: { organizationId, name: 'Requirements' },
    }) || await prisma.team.findFirst({
      where: { organizationId },
    });

    let createdCount = 0;
    let updatedCount = 0;
    const syncedTickets: any[] = [];
    const concurrency = 8;

    for (let i = 0; i < fetched.length; i += concurrency) {
      const chunk = fetched.slice(i, i + concurrency);
      await Promise.all(
        chunk.map(async (item) => {
          let matchedMember = null;
          const ticketDesigner =
            (item.customFields as any)?.[designerParam]?.displayValue ||
            (item.customFields as any)?.UDF_MULTIPKL10?.displayValue ||
            (item.customFields as any)?.UDF_PKL15?.displayValue;

          if (ticketDesigner) {
            const dLower = String(ticketDesigner).toLowerCase().trim();
            matchedMember = members.find((m) => {
              if (m.zohoDesignerName && dLower.includes(m.zohoDesignerName.toLowerCase())) return true;
              const uName = m.user.name.toLowerCase();
              return dLower.includes(uName) || uName.includes(dLower);
            });
          }

          if (!matchedMember && item.assigneeName && item.assigneeName.trim()) {
            const rawLower = item.assigneeName.toLowerCase().trim();
            matchedMember = members.find((m) => {
              if (m.zohoDesignerName && rawLower.includes(m.zohoDesignerName.toLowerCase())) return true;
              const userName = m.user.name.toLowerCase();
              return userName.includes(rawLower) || rawLower.includes(userName) || (m.user.initials && m.user.initials.toLowerCase() === rawLower);
            });
          }

          // Check if ticket already exists in PostgreSQL (match REQ-I*, LA-I*, or LA-*)
          const altRef1 = item.reference.startsWith('REQ-I') ? item.reference.replace('REQ-I', 'LA-I') : item.reference.replace('LA-I', 'REQ-I');
          const altRef2 = item.reference.startsWith('REQ-I') ? item.reference.replace('REQ-I', 'LA-') : item.reference.replace('LA-', 'REQ-I');
          const existing = await prisma.ticket.findFirst({
            where: {
              organizationId,
              OR: [
                { reference: item.reference },
                { reference: altRef1 },
                { reference: altRef2 },
              ],
            },
            include: { assignments: true },
          });

          if (existing) {
            // UPDATE existing ticket
            const updated = await prisma.ticket.update({
              where: { id: existing.id },
              data: {
                reference: item.reference,
                title: item.title,
                customerName: item.customerName,
                priority: item.priority,
                status: item.status,
                plannedStartDate: item.plannedStartDate,
                plannedDueDate: item.plannedDueDate,
                completedDate: item.completedDate,
                description: item.description,
                customFields: (item.customFields as any) || undefined,
                rawPayload: (item.rawPayload as any) || undefined,
              },
            });

            // Sync assignment if member found and not already assigned
            if (matchedMember) {
              await prisma.ticketAssignment.upsert({
                where: {
                  ticketId_membershipId: {
                    ticketId: existing.id,
                    membershipId: matchedMember.id,
                  },
                },
                update: {
                  allocatedHours: item.totalEstimatedHours,
                },
                create: {
                  ticketId: existing.id,
                  membershipId: matchedMember.id,
                  allocatedHours: item.totalEstimatedHours,
                  loggedHours: 0,
                },
              });
            }

            updatedCount++;
            syncedTickets.push(updated);
          } else {
            // CREATE new ticket
            const created = await prisma.ticket.create({
              data: {
                organizationId,
                reference: item.reference,
                title: item.title,
                customerName: item.customerName,
                priority: item.priority,
                status: item.status,
                plannedStartDate: item.plannedStartDate,
                plannedDueDate: item.plannedDueDate,
                actualStartDate: item.actualStartDate,
                completedDate: item.completedDate,
                totalEstimatedHours: item.totalEstimatedHours,
                teamId: defaultTeam?.id || null,
                description: item.description,
                createdByMembershipId: actorMembershipId,
                customFields: (item.customFields as any) || undefined,
                rawPayload: (item.rawPayload as any) || undefined,
              },
            });

            if (matchedMember) {
              await prisma.ticketAssignment.create({
                data: {
                  ticketId: created.id,
                  membershipId: matchedMember.id,
                  allocatedHours: item.totalEstimatedHours,
                  loggedHours: 0,
                },
              });
            }

            createdCount++;
            syncedTickets.push(created);
          }
        })
      );
    }

    // Invalidate bootstrap in-memory cache so frontend sees live data immediately
    invalidateBootstrapCache(organizationId);

    // Audit log
    await logAuditEvent({
      organizationId,
      actorMembershipId: actorMembershipId || undefined,
      actorName,
      module: 'Tickets',
      action: `Synced ${syncedTickets.length} tickets from Zoho Sprints (${createdCount} new, ${updatedCount} updated)`,
    });

    lastSyncMetadata = {
      timestamp: new Date().toISOString(),
      totalSynced: syncedTickets.length,
      created: createdCount,
      updated: updatedCount,
    };

    recordSyncCompletion(syncedTickets.length);

    return {
      success: true,
      totalSynced: syncedTickets.length,
      created: createdCount,
      updated: updatedCount,
      tickets: syncedTickets,
    };
  } catch (err: any) {
    console.error('Error in syncZohoTicketsToRecActs:', err);
    lastSyncMetadata = {
      timestamp: new Date().toISOString(),
      totalSynced: 0,
      created: 0,
      updated: 0,
      error: err?.message || String(err),
    };
    return {
      success: false,
      totalSynced: 0,
      created: 0,
      updated: 0,
      tickets: [],
      error: err?.message || String(err),
    };
  }
}
