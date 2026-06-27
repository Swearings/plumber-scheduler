import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from './src/hooks/useAuth';
import LoginScreen from './src/screens/LoginScreen';
import AppNavigator from './src/navigation/AppNavigator';

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#0f172a',
    card: '#0f172a',
    text: '#f1f5f9',
    border: '#1e293b',
    primary: '#3b82f6',
  },
};

export default function App() {
  const { user, loading } = useAuth();

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {loading ? (
        <View style={{ flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color="#3b82f6" size="large" />
        </View>
      ) : (
        <NavigationContainer theme={navTheme}>
          {user ? <AppNavigator user={user} /> : <LoginScreen />}
        </NavigationContainer>
      )}
    </SafeAreaProvider>
  );
}
