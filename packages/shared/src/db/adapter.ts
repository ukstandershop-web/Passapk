/**
 * ============================================================================
 * PaisaBridge PK — Custom Proxy Database Adapter
 * ============================================================================
 * ONE shared module: the ONLY code that talks to the database.
 * Usable from both Vercel (Node) and Cloudflare Worker (fetch only, zero Node APIs).
 *
 * Known Proxy Specification:
 * - URL: POST {PROXY_BASE_URL} (e.g. https://supabase.thecampfirevibe.workers.dev/api/proxy)
 * - Headers:
 *     Authorization: Bearer {PROXY_MASTER_KEY}
 *     x-project-name: {PROXY_PROJECT_NAME} (default: "all")
 *     Content-Type: application/json
 * - Read a table: {"action":"query","path":"<table_name>"}
 */

// ============================================================================
// PROXY ACTION CONFIGURATION (EDIT PLACEHOLDERS HERE)
// ============================================================================
// The query action is confirmed ("query"). The insert, update, delete, rpc, and
// batch action names and body payload structures below can be adjusted here in
// this single configuration object if your proxy requires different keys.
export const PROXY_CONFIG = {
  actions: {
    query: 'query', // Confirmed format: {"action":"query","path":"<table_name>"}
    insert: 'insert', // Placeholder: adjust action string if proxy expects different name
    update: 'update', // Placeholder: adjust action string if proxy expects different name
    delete: 'delete', // Placeholder: adjust action string if proxy expects different name
    rpc: 'rpc', // Placeholder: adjust action string if proxy expects different name
    batch: 'batch', // Placeholder: adjust action string if proxy expects different name
  },
  fields: {
    data: 'data', // Field containing record(s) to insert
    match: 'match', // Field containing filter criteria to match for update/delete
    args: 'args', // Field containing parameters for RPC functions
    columns: 'columns', // Columns to select
    filters: 'filters', // Where conditions
    order: 'order', // Ordering specification
    limit: 'limit', // Max rows to return
    offset: 'offset', // Rows to skip
  },
} as const;

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'like' | 'ilike';

export interface FilterCondition {
  column: string;
  operator: FilterOperator;
  value: string | number | boolean | null | Array<string | number>;
}

export type MatchFilters = Record<string, string | number | boolean | null | Array<string | number>> | FilterCondition[];

export interface QueryOptions {
  columns?: string | string[];
  filters?: MatchFilters;
  order?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
  [key: string]: any;
}

export interface InsertOptions {
  returning?: boolean;
  signal?: AbortSignal;
}

export interface UpdateOptions {
  returning?: boolean;
  signal?: AbortSignal;
}

export interface DeleteOptions {
  signal?: AbortSignal;
}

export interface RpcOptions {
  signal?: AbortSignal;
}

export interface BatchQueryItem {
  table: string;
  options?: QueryOptions;
}

export interface ProxyServiceBinding {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

export interface DbAdapterConfig {
  baseUrl: string;
  masterKey: string;
  projectName?: string;
  proxyService?: ProxyServiceBinding;
  onRequestCount?: (metric: string, count: number) => void;
  fetchFn?: typeof fetch;
}

// ============================================================================
// TYPED ERROR
// ============================================================================

export class DatabaseProxyError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly details?: unknown;
  public readonly isRetryable: boolean;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'DatabaseProxyError';
    this.status = status;
    this.code = code;
    this.details = details;
    // Network failures or HTTP 5xx errors are retryable
    this.isRetryable = status === 0 || status >= 500;
  }
}

// ============================================================================
// DB ADAPTER CLASS
// ============================================================================

export class DatabaseAdapter {
  private baseUrl: string;
  private masterKey: string;
  private projectName: string;
  private proxyService?: ProxyServiceBinding;
  private onRequestCount?: (metric: string, count: number) => void;
  private fetchFn: typeof fetch;

  constructor(config: DbAdapterConfig) {
    this.baseUrl = config.baseUrl;
    this.masterKey = config.masterKey;
    this.projectName = config.projectName || 'all';
    this.proxyService = config.proxyService;
    this.onRequestCount = config.onRequestCount;
    this.fetchFn = config.fetchFn || fetch;
  }

