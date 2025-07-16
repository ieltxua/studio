import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/services/api';
import type { User, Organization } from '@/types';

interface AuthContextType {
  user: User | null;
  currentOrganization: Organization | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: { email: string; password: string; firstName?: string; lastName?: string }) => Promise<void>;
  setCurrentOrganization: (org: Organization) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const isAuthenticated = !!user;

  // Mock data for development
  const mockUser: User = {
    id: '1',
    email: 'demo@studio.ai',
    firstName: 'Demo',
    lastName: 'User',
    organizations: [{
      id: '1',
      role: 'OWNER',
      organization: {
        id: '1',
        name: 'Demo Organization',
        slug: 'demo-org',
        planType: 'ENTERPRISE',
        maxProjects: 50,
        maxAgents: 100,
        maxUsers: 200,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      joinedAt: new Date().toISOString(),
    }],
  };

  useEffect(() => {
    if (import.meta.env.VITE_USE_MOCK_DATA === 'true') {
      // Use mock data for development
      setUser(mockUser);
      setCurrentOrganization(mockUser.organizations[0].organization);
      setIsLoading(false);
    } else {
      checkAuth();
    }
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await authApi.me();
      setUser(response.data);
      
      // Set default organization
      if (response.data.organizations.length > 0) {
        setCurrentOrganization(response.data.organizations[0].organization);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login(email, password);
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      
      // Set default organization
      if (response.data.user.organizations.length > 0) {
        setCurrentOrganization(response.data.user.organizations[0].organization);
      }
      
      navigate('/');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      setUser(null);
      setCurrentOrganization(null);
      navigate('/login');
    }
  };

  const register = async (data: { email: string; password: string; firstName?: string; lastName?: string }) => {
    try {
      const response = await authApi.register(data);
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      
      // Set default organization
      if (response.data.user.organizations.length > 0) {
        setCurrentOrganization(response.data.user.organizations[0].organization);
      }
      
      navigate('/');
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const value = {
    user,
    currentOrganization,
    isLoading,
    isAuthenticated,
    login,
    logout,
    register,
    setCurrentOrganization,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};