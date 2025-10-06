import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from 'convex/react';
import { AuthState, User } from '../types';
import { ApiService } from '../services/api';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: true,
  });

  const createUser = useMutation("users:createUser" as any);
  const [loginEmail, setLoginEmail] = useState<string | null>(null);
  const getUserByEmail = useQuery("users:getUserByEmail" as any, 
    loginEmail ? { email: loginEmail } : "skip"
  );

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setAuthState({
          isAuthenticated: true,
          user,
          loading: false,
        });
      } else {
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Verify login credentials with backend
      const user = await ApiService.verifyLogin(email.trim().toLowerCase(), password);
      
      if (!user) {
        console.log('Invalid email or password');
        return false;
      }

      // Store user data and mark as authenticated
      const userData = {
        _id: user._id,
        name: user.name,
        email: user.email,
        bleUuid: user.bleUuid,
        createdAt: user._creationTime || user.createdAt,
      };
      
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setAuthState({
        isAuthenticated: true,
        user: userData,
        loading: false,
      });
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      // Generate a unique BLE UUID for the user
      const bleUuid = generateBleUuid();
      
      const userId = await createUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password,
        bleUuid,
      });

      if (userId) {
        const userData = {
          _id: userId,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          bleUuid,
          createdAt: Date.now(),
        };
        
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        setAuthState({
          isAuthenticated: true,
          user: userData,
          loading: false,
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Registration error:', error);
      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes('BLE UUID already in use')) {
          // Retry with a new UUID
          return register(name, email, password);
        }
      }
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem('user');
      setAuthState({
        isAuthenticated: false,
        user: null,
        loading: false,
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateProfile = async (updates: Partial<User>): Promise<void> => {
    try {
      if (authState.user) {
        const updatedUser = { ...authState.user, ...updates };
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        setAuthState(prev => ({
          ...prev,
          user: updatedUser,
        }));
      }
    } catch (error) {
      console.error('Update profile error:', error);
    }
  };

  const value: AuthContextType = {
    ...authState,
    login,
    register,
    logout,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Improved UUID generator for BLE with better uniqueness
function generateBleUuid(): string {
  // Generate UUID with ATT-USER- prefix for scanner compatibility
  // Scanner looks for devices with "ATT-" prefix
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomPart = '';
  
  // Generate 8 random alphanumeric characters
  for (let i = 0; i < 8; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return `ATT-USER-${randomPart}`;
}
