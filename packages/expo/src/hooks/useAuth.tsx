import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { User, LoginRequest, RegisterRequest } from '@mockd/shared/types';
import { storage } from '../utils/storage';
import { getApiBaseUrl } from '../api/config';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (credentials: RegisterRequest) => Promise<void>;
  loginWithGitHub: () => Promise<string>;
  handleOAuthCallback: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  // Load stored user on mount
  useEffect(() => {
    async function loadStoredAuth() {
      try {
        const [token, storedUser] = await Promise.all([
          storage.getToken(),
          storage.getUser(),
        ]);

        if (token && storedUser) {
          const parsedUser = JSON.parse(storedUser) as User;
          setUser(parsedUser);

          // Verify token is still valid by calling /api/auth/me
          try {
            const response = await fetch(`${getApiBaseUrl()}/api/auth/me`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
              // Token expired, clear auth
              await storage.clearAll();
              setUser(null);
            } else {
              const data = await response.json();
              setUser(data.user);
              await storage.setUser(JSON.stringify(data.user));
            }
          } catch {
            // Network error, keep stored user for offline support
          }
        }
      } catch (error) {
        console.error('Failed to load stored auth:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadStoredAuth();
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    const response = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Return-Token': 'true', // Request token instead of cookie
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    await storage.setToken(data.token);
    await storage.setUser(JSON.stringify(data.user));
    setUser(data.user);
  }, []);

  const register = useCallback(async (credentials: RegisterRequest) => {
    const response = await fetch(`${getApiBaseUrl()}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Return-Token': 'true',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    await storage.setToken(data.token);
    await storage.setUser(JSON.stringify(data.user));
    setUser(data.user);
  }, []);

  const loginWithGitHub = useCallback(async (): Promise<string> => {
    // Get the OAuth URL from the backend
    const response = await fetch(`${getApiBaseUrl()}/api/auth/github/mobile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to start GitHub login');
    }

    return data.authUrl;
  }, []);

  const handleOAuthCallback = useCallback(async (token: string) => {
    // Validate the token by fetching user info
    const response = await fetch(`${getApiBaseUrl()}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to authenticate');
    }

    await storage.setToken(token);
    await storage.setUser(JSON.stringify(data.user));
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      const token = await storage.getToken();
      if (token) {
        // Invalidate the token on the server
        await fetch(`${getApiBaseUrl()}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (error) {
      // Ignore logout errors, proceed with local cleanup
      console.error('Logout error:', error);
    }

    await storage.clearAll();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        loginWithGitHub,
        handleOAuthCallback,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
