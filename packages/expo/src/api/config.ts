import Constants from 'expo-constants';

/**
 * API configuration for the mobile app.
 * Uses environment variables or defaults for development.
 */

// In development, you'll typically use your local machine's IP
// Production would use the actual API domain
const DEV_API_URL = 'http://localhost:8787';
const PROD_API_URL = 'https://api.mockd.dev';

const DEV_ENDPOINT_URL = 'http://localhost:8788';
const PROD_ENDPOINT_URL = 'https://endpoint.mockd.dev';

export function getApiBaseUrl(): string {
  const extraConfig = Constants.expoConfig?.extra;
  if (extraConfig?.apiUrl) {
    return extraConfig.apiUrl as string;
  }
  return __DEV__ ? DEV_API_URL : PROD_API_URL;
}

export function getEndpointBaseUrl(): string {
  const extraConfig = Constants.expoConfig?.extra;
  if (extraConfig?.endpointUrl) {
    return extraConfig.endpointUrl as string;
  }
  return __DEV__ ? DEV_ENDPOINT_URL : PROD_ENDPOINT_URL;
}

export function getEndpointWebSocketUrl(): string {
  const baseUrl = getEndpointBaseUrl();
  // Convert http(s):// to ws(s)://
  return baseUrl.replace(/^http/, 'ws');
}
