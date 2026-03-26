import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'counselor' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  profileImage?: string;
  branch?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  apiUrl: string;
  setApiUrl: (url: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Mock users for demo
const MOCK_USERS: Record<string, User & { password: string }> = {
  'counselor@demo.com': {
    id: 'c001',
    name: '김상담',
    email: 'counselor@demo.com',
    password: 'demo1234',
    role: 'counselor',
    branch: '서울 강남지점',
  },
  'admin@demo.com': {
    id: 'a001',
    name: '이관리',
    email: 'admin@demo.com',
    password: 'demo1234',
    role: 'admin',
    branch: '본사',
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('counsel_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [apiKey, setApiKeyState] = useState(() => localStorage.getItem('counsel_api_key') || '');
  const [apiUrl, setApiUrlState] = useState(() => localStorage.getItem('counsel_api_url') || '');

  const login = async (email: string, password: string, role: UserRole): Promise<boolean> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const mockUser = MOCK_USERS[email];
    if (mockUser && mockUser.password === password) {
      const { password: _, ...userWithoutPassword } = mockUser;
      setUser(userWithoutPassword);
      localStorage.setItem('counsel_user', JSON.stringify(userWithoutPassword));
      return true;
    }
    
    // Allow any login for demo purposes with role selection
    const demoUser: User = {
      id: `demo_${Date.now()}`,
      name: role === 'admin' ? '관리자' : '상담사',
      email,
      role,
      branch: role === 'admin' ? '본사' : '서울지점',
    };
    setUser(demoUser);
    localStorage.setItem('counsel_user', JSON.stringify(demoUser));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('counsel_user');
  };

  const setApiKey = (key: string) => {
    setApiKeyState(key);
    localStorage.setItem('counsel_api_key', key);
  };

  const setApiUrl = (url: string) => {
    setApiUrlState(url);
    localStorage.setItem('counsel_api_url', url);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      logout,
      apiKey,
      setApiKey,
      apiUrl,
      setApiUrl,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
