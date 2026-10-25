import { DatabaseAdapter, createDbAdapter } from '@paisabridge/shared';
import { Env } from './types';

/**
 * Returns a configured DatabaseAdapter instance for the Worker environment.
 * If env.PROXY_SERVICE is bound, it uses direct Cloudflare service binding.
 */
export function getDb(env: Env): DatabaseAdapter {
  return createDbAdapter({
    baseUrl: env.PROXY_BASE_URL,
    masterKey: env.PROXY_MASTER_KEY,
    projectName: env.PROXY_PROJECT_NAME || 'all',
    proxyService: env.PROXY_SERVICE,
  });
}
