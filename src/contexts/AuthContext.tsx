import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { ChildSummary, User } from '../types';
import * as authService from '../services/authService';

type AuthContextValue = {
  user: User | null;
  child: ChildSummary | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  updateChildSummary: (child: ChildSummary) => void;
  updateUser: (user: User) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => readJson<User>('user'));
  const [child, setChild] = useState<ChildSummary | null>(() => readJson<ChildSummary>('child'));

  const signIn = async (email: string, password: string) => {
    const result = await authService.login(email, password);

    localStorage.setItem('access_token', result.accessToken);
    localStorage.setItem('refresh_token', result.refreshToken);
    localStorage.setItem('token_expires_at', result.expiresAt);
    localStorage.setItem('user', JSON.stringify(result.user));
    localStorage.setItem('child', JSON.stringify(result.child));
    localStorage.setItem('child_id', result.child.id);

    setUser(result.user);
    setChild(result.child);
  };

  const signOut = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token_expires_at');
    localStorage.removeItem('user');
    localStorage.removeItem('child');
    localStorage.removeItem('child_id');
    setUser(null);
    setChild(null);
  };

  const updateChildSummary = (updatedChild: ChildSummary) => {
    localStorage.setItem('child', JSON.stringify(updatedChild));
    localStorage.setItem('child_id', updatedChild.id);
    setChild(updatedChild);
  };

  const updateUser = (updatedUser: User) => { localStorage.setItem('user', JSON.stringify(updatedUser)); setUser(updatedUser); };

  const value = useMemo(
    () => ({ user, child, isAuthenticated: !!user && !!localStorage.getItem('access_token'), signIn, signOut, updateChildSummary, updateUser }),
    [user, child],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
