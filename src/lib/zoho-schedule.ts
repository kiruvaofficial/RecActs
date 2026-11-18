import fs from 'fs';
import path from 'path';

export interface ZohoScheduleConfig {
  autoSyncEnabled: boolean;
  intervalMinutes: number; // e.g. 15, 30, 60, 120, 360, 720, 1440
  lastSyncTime: string | null;
  nextSyncTime: string | null;
  lastSyncStatus: string | null;
  lastSyncedCount: number;
}

const SCHEDULE_FILE_PATH = path.resolve(process.cwd(), '.zoho-sync-schedule.json');

const DEFAULT_SCHEDULE: ZohoScheduleConfig = {
  autoSyncEnabled: true,
  intervalMinutes: 30, // 30 minutes default
  lastSyncTime: null,
  nextSyncTime: null,
  lastSyncStatus: null,
  lastSyncedCount: 0,
};

export function getZohoScheduleConfig(): ZohoScheduleConfig {
  try {
    if (fs.existsSync(SCHEDULE_FILE_PATH)) {
      const data = fs.readFileSync(SCHEDULE_FILE_PATH, 'utf8');
      const parsed = JSON.parse(data);
      return {
        ...DEFAULT_SCHEDULE,
        ...parsed,
      };
    }
  } catch (e) {
    console.warn('Could not read .zoho-sync-schedule.json:', e);
  }
  return DEFAULT_SCHEDULE;
}

export function saveZohoScheduleConfig(config: Partial<ZohoScheduleConfig>): ZohoScheduleConfig {
  try {
    const current = getZohoScheduleConfig();
    const interval = Number(config.intervalMinutes) || current.intervalMinutes || 30;
    const enabled = typeof config.autoSyncEnabled === 'boolean' ? config.autoSyncEnabled : current.autoSyncEnabled;

    const nextSyncTime = enabled
      ? new Date(Date.now() + interval * 60 * 1000).toISOString()
      : null;

    const updated: ZohoScheduleConfig = {
      ...current,
      ...config,
      intervalMinutes: interval,
      autoSyncEnabled: enabled,
      nextSyncTime: config.nextSyncTime !== undefined ? config.nextSyncTime : nextSyncTime,
    };

    fs.writeFileSync(SCHEDULE_FILE_PATH, JSON.stringify(updated, null, 2), 'utf8');
    return updated;
  } catch (e) {
    console.error('Failed saving Zoho schedule config:', e);
    return DEFAULT_SCHEDULE;
  }
}

export function recordSyncCompletion(totalSynced: number, error?: string): ZohoScheduleConfig {
  const current = getZohoScheduleConfig();
  const now = new Date();
  const next = current.autoSyncEnabled
    ? new Date(now.getTime() + current.intervalMinutes * 60 * 1000).toISOString()
    : null;

  return saveZohoScheduleConfig({
    lastSyncTime: now.toISOString(),
    nextSyncTime: next,
    lastSyncStatus: error ? `Error: ${error}` : 'Success',
    lastSyncedCount: totalSynced,
  });
}
