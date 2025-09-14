import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ConvexProvider } from 'convex/react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { convex } from './src/lib/convex';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { BluetoothProvider } from './src/contexts/BluetoothContextFallback';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { EventsScreen } from './src/screens/EventsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { View, StyleSheet, ActivityIndicator } from 'react-native';

type Screen = 'login' | 'register' | 'events' | 'profile';

const AppContent: React.FC = () => {
  const { isAuthenticated, user, loading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    if (currentScreen === 'login') {
      return (
        <LoginScreen onNavigateToRegister={() => setCurrentScreen('register')} />
      );
    } else {
      return (
        <RegisterScreen onNavigateToLogin={() => setCurrentScreen('login')} />
      );
    }
  }

  if (currentScreen === 'events') {
    return (
      <BluetoothProvider bleUuid={user?.bleUuid || null}>
        <EventsScreen onNavigateToProfile={() => setCurrentScreen('profile')} />
      </BluetoothProvider>
    );
  } else {
    return (
      <ProfileScreen onNavigateToEvents={() => setCurrentScreen('events')} />
    );
  }
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ConvexProvider client={convex}>
        <AuthProvider>
          <AppContent />
          <StatusBar style="auto" />
        </AuthProvider>
      </ConvexProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});
