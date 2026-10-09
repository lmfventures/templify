export const APP_NAME = 'Templify';

export const ROUTES = {
  home: '/',
  dashboard: '/dashboard',
} as const;

/** Default page size for paginated resources. */
export const DEFAULT_PAGE_SIZE = 20;

/** Abort outbound API calls after this many milliseconds. */
export const API_TIMEOUT_MS = 10_000;
