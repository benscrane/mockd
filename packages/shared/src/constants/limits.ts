export const TIER_LIMITS = {
  free: {
    projects: 3,
    endpointsPerProject: 3,
    requestsPerDay: 1000,
    logRetentionDays: 1,
    maxResponseSize: 64 * 1024, // 64KB
    maxDelay: 5000, // 5 seconds
    defaultEndpointRateLimit: 30, // requests per minute
    maxEndpointRateLimit: 60,
  },
  pro: {
    projects: 25,
    endpointsPerProject: 25,
    requestsPerDay: 100000,
    logRetentionDays: 7,
    maxResponseSize: 1024 * 1024, // 1MB
    maxDelay: 30000, // 30 seconds
    defaultEndpointRateLimit: 60, // requests per minute
    maxEndpointRateLimit: 300,
  },
  team: {
    projects: 100,
    endpointsPerProject: 100,
    requestsPerDay: 1000000,
    logRetentionDays: 30,
    maxResponseSize: 5 * 1024 * 1024, // 5MB
    maxDelay: 60000, // 60 seconds
    defaultEndpointRateLimit: 150, // requests per minute
    maxEndpointRateLimit: 1500,
  },
} as const;

export type Tier = keyof typeof TIER_LIMITS;

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;
export type HttpMethod = typeof HTTP_METHODS[number];

export const DEFAULT_STATUS_CODE = 200;
export const DEFAULT_DELAY_MS = 0;
