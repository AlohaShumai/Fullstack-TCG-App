import { createContext, useContext, useState, type ReactNode } from 'react';
import api from '../services/api';

interface User {
  id: string;
  email: string;
  role: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Decodes the JWT payload (middle segment, base64-encoded JSON) without verifying the signature.
// Verification happens on the server; we just need the user info for UI purposes.
function decodeUser(token: string): User | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      username: payload.username ?? '',
    };
  } catch {
    return null;
  }
}

// Runs once on page load — restores the session from localStorage without an API call
function getInitialUser(): User | null {
  const token = localStorage.getItem('accessToken');
  if (token) {
    const user = decodeUser(token);
    if (user) return user;
    // Token was malformed — clear it so the user isn't stuck in a broken state
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(getInitialUser);

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    const { accessToken, refreshToken } = response.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(decodeUser(accessToken));
  };

  const register = async (
    email: string,
    password: string,
    username: string,
  ) => {
    const response = await api.post('/auth/register', {
      email,
      password,
      username,
    });
    const { accessToken, refreshToken } = response.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(decodeUser(accessToken));
  };

  const logout = () => {
    api.post('/auth/logout').catch(() => {});
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  const updateUser = (updates: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : null));
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
