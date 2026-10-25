/**
 * Lightweight PostgREST HTTP Fetch Client
 * Designed for Cloudflare Workers & Vercel serverless with zero SDK bloat.
 * Directly communicates with Supabase/PostgREST REST endpoints.
 */

export interface PostgrestClientConfig {
  baseUrl: string;
  masterKey: string;
  schema?: string;
  fetchFn?: typeof fetch;
}

export interface PostgrestResponse<T> {
  data: T | null;
  error: { message: string; details?: string; code?: string; status: number } | null;
  count?: number | null;
}

export class PostgrestQueryBuilder<T = Record<string, unknown>> {
  private url: URL;
  private headers: Record<string, string>;
  private method: string = 'GET';
  private body?: string;
  private isSingle = false;
  private fetchFn: typeof fetch;

  constructor(
    private table: string,
    private config: PostgrestClientConfig
  ) {
    // Normalize baseUrl: remove trailing slash, ensure /rest/v1
    let base = config.baseUrl.replace(/\/+$/, '');
    if (!base.endsWith('/rest/v1')) {
      base = `${base}/rest/v1`;
    }
    this.url = new URL(`${base}/${this.table}`);
    this.fetchFn = config.fetchFn || fetch;
    this.headers = {
      apikey: config.masterKey,
      Authorization: `Bearer ${config.masterKey}`,
      'Content-Type': 'application/json',
    };
    if (config.schema) {
      this.headers['Accept-Profile'] = config.schema;
      this.headers['Content-Profile'] = config.schema;
    }
  }

  select(columns: string = '*'): this {
    this.method = 'GET';
    this.url.searchParams.set('select', columns);
    return this;
  }

  eq(column: string, value: string | number | boolean): this {
    this.url.searchParams.set(column, `eq.${value}`);
    return this;
  }

  neq(column: string, value: string | number | boolean): this {
    this.url.searchParams.set(column, `neq.${value}`);
    return this;
  }

  gt(column: string, value: string | number): this {
    this.url.searchParams.set(column, `gt.${value}`);
    return this;
  }

  gte(column: string, value: string | number): this {
    this.url.searchParams.set(column, `gte.${value}`);
    return this;
  }

  lt(column: string, value: string | number): this {
    this.url.searchParams.set(column, `lt.${value}`);
    return this;
  }

  lte(column: string, value: string | number): this {
    this.url.searchParams.set(column, `lte.${value}`);
    return this;
  }

  in(column: string, values: (string | number)[]): this {
    this.url.searchParams.set(column, `in.(${values.join(',')})`);
    return this;
  }

  order(column: string, { ascending = true }: { ascending?: boolean } = {}): this {
    this.url.searchParams.set('order', `${column}.${ascending ? 'asc' : 'desc'}`);
    return this;
  }

  limit(count: number): this {
    this.url.searchParams.set('limit', count.toString());
    return this;
  }

  single(): this {
    this.isSingle = true;
    this.headers['Accept'] = 'application/vnd.pgrst.object+json';
    return this;
  }

  insert(data: Record<string, unknown> | Record<string, unknown>[]): this {
    this.method = 'POST';
    this.headers['Prefer'] = 'return=representation';
    this.body = JSON.stringify(data);
    return this;
  }

  update(data: Record<string, unknown>): this {
    this.method = 'PATCH';
    this.headers['Prefer'] = 'return=representation';
    this.body = JSON.stringify(data);
    return this;
  }

  delete(): this {
    this.method = 'DELETE';
    this.headers['Prefer'] = 'return=representation';
    return this;
  }

  async execute(): Promise<PostgrestResponse<T>> {
    try {
      const response = await this.fetchFn(this.url.toString(), {
        method: this.method,
        headers: this.headers,
        body: this.body,
      });

      if (!response.ok) {
        let errBody: any;
        try {
          errBody = await response.json();
        } catch {
          errBody = { message: await response.text() };
        }
        return {
          data: null,
          error: {
            message: errBody?.message || response.statusText,
            details: errBody?.details || errBody?.hint,
            code: errBody?.code,
            status: response.status,
          },
        };
      }

      // Check if 204 No Content
      if (response.status === 204) {
        return { data: null, error: null };
      }

      const json = await response.json();
      return { data: json as T, error: null };
    } catch (err: any) {
      return {
        data: null,
        error: {
          message: err?.message || 'Network request failed',
          status: 500,
        },
      };
    }
  }
}

export class PostgrestRpcBuilder<T = unknown> {
  private url: URL;
  private headers: Record<string, string>;
  private fetchFn: typeof fetch;

  constructor(
    private fnName: string,
    private params: Record<string, unknown>,
    private config: PostgrestClientConfig
  ) {
    let base = config.baseUrl.replace(/\/+$/, '');
    if (!base.endsWith('/rest/v1')) {
      base = `${base}/rest/v1`;
    }
    this.url = new URL(`${base}/rpc/${this.fnName}`);
    this.fetchFn = config.fetchFn || fetch;
    this.headers = {
      apikey: config.masterKey,
      Authorization: `Bearer ${config.masterKey}`,
      'Content-Type': 'application/json',
    };
  }

  async execute(): Promise<PostgrestResponse<T>> {
    try {
      const response = await this.fetchFn(this.url.toString(), {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(this.params),
      });

      if (!response.ok) {
        let errBody: any;
        try {
          errBody = await response.json();
        } catch {
          errBody = { message: await response.text() };
        }
        return {
          data: null,
          error: {
            message: errBody?.message || response.statusText,
            details: errBody?.details,
            code: errBody?.code,
            status: response.status,
          },
        };
      }

      if (response.status === 204) {
        return { data: null, error: null };
      }

      const json = await response.json();
      return { data: json as T, error: null };
    } catch (err: any) {
      return {
        data: null,
        error: {
          message: err?.message || 'RPC invocation failed',
          status: 500,
        },
      };
    }
  }
}

export class PostgrestDb {
  constructor(private config: PostgrestClientConfig) {}

  from<T = Record<string, unknown>>(table: string): PostgrestQueryBuilder<T> {
    return new PostgrestQueryBuilder<T>(table, this.config);
  }

  rpc<T = unknown>(fnName: string, params: Record<string, unknown> = {}): PostgrestRpcBuilder<T> {
    return new PostgrestRpcBuilder<T>(fnName, params, this.config);
  }
}

export function createPostgrestClient(config: PostgrestClientConfig): PostgrestDb {
  return new PostgrestDb(config);
}
