import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'mockd_auth_token';
const USER_KEY = 'mockd_user';

/**
 * Secure storage wrapper for authentication tokens.
 * Uses expo-secure-store which encrypts data on device.
 */
export const storage = {
  async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get token from secure storage:', error);
      return null;
    }
  },

  async setToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to save token to secure storage:', error);
      throw error;
    }
  },

  async removeToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (error) {
      console.error('Failed to remove token from secure storage:', error);
    }
  },

  async getUser(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(USER_KEY);
    } catch (error) {
      console.error('Failed to get user from secure storage:', error);
      return null;
    }
  },

  async setUser(user: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(USER_KEY, user);
    } catch (error) {
      console.error('Failed to save user to secure storage:', error);
      throw error;
    }
  },

  async removeUser(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch (error) {
      console.error('Failed to remove user from secure storage:', error);
    }
  },

  async clearAll(): Promise<void> {
    await Promise.all([
      this.removeToken(),
      this.removeUser(),
    ]);
  },
};
