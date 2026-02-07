import { describe, it, expect, beforeEach } from 'vitest';
import { TIER_LIMITS } from '@mockd/shared/constants';
import { EndpointDO } from '../EndpointDO';

// --- Mocks for Cloudflare Durable Object internals ---

function createMockSqlStorage() {
  const endpoints: Record<string, unknown>[] = [];

  return {
    exec: (query: string, ..._params: unknown[]) => {
      const q = query.toLowerCase().trim();

      // Schema init queries are no-ops
      if (q.startsWith('pragma') || q.startsWith('create') || q.startsWith('alter') || q.startsWith('drop')) {
        return { toArray: () => [] };
      }

      // SELECT endpoints
      if (q.includes('select * from endpoints')) {
        return { toArray: () => [...endpoints] };
      }

      // INSERT endpoint
      if (q.includes('insert into endpoints')) {
        return { toArray: () => [] };
      }

      // SELECT mock_rules
      if (q.includes('select * from mock_rules')) {
        return { toArray: () => [] };
      }

      // INSERT request_logs
      if (q.includes('insert into request_logs')) {
        return { toArray: () => [] };
      }

      return { toArray: () => [] };
    },

    // Expose for test setup
    _addEndpoint(endpoint: Record<string, unknown>) {
      endpoints.push(endpoint);
    },
  };
}

function createMockState() {
  const kvStore = new Map<string, unknown>();
  const sql = createMockSqlStorage();

  const storage = {
    get: async <T = unknown>(key: string): Promise<T | undefined> => {
      return kvStore.get(key) as T | undefined;
    },
    put: async (key: string, value: unknown): Promise<void> => {
      kvStore.set(key, value);
    },
    sql,
  };

  return {
    storage,
    acceptWebSocket: () => {},
    getWebSockets: () => [],
    _kvStore: kvStore,
    _sql: sql,
  };
}

function createDO(state?: ReturnType<typeof createMockState>) {
  const mockState = state ?? createMockState();
  const env = { INTERNAL_API_SECRET: 'test-secret' };
  const dob = new EndpointDO(
    mockState as unknown as DurableObjectState,
    env
  );
  return { dob, state: mockState, env };
}

