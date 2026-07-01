import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User } from '../types';
import HomeScreen from '../screens/HomeScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import BillingScreen from '../screens/BillingScreen';
import PermitsScreen from '../screens/PermitsScreen';
import CustomersScreen from '../screens/CustomersScreen';

const Tab = createBottomTabNavigator();

interface Props {
  user: User;
}

export default function AppNavigator({ user }: Props) {
  const isDispatcher = user.role === 'dispatcher';
  const insets = useSafeAreaInsets();
  // Clearance above the home indicator. Capped so standalone PWA (large inset)
  // stays tight. The bar itself is absolutely pinned to the bottom edge below.
  const pad = Math.min(insets.bottom, 10);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, string> = {
            Home: focused ? 'home' : 'home-outline',
            Calendar: focused ? 'calendar' : 'calendar-outline',
            Billing: focused ? 'card' : 'card-outline',
            Permits: focused ? 'document-text' : 'document-text-outline',
            Customers: focused ? 'people' : 'people-outline',
          };
          return <Ionicons name={icons[route.name] as any} size={size} color={color} />;
        },
        // Absolutely pinned to the bottom edge so it never floats above it.
        tabBarStyle: {
          position: 'absolute', left: 0, right: 0, bottom: 0,
          backgroundColor: '#0f172a', borderTopColor: '#1e293b',
          height: 56 + pad, paddingBottom: pad, paddingTop: 6,
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
      <Tab.Screen name="Permits" component={PermitsScreen} />
      <Tab.Screen name="Customers">
        {() => <CustomersScreen userId={user.id} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
