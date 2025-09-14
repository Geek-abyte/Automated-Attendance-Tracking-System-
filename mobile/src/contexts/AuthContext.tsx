import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { AuthState, User } from '../types';

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

  const createUser = useMutation(api.users.createUser);
  const [loginEmail, setLoginEmail] = useState<string | null>(null);
  const getUserByEmail = useQuery(api.users.getUserByEmail, 
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
      setLoginEmail(email);
      
      // Wait for the query to complete
      return new Promise((resolve) => {
        const checkUser = () => {
          if (getUserByEmail !== undefined) {
            if (getUserByEmail) {
              // For now, we'll accept any password since we don't have password hashing
              // In a production app, you'd verify the password hash here
              const userData = {
                _id: getUserByEmail._id,
                name: getUserByEmail.name,
                email: getUserByEmail.email,
                bleUuid: getUserByEmail.bleUuid,
                createdAt: getUserByEmail._creationTime,
              };
              
              AsyncStorage.setItem('user', JSON.stringify(userData));
              setAuthState({
                isAuthenticated: true,
                user: userData,
                loading: false,
              });
              setLoginEmail(null);
              resolve(true);
            } else {
              setLoginEmail(null);
              resolve(false);
            }
          } else {
            // Query is still loading, check again in 100ms
            setTimeout(checkUser, 100);
          }
        };
        checkUser();
      });
    } catch (error) {
      console.error('Login error:', error);
      setLoginEmail(null);
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
  // Use a more robust UUID generation approach
  // For React Native, we'll use a combination of timestamp and random values
  const timestamp = Date.now().toString(16);
  const randomPart1 = Math.random().toString(16).substring(2, 10);
  const randomPart2 = Math.random().toString(16).substring(2, 10);
  const randomPart3 = Math.random().toString(16).substring(2, 10);
  
  return `${timestamp}-${randomPart1}-4${randomPart2.substring(0, 3)}-${randomPart3.substring(0, 4)}-${randomPart2.substring(3)}${randomPart3.substring(4)}`;
}
