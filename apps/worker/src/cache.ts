import { Env } from './types';

interface MemoryCacheEntry {
  value: any;
  expiresAt: number;
}

const localCache = new Map<string, MemoryCacheEntry>();

export class CacheService {
  constructor(private env: Env) {}

  async get<T>(key: string): Promise<T | null> {
    const now = Date.now();
    // 1. Check local isolate memory first
    const entry = localCache.get(key);
    if (entry && entry.expiresAt > now) {
      return entry.value as T;
    } else if (entry) {
      localCache.delete(key);
    }

    // 2. Fall back to Cloudflare KV if available
    if (this.env.SETTINGS_KV) {
      try {
        const val = await this.env.SETTINGS_KV.get(key, 'json');
        if (val !== null) {
          // Repopulate local memory cache for subsequent requests
          localCache.set(key, { value: val, expiresAt: now + 30000 });
          return val as T;
        }
      } catch (err) {
        console.error('KV get error:', err);
      }
    }

    return null;
  }

  async set<T>(key: string, value: T, ttlSeconds = 60): Promise<void> {
    const now = Date.now();
    localCache.set(key, {
      value,
      expiresAt: now + ttlSeconds * 1000,
    });

    if (this.env.SETTINGS_KV) {
      try {
        await this.env.SETTINGS_KV.put(key, JSON.stringify(value), {
          expirationTtl: Math.max(60, ttlSeconds),
        });
      } catch (err) {
        console.error('KV put error:', err);
      }
    }
  }

  async delete(key: string): Promise<void> {
    localCache.delete(key);
    if (this.env.SETTINGS_KV) {
      try {
        await this.env.SETTINGS_KV.delete(key);
      } catch (err) {
        console.error('KV delete error:', err);
      }
    }
  }
}
