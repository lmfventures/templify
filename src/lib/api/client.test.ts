import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createApiClient } from './client';
import { ApiError } from './errors';

const client = createApiClient({ baseUrl: 'https://example.test' });

function respondWith(status: number, body: unknown, init?: ResponseInit) {
  const mock = vi.fn(
    async () =>
      new Response(status === 204 ? null : JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
        ...init,
      }),
  );
  vi.stubGlobal('fetch', mock);
  return mock;
}

function respondWithText(status: number, text: string, contentType = 'text/plain') {
  const mock = vi.fn(
    async () => new Response(text, { status, headers: { 'content-type': contentType } }),
  );
  vi.stubGlobal('fetch', mock);
  return mock;
}

/**
 * The wrapper may call `fetch(url, init)` or `fetch(Request, init)` — both are
 * legitimate. These helpers read the outgoing request without pinning the test
 * to either calling convention.
 */
type FetchMock = ReturnType<typeof vi.fn>;

function callOf(mock: FetchMock, index = 0) {
  const [target, init] = mock.mock.calls[index] as [string | Request, RequestInit | undefined];
  const request = typeof target === 'string' ? undefined : target;
  return {
    url: request ? request.url : String(target),
    method: request?.method ?? init?.method,
    headers: request ? request.headers : new Headers(init?.headers),
    init: init ?? {},
    request,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createApiClient error handling', () => {
  it('keeps the message from an { error } body but derives code from the status', async () => {
    respondWith(409, {
      error: {
        message: 'Email already taken',
        code: 'email_taken',
        fields: { email: ['Email already taken'] },
      },
    });

    const error = await client.get('/users').catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: 'conflict', message: 'Email already taken' });
    expect((error as ApiError).fields).toBeUndefined();
  });

  it('derives the code from the status and keeps a plain-text body as the message', async () => {
    respondWith(500, 'boom');

    const error = await client.get('/users').catch((cause: unknown) => cause);

    expect(error).toMatchObject({ status: 500, code: 'internal_error', message: 'boom' });
    expect((error as ApiError).fields).toBeUndefined();
  });


  it('reports a network failure as a 503 rather than leaking the raw cause', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed');
      }),
    );

    const error = await client.get('/users').catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 503, code: 'network_error' });
  });

  it('reports a timeout as a 408 once the deadline passes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (target: string | Request, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            const signal =
              init?.signal ?? (typeof target === 'string' ? undefined : target.signal);
            signal?.addEventListener('abort', () => reject(signal.reason));
          }),
      ),
    );

    const error = await client
      .get('/users', { timeoutMs: 10 })
      .catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 408, code: 'timeout' });
  });

  it('lets a header-resolution failure propagate instead of masking it as a 503', async () => {
    respondWith(200, {});
    const misconfigured = createApiClient({
      baseUrl: 'https://example.test',
      headers: () => {
        throw new Error('Invalid server environment variables');
      },
    });

    const error = await misconfigured.get('/users').catch((cause: unknown) => cause);

    expect(error).not.toBeInstanceOf(ApiError);
    expect((error as Error).message).toBe('Invalid server environment variables');
  });

  it('rejects a payload that does not match the schema', async () => {
    respondWith(200, { id: 'not-a-number' });

    const error = await client
      .get('/users/1', { schema: z.object({ id: z.number() }) })
      .catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 502, code: 'invalid_response' });
  });
});

describe('createApiClient request shaping', () => {
  it('forwards Next cache options so route-level revalidation keeps working', async () => {
    const mock = respondWith(200, []);

    await client.get('/users', { next: { revalidate: 60, tags: ['users'] } });

    expect(callOf(mock).init.next).toEqual({ revalidate: 60, tags: ['users'] });
  });

  it('forwards the cache directive', async () => {
    const mock = respondWith(200, {});

    await client.post('/users', { body: { name: 'Ada' }, cache: 'no-store' });

    expect(callOf(mock).init.cache).toBe('no-store');
  });

  it('drops empty query params and keeps the rest', async () => {
    const mock = respondWith(200, []);

    await client.get('/users', {
      params: { _page: 2, _limit: undefined, q: '', active: false },
    });

    const { searchParams } = new URL(callOf(mock).url);
    expect(searchParams.get('_page')).toBe('2');
    expect(searchParams.get('active')).toBe('false');
    expect(searchParams.has('_limit')).toBe(false);
    expect(searchParams.has('q')).toBe(false);
  });

  it('joins the base url and path without doubling the slash', async () => {
    const mock = respondWith(200, []);
    const trailing = createApiClient({ baseUrl: 'https://example.test/' });

    await trailing.get('/users');

    expect(new URL(callOf(mock).url).pathname).toBe('/users');
  });

  it('sends an object body as JSON', async () => {
    const mock = respondWith(201, {});

    await client.post('/users', { body: { name: 'Ada' } });

    const call = callOf(mock);
    expect(call.method).toBe('POST');
    expect(call.headers.get('content-type')).toContain('application/json');
    const sent = call.request
      ? await call.request.clone().text()
      : String(call.init.body);
    expect(JSON.parse(sent)).toEqual({ name: 'Ada' });
  });

  it('resolves an async default header function per request', async () => {
    const mock = respondWith(200, {});
    const authed = createApiClient({
      baseUrl: 'https://example.test',
      headers: async () => ({ Authorization: 'Bearer token-1' }),
    });

    await authed.get('/users');

    expect(callOf(mock).headers.get('authorization')).toBe('Bearer token-1');
  });

  it('lets a per-request header override the client default', async () => {
    const mock = respondWith(200, {});
    const authed = createApiClient({
      baseUrl: 'https://example.test',
      headers: { Accept: 'application/json', 'X-Source': 'default' },
    });

    await authed.get('/users', { headers: { 'X-Source': 'override' } });

    const { headers } = callOf(mock);
    expect(headers.get('x-source')).toBe('override');
    expect(headers.get('accept')).toBe('application/json');
  });

  it('sends no User-Agent from the browser, so a cross-origin GET needs no preflight', async () => {
    const mock = respondWith(200, {});

    await client.get('/users');

    expect(callOf(mock).headers.has('user-agent')).toBe(false);
  });
});

describe('createApiClient response parsing', () => {
  it('returns null for a 204', async () => {
    respondWith(204, null);

    await expect(client.delete('/users/1')).resolves.toBeNull();
  });

  it('returns null for an empty body', async () => {
    respondWithText(200, '');

    await expect(client.get('/health')).resolves.toBeNull();
  });

  it('returns raw text when the body is not JSON', async () => {
    respondWithText(200, 'pong');

    await expect(client.get('/ping')).resolves.toBe('pong');
  });

  it('returns the parsed value when the schema matches', async () => {
    respondWith(200, { id: 1, name: 'Ada' });

    await expect(
      client.get('/users/1', { schema: z.object({ id: z.number(), name: z.string() }) }),
    ).resolves.toEqual({ id: 1, name: 'Ada' });
  });
});
