import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User } from '../types';
import HomeScreen from '../screens/HomeScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import BillingScreen from '../screens/BillingScreen';
import MapScreen from '../screens/MapScreen';

const Tab = createBottomTabNavigator();

interface Props {
  user: User;
}

export default function AppNavigator({ user }: Props) {
  const isDispatcher = user.role === 'dispatcher';
  const insets = useSafeAreaInsets();
  // Keep a small gap above the home indicator instead of the full inset.
  const tabBottomPad = Math.max(insets.bottom - 14, 6);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, string> = {
            Home: focused ? 'home' : 'home-outline',
            Calendar: focused ? 'calendar' : 'calendar-outline',
            Billing: focused ? 'card' : 'card-outline',
            Map: focused ? 'map' : 'map-outline',
          };
          return <Ionicons name={icons[route.name] as any} size={size} color={color} />;
        },
        tabBarStyle: {
          backgroundColor: '#0f172a',
          borderTopColor: '#1e293b',
          height: 56 + tabBottomPad,
          paddingBottom: tabBottomPad,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#475569',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home">
        {() => <HomeScreen userId={user.id} isDispatcher={isDispatcher} />}
      </Tab.Screen>
      <Tab.Screen name="Calendar">
        {() => <ScheduleScreen userId={user.id} isDispatcher={isDispatcher} />}
      </Tab.Screen>
      <Tab.Screen name="Billing">
        {() => <BillingScreen userId={user.id} />}
      </Tab.Screen>
      <Tab.Screen name="Map" component={MapScreen} />
    </Tab.Navigator>
  );
}
