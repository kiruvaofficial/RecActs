import fs from 'fs';
import path from 'path';

export interface ZohoFieldMetadata {
  fieldName: string;
  dataType: string;
  sampleValue: any;
  presentCount: number;
  totalItems: number;
  isMappedToCoreDb: boolean;
  mappedColumn?: string;
  description?: string;
  isCustomField?: boolean;
}

export interface ZohoCustomFieldDefinition {
  paramName: string;
  fieldName: string;
  fieldType: number;
  fieldTypeName: string;
  projectId?: string;
  projectName?: string;
  sectionName?: string;
  isMandatory?: boolean;
  tooltip?: string;
  options?: Array<{ id: string; name: string }>;
  sampleValue?: any;
  presentCount?: number;
}

const RAW_STORE_PATH = path.resolve(process.cwd(), '.zoho-raw-items.json');
const SCHEMA_STORE_PATH = path.resolve(process.cwd(), '.zoho-custom-fields-schema.json');

// Core RecActs DB column mappings
const KNOWN_MAPPINGS: Record<string, string> = {
  itemNo: 'reference (REQ-I{itemNo})',
  id: 'reference / zohoId',
  itemName: 'title',
  item_name: 'title',
  summary: 'title / description',
  description: 'description',
  status_name: 'status (To Do / In Progress / Under Review / Completed)',
  statusName: 'status',
  priority_name: 'priority (Low / Medium / High / Critical)',
  priority: 'priority',
  created_time: 'plannedStartDate',
  end_date: 'plannedDueDate',
  start_date: 'actualStartDate',
  completed_time: 'completedDate',
  duration: 'totalEstimatedHours',
  owner_name: 'assignee (matched to Staff Membership)',
  assignee_name: 'assignee (matched to Staff Membership)',
  itemTypeName: 'assignee / item category',
};

export function saveRawZohoItems(items: Array<{ reference: string; rawPayload: any; customFields?: any }>) {
  try {
    let existingMap: Record<string, any> = {};
    if (fs.existsSync(RAW_STORE_PATH)) {
      try {
        existingMap = JSON.parse(fs.readFileSync(RAW_STORE_PATH, 'utf8'));
      } catch {}
    }

    for (const item of items) {
      if (item.reference && item.rawPayload) {
        existingMap[item.reference] = {
          ...item.rawPayload,
          ...(item.customFields ? { _customFields: item.customFields } : {}),
          _syncedAt: new Date().toISOString(),
        };
      }
    }

    fs.writeFileSync(RAW_STORE_PATH, JSON.stringify(existingMap, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed saving raw Zoho items payload:', e);
  }
}

export function saveDiscoveredCustomFields(definitions: ZohoCustomFieldDefinition[]) {
  try {
    let existing: ZohoCustomFieldDefinition[] = [];
    if (fs.existsSync(SCHEMA_STORE_PATH)) {
      try {
        existing = JSON.parse(fs.readFileSync(SCHEMA_STORE_PATH, 'utf8'));
      } catch {}
    }

    const map = new Map<string, ZohoCustomFieldDefinition>();
    existing.forEach((d) => map.set(d.paramName, d));
    definitions.forEach((d) => map.set(d.paramName, { ...(map.get(d.paramName) || {}), ...d }));

    fs.writeFileSync(SCHEMA_STORE_PATH, JSON.stringify(Array.from(map.values()), null, 2), 'utf8');
  } catch (e) {
    console.error('Failed saving custom fields schema:', e);
  }
}

export function getDiscoveredCustomFields(): ZohoCustomFieldDefinition[] {
  try {
    if (fs.existsSync(SCHEMA_STORE_PATH)) {
      return JSON.parse(fs.readFileSync(SCHEMA_STORE_PATH, 'utf8'));
    }
  } catch (e) {
    console.warn('Could not read .zoho-custom-fields-schema.json:', e);
  }
  return [];
}

export function getAllRawZohoItems(): Record<string, any> {
  try {
    if (fs.existsSync(RAW_STORE_PATH)) {
      return JSON.parse(fs.readFileSync(RAW_STORE_PATH, 'utf8'));
    }
  } catch (e) {
    console.warn('Could not read .zoho-raw-items.json:', e);
  }
  return {};
}

export function getDiscoveredZohoFields(): ZohoFieldMetadata[] {
  const store = getAllRawZohoItems();
  const references = Object.keys(store);
  if (references.length === 0) return [];

  const fieldStats = new Map<string, { count: number; types: Set<string>; sample: any }>();

  for (const ref of references) {
    const raw = store[ref];
    if (!raw || typeof raw !== 'object') continue;

    for (const [key, val] of Object.entries(raw)) {
      if (key === '_syncedAt' || key === '_customFields') continue;
      const t = val === null ? 'null' : Array.isArray(val) ? 'array' : typeof val;
      const stat = fieldStats.get(key) || { count: 0, types: new Set<string>(), sample: null };
      stat.count++;
      stat.types.add(t);
      if (stat.sample === null && val !== null && val !== undefined && val !== '' && val !== '-1') {
        stat.sample = val;
      }
      fieldStats.set(key, stat);
    }
  }

  const results: ZohoFieldMetadata[] = [];
  Array.from(fieldStats.entries()).forEach(([field, stat]) => {
    const mapped = KNOWN_MAPPINGS[field];
    const isUdf = field.startsWith('UDF_') || field.toLowerCase().includes('custom');
    results.push({
      fieldName: field,
      dataType: Array.from(stat.types).filter((t) => t !== 'null').join(' | ') || 'string',
      sampleValue: typeof stat.sample === 'object' ? JSON.stringify(stat.sample).substring(0, 80) : String(stat.sample ?? 'null'),
      presentCount: stat.count,
      totalItems: references.length,
      isMappedToCoreDb: Boolean(mapped) || isUdf,
      mappedColumn: mapped || (isUdf ? 'customFields (JSON)' : undefined),
      isCustomField: isUdf,
    });
  });

  // Sort: mapped fields and custom fields first, then by frequency descending
  return results.sort((a, b) => {
    if (a.isMappedToCoreDb && !b.isMappedToCoreDb) return -1;
    if (!a.isMappedToCoreDb && b.isMappedToCoreDb) return 1;
    return b.presentCount - a.presentCount;
  });
}
