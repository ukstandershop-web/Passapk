import { createDbAdapter, DatabaseAdapter } from '@paisabridge/shared';

let dbInstance: DatabaseAdapter | null = null;

export function getDb(): DatabaseAdapter {
  if (dbInstance) return dbInstance;

  const baseUrl =
    process.env.PROXY_BASE_URL || 'https://supabase.thecampfirevibe.workers.dev/api/proxy';
  const masterKey = process.env.PROXY_MASTER_KEY || '';
  const projectName = process.env.PROXY_PROJECT_NAME || 'all';

  dbInstance = createDbAdapter({
    baseUrl,
    masterKey,
    projectName,
  });

  return dbInstance;
}
