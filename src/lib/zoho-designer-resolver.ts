/**
 * Zoho Sprints Designer & Multi-Picklist Custom Field Resolver
 * Handles mapping Zoho option IDs (single, comma-separated, or array) to human-readable names.
 */

export const KNOWN_ZOHO_DESIGNERS: Record<string, string> = {
  '101301000007403154': 'Karuppaiah S',
  '101301000007403153': 'Hemanth Akassh B',
  '101301000004576327': 'Yogesh R',
  '101301000007403152': 'Srinath P',
  '101301000004576329': 'Saravanapriya M',
  '101301000004576331': 'Sarath Kumar',
  '101301000004953269': 'Dharshana T',
  '101301000004576333': 'Dinesh Yadav',
  '101301000005027815': 'Madhan R',
};

/**
 * Resolves a raw designer or multi-picklist field value (which could be an ID,
 * comma-separated IDs, an array of IDs/names, or already names) into human-readable names.
 *
 * Examples:
 * - "101301000004576327,101301000004953269" -> "Yogesh R, Dharshana T"
 * - "101301000004953269,101301000007403154" -> "Dharshana T, Karuppaiah S"
 * - "101301000004576327" -> "Yogesh R"
 * - ["101301000004576327", "101301000004953269"] -> "Yogesh R, Dharshana T"
 * - "Dinesh Yadav" -> "Dinesh Yadav"
 */
export function resolveZohoDesignerValue(
  val: any,
  additionalMap?: Map<string, string> | Record<string, string>
): string {
  if (val === null || val === undefined || val === '') return '';

  const resolveToken = (rawToken: any): string => {
    if (rawToken === null || rawToken === undefined) return '';
    const token = String(rawToken).trim();
    if (!token) return '';

    // Check additionalMap first if provided
    if (additionalMap) {
      if (additionalMap instanceof Map && additionalMap.has(token)) {
        return additionalMap.get(token) || token;
      }
      if (typeof additionalMap === 'object' && !(additionalMap instanceof Map) && additionalMap[token]) {
        return additionalMap[token];
      }
    }

    // Check KNOWN_ZOHO_DESIGNERS
    if (KNOWN_ZOHO_DESIGNERS[token]) {
      return KNOWN_ZOHO_DESIGNERS[token];
    }

    return token;
  };

  if (Array.isArray(val)) {
    const list: string[] = [];
    for (const item of val) {
      if (typeof item === 'string' && item.includes(',')) {
        item.split(',').forEach((sub) => {
          const res = resolveToken(sub);
          if (res) list.push(res);
        });
      } else {
        const res = resolveToken(item);
        if (res) list.push(res);
      }
    }
    return Array.from(new Set(list)).join(', ');
  }

  if (typeof val === 'string') {
    if (val.includes(',')) {
      const list = val
        .split(',')
        .map((s) => resolveToken(s))
        .filter(Boolean);
      return Array.from(new Set(list)).join(', ');
    }
    return resolveToken(val);
  }

  return resolveToken(String(val));
}

/**
 * Extracts distinct individual designer names from a designer field string or array,
 * resolving any Zoho IDs to names and splitting comma-separated entries.
 */
export function extractIndividualDesigners(
  val: any,
  additionalMap?: Map<string, string> | Record<string, string>
): string[] {
  if (!val) return [];
  const resolved = resolveZohoDesignerValue(val, additionalMap);
  if (!resolved) return [];
  return Array.from(
    new Set(
      resolved
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s && s.toLowerCase() !== 'unassigned')
    )
  );
}

/**
 * Resolves the accurate ticket reference ID.
 * Corrects wrong 'REQ-I' prefixes when the ticket's title or Zoho payload
 * specifies the true prefix (e.g. 'LA-I7428' or 'MOF-I7236' or 'LA-I7293').
 */
export function resolveTicketReference(
  rawRef: string | null | undefined,
  title?: string | null,
  itemNo?: string | number | null
): string {
  const cleanTitle = (title || '').trim();
  const numStr = itemNo ? String(itemNo).trim() : (rawRef ? String(rawRef).replace(/^[A-Z]+-I?/i, '') : '');

  // 1. If title contains the exact ID with number (e.g. 'LA-I7428' or 'MOF-I7236' or 'REQ-I2259')
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

  if (rawRef) return rawRef;
  if (numStr) return `LA-I${numStr}`;
  return 'LA-I3001';
}
