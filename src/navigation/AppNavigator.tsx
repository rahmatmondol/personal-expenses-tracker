import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { colors } from '../utils/colors';
import { StatusBar } from 'expo-status-bar';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    secondary: colors.secondary,
    background: colors.background,
    surface: colors.white,
    error: colors.error,
    onPrimary: colors.white,
    onSecondary: colors.white,
    onSurface: colors.textPrimary,
    primaryContainer: colors.billsCardBg,
    secondaryContainer: colors.debtsCardBg,
  },
};


import { DashboardScreen } from '../screens/DashboardScreen';
import { TransactionHistoryScreen } from '../screens/TransactionHistoryScreen';
import { AddTransactionScreen } from '../screens/AddTransactionScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { CategoryManagementScreen } from '../screens/CategoryManagementScreen';
import { AccountManagementScreen } from '../screens/AccountManagementScreen';
import { DebtScreen } from '../screens/DebtScreen';
import { RecurringBillsScreen } from '../screens/RecurringBillsScreen';
import { TransferScreen } from '../screens/TransferScreen';
import { LoanScreen } from '../screens/LoanScreen';
import { AddLoanScreen } from '../screens/AddLoanScreen';
import { LoanDetailScreen } from '../screens/LoanDetailScreen';

import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { LockScreen } from '../screens/LockScreen';
import { AnimatedSplashScreen } from '../screens/AnimatedSplashScreen';
import { useState } from 'react';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Reports') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          } else if (route.name === 'Categories') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Accounts') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else {
            iconName = 'alert-circle';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Reports" component={ReportsScreen} />
      <Tab.Screen name="Accounts" component={AccountManagementScreen} />
      <Tab.Screen name="Categories" component={CategoryManagementScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export const AppNavigator = () => {
  const { isLocked, isLoading } = useStore();
  const [isSplashFinished, setIsSplashFinished] = useState(false);

  if (isLoading || !isSplashFinished) {
      return (
          <PaperProvider theme={theme}>
              <StatusBar style="light" />
              <AnimatedSplashScreen onAnimationFinish={() => setIsSplashFinished(true)} />
          </PaperProvider>
      );
  }

  return (
    <PaperProvider theme={theme}>
      <StatusBar style="dark" backgroundColor={colors.background} />
      {isLocked ? (
        <LockScreen />
      ) : (
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen 
              name="Main" 
              component={MainTabs} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="TransactionHistory" 
              component={TransactionHistoryScreen} 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="AddTransaction" 
              component={AddTransactionScreen} 
              options={{ presentation: 'modal', title: 'Add Transaction' }}
            />
            <Stack.Screen 
              name="AccountManagement" 
              component={AccountManagementScreen} 
              options={{ title: 'Accounts' }}
            />
            <Stack.Screen 
              name="Debts" 
              component={DebtScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="RecurringBills" 
              component={RecurringBillsScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="Transfer" 
              component={TransferScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen name="Loan" component={LoanScreen} />
            <Stack.Screen name="AddLoan" component={AddLoanScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="LoanDetail" component={LoanDetailScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      )}
    </PaperProvider>
  );
};
