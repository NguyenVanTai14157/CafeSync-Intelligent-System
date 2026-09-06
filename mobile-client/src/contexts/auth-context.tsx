import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { authService } from '@/services/auth-service';
import { removeSessionToken, getSessionToken, saveSessionToken } from '@/storage/session-storage';
import { getJson, setJson, StorageKeys } from '@/storage/storage';
import type { LoginInput, RegisterInput, User } from '@/types/auth';

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isHydrated: boolean;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<string>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    Promise.all([getJson<User | null>(StorageKeys.user, null), getSessionToken()])
      .then(([storedUser, storedToken]) => {
        setUser(storedUser);
        setToken(storedToken);
      })
      .finally(() => setIsHydrated(true));
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const session = await authService.login(input);
    await Promise.all([
      saveSessionToken(session.token),
      setJson(StorageKeys.user, session.user),
    ]);
    setToken(session.token);
    setUser(session.user);
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const result = await authService.register(input);
    return result.message;
  }, []);

  const logout = useCallback(async () => {
    await Promise.all([
      removeSessionToken(),
      AsyncStorage.removeItem(StorageKeys.user),
    ]);
    setToken(null);
    setUser(null);
    queryClient.removeQueries({
      predicate: (query) => ['orders', 'recommendations', 'product'].includes(String(query.queryKey[0])),
    });
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    isHydrated,
    isAuthenticated: Boolean(user && token),
    login,
    register,
    logout,
  }), [isHydrated, login, logout, register, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
