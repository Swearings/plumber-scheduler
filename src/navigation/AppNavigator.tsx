import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User } from '../types';
import HomeScreen from '../screens/HomeScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import BillingScreen from '../screens/BillingScreen';
import PermitsScreen from '../screens/PermitsScreen';
import LeadsScreen from '../screens/LeadsScreen';

const Tab = createBottomTabNavigator();

interface Props {
  user: User;
}

export default function AppNavigator({ user }: Props) {
  const isDispatcher = user.role === 'dispatcher';
  const insets = useSafeAreaInsets();
  // Cap the safe-area inset so the bar stays compact in standalone PWA mode
  // (where iOS reports a large bottom inset) while leaving room for labels.
  const pad = Math.min(insets.bottom, 12);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, string> = {
            Home: focused ? 'home' : 'home-outline',
            Calendar: focused ? 'calendar' : 'calendar-outline',
            Billing: focused ? 'card' : 'card-outline',
            Permits: focused ? 'document-text' : 'document-text-outline',
            Leads: focused ? 'people' : 'people-outline',
          };
          return <Ionicons name={icons[route.name] as any} size={size} color={color} />;
        },
        tabBarStyle: { backgroundColor: '#0f172a', borderTopColor: '#1e293b', height: 58 + pad, paddingBottom: pad, paddingTop: 8 },
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
      <Tab.Screen name="Permits" component={PermitsScreen} />
      <Tab.Screen name="Leads">
        {() => <LeadsScreen userId={user.id} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