  /**
   * Internal HTTP dispatcher with 8s timeout, 2 retries on 5xx/network errors, and exponential jitter
   */
  private async executeProxyRequest<T>(payload: Record<string, unknown>, userSignal?: AbortSignal): Promise<T> {
    const maxRetries = 2;
    const timeoutMs = 8000;
    let lastError: DatabaseProxyError | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      // Link user-provided AbortSignal if present
      if (userSignal) {
        if (userSignal.aborted) {
          clearTimeout(timeoutId);
          throw new DatabaseProxyError('Request aborted by user signal', 0, 'ABORTED');
        }
        userSignal.addEventListener('abort', () => controller.abort(), { once: true });
      }

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.masterKey}`,
          'x-project-name': this.projectName,
        };

        const bodyStr = JSON.stringify(payload);
        let response: Response;

        // Hook for monitoring/usage counters
        if (this.onRequestCount) {
          this.onRequestCount('db_proxy_request', 1);
        }

        // Support Cloudflare Service Binding if available
        if (this.proxyService) {
          response = await this.proxyService.fetch(this.baseUrl, {
            method: 'POST',
            headers,
            body: bodyStr,
            signal: controller.signal,
          });
        } else {
          response = await this.fetchFn(this.baseUrl, {
            method: 'POST',
            headers,
            body: bodyStr,
            signal: controller.signal,
          });
        }

        clearTimeout(timeoutId);

        if (!response.ok) {
          let errJson: any;
          try {
            errJson = await response.json();
          } catch {
            errJson = { message: await response.text() };
          }
          throw new DatabaseProxyError(
            errJson?.message || errJson?.error || `Proxy error: ${response.statusText}`,
            response.status,
            errJson?.code,
            errJson?.details
          );
        }

        const data = await response.json();
        return data as T;
      } catch (err: any) {
        clearTimeout(timeoutId);

        let proxyErr: DatabaseProxyError;
        if (err instanceof DatabaseProxyError) {
          proxyErr = err;
        } else if (err.name === 'AbortError') {
          proxyErr = new DatabaseProxyError('Database proxy request timed out (8s limit)', 0, 'TIMEOUT');
        } else {
          proxyErr = new DatabaseProxyError(err.message || 'Database proxy network failure', 0, 'NETWORK_ERROR');
        }

        lastError = proxyErr;

        // If not retryable or max attempts exhausted, throw immediately
        if (!proxyErr.isRetryable || attempt === maxRetries) {
          throw proxyErr;
        }

        // Exponential backoff with random jitter: (100ms * 2^attempt) + random(0..100ms)
        const delay = Math.pow(2, attempt) * 100 + Math.floor(Math.random() * 100);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError || new DatabaseProxyError('Unknown database error', 500);
  }

  /**
   * Helper to normalize filter format for proxy requests
   */
  private normalizeFilters(filters?: MatchFilters): Record<string, unknown> | FilterCondition[] | undefined {
    if (!filters) return undefined;
    return filters;
  }

  // ==========================================================================
  // PUBLIC DATABASE METHODS
  // ==========================================================================

  /**
   * Read multiple rows from a table
   * Payload: {"action": "query", "path": table, ...}
   */
  async select<T = Record<string, unknown>>(table: string, options: QueryOptions = {}): Promise<T[]> {
    const payload: Record<string, unknown> = {
      action: PROXY_CONFIG.actions.query,
      path: table,
    };

    if (options.columns) {
      payload[PROXY_CONFIG.fields.columns] = Array.isArray(options.columns)
        ? options.columns.join(',')
        : options.columns;
    }
    const effectiveFilters = options.filters || Object.fromEntries(
      Object.entries(options).filter(([k]) => !['columns', 'order', 'limit', 'offset', 'signal', 'filters'].includes(k))
    );
    if (Object.keys(effectiveFilters).length > 0) {
      payload[PROXY_CONFIG.fields.filters] = this.normalizeFilters(effectiveFilters);
    }
    if (options.order) {
      payload[PROXY_CONFIG.fields.order] = options.order;
    }
    if (options.limit !== undefined) {
      payload[PROXY_CONFIG.fields.limit] = options.limit;
    }
    if (options.offset !== undefined) {
      payload[PROXY_CONFIG.fields.offset] = options.offset;
    }

    const res = await this.executeProxyRequest<any>(payload, options.signal);
    if (Array.isArray(res)) return res as T[];
    if (res && Array.isArray(res.data)) return res.data as T[];
    if (res && res.rows && Array.isArray(res.rows)) return res.rows as T[];
    return [];
  }

  /**
   * Read a single row (or null if not found)
   */
  async selectOne<T = Record<string, unknown>>(table: string, options: QueryOptions = {}): Promise<T | null> {
    const rows = await this.select<T>(table, { ...options, limit: 1 });
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Count rows matching optional filters
   */
  async count(table: string, filters?: MatchFilters, options: { signal?: AbortSignal } = {}): Promise<number> {
    const payload: Record<string, unknown> = {
      action: PROXY_CONFIG.actions.query,
      path: table,
      count: 'exact',
    };
    if (filters) {
      payload[PROXY_CONFIG.fields.filters] = this.normalizeFilters(filters);
    }

    const res = await this.executeProxyRequest<any>(payload, options.signal);
    if (typeof res === 'number') return res;
    if (res && typeof res.count === 'number') return res.count;
    if (Array.isArray(res)) return res.length;
    return 0;
  }

  /**
   * Insert one or multiple rows into a table
   * Payload: {"action": CONFIG.actions.insert, "path": table, "data": row}
   */
  async insert<T = Record<string, unknown>>(
    table: string,
    data: Record<string, unknown> | Record<string, unknown>[],
    options: InsertOptions = {}
  ): Promise<T> {
    const payload: Record<string, unknown> = {
      action: PROXY_CONFIG.actions.insert,
      path: table,
      [PROXY_CONFIG.fields.data]: data,
    };
    if (options.returning !== false) {
      payload.returning = true;
    }

    const res = await this.executeProxyRequest<any>(payload, options.signal);
    if (res && res.data) return res.data as T;
    return res as T;
  }

  /**
   * Update rows matching filters
   * Payload: {"action": CONFIG.actions.update, "path": table, "match": filters, "data": patch}
   */
  async update<T = Record<string, unknown>>(
    table: string,
    match: MatchFilters,
    patch: Record<string, unknown>,
    options: UpdateOptions = {}
  ): Promise<T> {
    const payload: Record<string, unknown> = {
      action: PROXY_CONFIG.actions.update,
      path: table,
      [PROXY_CONFIG.fields.match]: this.normalizeFilters(match),
      [PROXY_CONFIG.fields.data]: patch,
    };
    if (options.returning !== false) {
      payload.returning = true;
    }

    const res = await this.executeProxyRequest<any>(payload, options.signal);
    if (res && res.data) return res.data as T;
    return res as T;
  }

  /**
   * Delete rows matching filters
   * Payload: {"action": CONFIG.actions.delete, "path": table, "match": filters}
   */
  async delete<T = Record<string, unknown>>(
    table: string,
    match: MatchFilters,
    options: DeleteOptions = {}
  ): Promise<T> {
    const payload: Record<string, unknown> = {
      action: PROXY_CONFIG.actions.delete,
      path: table,
      [PROXY_CONFIG.fields.match]: this.normalizeFilters(match),
    };

    const res = await this.executeProxyRequest<any>(payload, options.signal);
    return res as T;
  }

  /**
   * Invoke a database RPC / SQL stored function
   * Payload: {"action": CONFIG.actions.rpc, "path": fnName, "args": args}
   */
  async rpc<T = unknown>(fnName: string, args: Record<string, unknown> = {}, options: RpcOptions = {}): Promise<T> {
    const payload: Record<string, unknown> = {
      action: PROXY_CONFIG.actions.rpc,
      path: fnName,
      [PROXY_CONFIG.fields.args]: args,
    };

    const res = await this.executeProxyRequest<any>(payload, options.signal);
    if (res && res.data !== undefined) return res.data as T;
    return res as T;
  }

  /**
   * Batch multiple queries into a single proxy round-trip if supported
   */
  async batch(queries: BatchQueryItem[], options: { signal?: AbortSignal } = {}): Promise<any[]> {
    const payload: Record<string, unknown> = {
      action: PROXY_CONFIG.actions.batch,
      queries: queries.map((q) => ({
        path: q.table,
        ...q.options,
      })),
    };

    return this.executeProxyRequest<any[]>(payload, options.signal);
  }

  /**
   * Health check method: verifies connectivity and response time
   */
  async checkHealth(): Promise<{ status: 'ok' | 'degraded' | 'down'; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      // Query system_settings or count merchants to test connectivity
      await this.select('system_settings', { limit: 1 });
      return {
        status: 'ok',
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        error: err.message,
      };
    }
  }
}

/**
 * Factory function to create DatabaseAdapter instance
 */
export function createDbAdapter(config: DbAdapterConfig): DatabaseAdapter {
  return new DatabaseAdapter(config);
}
