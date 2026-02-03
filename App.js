import React from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Dashboard from './screens/Dashboard';
import TrustedContacts from './screens/TrustedContacts';
import Observer from './screens/Observer';
import Profile from './screens/Profile';
import { AuthProvider } from './context/AuthContext';
import { WalkProvider } from './context/WalkContext';
import SignIn from './screens/SignIn';
import Register from './screens/Register';
import History from './screens/History';
import AdminOverview from './screens/admin/AdminOverview';
import UserManagement from './screens/admin/UserManagement';
import EditUser from './screens/admin/EditUser';
import AddUser from './screens/admin/AddUser';

import ForgotPassword from './components/ForgotPassword';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <PaperProvider>
      <AuthProvider>
        <WalkProvider>
          <NavigationContainer>
            <Stack.Navigator initialRouteName="SignIn" screenOptions={{ headerShown: false }}>
              <Stack.Screen name="SignIn" component={SignIn} />
              <Stack.Screen name="Register" component={Register} />
              <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
              <Stack.Screen name="Dashboard" component={Dashboard} />
              <Stack.Screen name="TrustedContacts" component={TrustedContacts} />
              <Stack.Screen name="Observer" component={Observer} />
              <Stack.Screen name="Profile" component={Profile} />
              <Stack.Screen name="History" component={History} />
              <Stack.Screen name="AdminOverview" component={AdminOverview} />
              <Stack.Screen name="UserManagement" component={UserManagement} />
              <Stack.Screen name="EditUser" component={EditUser} />
              <Stack.Screen name="AddUser" component={AddUser} />
            </Stack.Navigator>
          </NavigationContainer>
        </WalkProvider>
      </AuthProvider>
    </PaperProvider>
  );
}