function internalRequest(path: string, options: {
  method?: string;
  body?: unknown;
  secret?: string;
} = {}) {
  const { method = 'GET', body, secret = 'test-secret' } = options;
  return new Request(`http://internal${path}`, {
    method,
    headers: {
      'X-Internal-Auth': secret,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function mockRequest(path: string, options: {
  method?: string;
  body?: string;
  headers?: Record<string, string>;
} = {}) {
  const { method = 'GET', body, headers = {} } = options;
  return new Request(`http://mock-project.mockd.sh${path}`, {
    method,
    headers,
    body: body ?? undefined,
  });
}

// --- Tests ---

describe('EndpointDO - Config', () => {
  let dob: EndpointDO;
  let state: ReturnType<typeof createMockState>;

  beforeEach(() => {
    const setup = createDO();
    dob = setup.dob;
    state = setup.state;
  });

  it('should store maxRequestSize when config is set via tier name', async () => {
    const response = await dob.fetch(
      internalRequest('/__internal/config', {
        method: 'PUT',
        body: { tier: 'pro' },
      })
    );

    expect(response.status).toBe(200);
    const stored = await state.storage.get<number>('config:maxRequestSize');
    expect(stored).toBe(TIER_LIMITS.pro.maxRequestSize);
  });

  it('should store maxRequestSize when set with explicit value', async () => {
    const response = await dob.fetch(
      internalRequest('/__internal/config', {
        method: 'PUT',
        body: { maxRequestSize: 200_000 },
      })
    );

    expect(response.status).toBe(200);
    const stored = await state.storage.get<number>('config:maxRequestSize');
    expect(stored).toBe(200_000);
  });

  it('should prefer tier over explicit maxRequestSize when both provided', async () => {
    const response = await dob.fetch(
      internalRequest('/__internal/config', {
        method: 'PUT',
        body: { tier: 'team', maxRequestSize: 1 },
      })
    );

    expect(response.status).toBe(200);
    const stored = await state.storage.get<number>('config:maxRequestSize');
    expect(stored).toBe(TIER_LIMITS.team.maxRequestSize);
  });

  it('should return stored config via GET', async () => {
    await state.storage.put('config:maxRequestSize', 250_000);

    const response = await dob.fetch(
      internalRequest('/__internal/config', { method: 'GET' })
    );

    expect(response.status).toBe(200);
    const data = await response.json() as { data: { maxRequestSize: number } };
    expect(data.data.maxRequestSize).toBe(250_000);
  });

  it('should return free tier default when no config is set', async () => {
    const response = await dob.fetch(
      internalRequest('/__internal/config', { method: 'GET' })
    );

    expect(response.status).toBe(200);
    const data = await response.json() as { data: { maxRequestSize: number } };
    expect(data.data.maxRequestSize).toBe(TIER_LIMITS.free.maxRequestSize);
  });

  it('should reject config requests without valid internal auth', async () => {
    const response = await dob.fetch(
      internalRequest('/__internal/config', {
        method: 'PUT',
        body: { tier: 'pro' },
        secret: 'wrong-secret',
      })
    );

    expect(response.status).toBe(401);
  });
});

describe('EndpointDO - Request Size Limits', () => {
  let dob: EndpointDO;
  let state: ReturnType<typeof createMockState>;

  beforeEach(() => {
    const setup = createDO();
    dob = setup.dob;
    state = setup.state;
  });

  it('should reject request when Content-Length exceeds limit', async () => {
    // Default is free tier: 100KB
    const response = await dob.fetch(
      mockRequest('/api/test', {
        method: 'POST',
        headers: {
          'Content-Length': String(200 * 1024), // 200KB
        },
        body: 'small body',
      })
    );

    expect(response.status).toBe(413);
    const data = await response.json() as { error: string; code: string; maxSize: number };
    expect(data.code).toBe('REQUEST_TOO_LARGE');
    expect(data.maxSize).toBe(TIER_LIMITS.free.maxRequestSize);
  });

  it('should reject request when actual body exceeds limit', async () => {
    // Set a small limit for easy testing
    await state.storage.put('config:maxRequestSize', 100);

    const largeBody = 'x'.repeat(200);

    const response = await dob.fetch(
      mockRequest('/api/test', {
        method: 'POST',
        body: largeBody,
        // No Content-Length header — will be checked after body read
      })
    );

    expect(response.status).toBe(413);
    const data = await response.json() as { error: string; code: string; maxSize: number; size: number };
    expect(data.code).toBe('REQUEST_TOO_LARGE');
    expect(data.maxSize).toBe(100);
    expect(data.size).toBe(200);
  });

  it('should allow request within free tier limit', async () => {
    const smallBody = '{"name": "test"}';

    const response = await dob.fetch(
      mockRequest('/api/test', {
        method: 'POST',
        body: smallBody,
      })
    );

    // Should pass size check and reach endpoint matching (404 = no endpoint found)
    expect(response.status).toBe(404);
  });

  it('should use pro tier limit when configured', async () => {
    // Set pro tier config
    await dob.fetch(
      internalRequest('/__internal/config', {
        method: 'PUT',
        body: { tier: 'pro' },
      })
    );

    // Send 200KB body — exceeds free (100KB) but within pro (512KB)
    const body = 'x'.repeat(200 * 1024);

    const response = await dob.fetch(
      mockRequest('/api/test', {
        method: 'POST',
        body,
      })
    );

    // Should pass size check (404 = no endpoint matched, which is fine)
    expect(response.status).toBe(404);
  });

  it('should reject body exceeding pro tier limit', async () => {
    await dob.fetch(
      internalRequest('/__internal/config', {
        method: 'PUT',
        body: { tier: 'pro' },
      })
    );

    // Send 600KB body — exceeds pro limit (512KB)
    const body = 'x'.repeat(600 * 1024);

    const response = await dob.fetch(
      mockRequest('/api/test', {
        method: 'POST',
        body,
      })
    );

    expect(response.status).toBe(413);
    const data = await response.json() as { code: string; maxSize: number };
    expect(data.code).toBe('REQUEST_TOO_LARGE');
    expect(data.maxSize).toBe(TIER_LIMITS.pro.maxRequestSize);
  });

  it('should allow GET requests without body', async () => {
    const response = await dob.fetch(
      mockRequest('/api/test', { method: 'GET' })
    );

    // No body = passes size check, reaches endpoint matching (404)
    expect(response.status).toBe(404);
  });

  it('should allow request exactly at the limit', async () => {
    await state.storage.put('config:maxRequestSize', 50);

    const body = 'x'.repeat(50);

    const response = await dob.fetch(
      mockRequest('/api/test', {
        method: 'POST',
        body,
      })
    );

    // Exactly at limit should pass
    expect(response.status).toBe(404);
  });

  it('should reject request one byte over the limit', async () => {
    await state.storage.put('config:maxRequestSize', 50);

    const body = 'x'.repeat(51);

    const response = await dob.fetch(
      mockRequest('/api/test', {
        method: 'POST',
        body,
      })
    );

    expect(response.status).toBe(413);
  });
});
