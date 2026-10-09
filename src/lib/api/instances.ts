import { createApiClient } from './client';
import { clientEnv } from '@/config/env';

/**
 * The app's one configured client. It talks to the upstream REST API directly,
 * from Server Components and from the browser alike, so it ships to the browser
 * and must never carry a secret: no `serverEnv()`, no token. When a project
 * needs per-user auth, pass `headers` as a function here.
 */
export const api = createApiClient({
  baseUrl: clientEnv.NEXT_PUBLIC_API_BASE_URL,
  headers: { Accept: 'application/json' },
});
