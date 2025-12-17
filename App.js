import React from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Dashboard from './screens/Dashboard';
import TrustedContacts from './screens/TrustedContacts';
import Observer from './screens/Observer';
import { WalkProvider } from './context/WalkContext';
import SignIn from './screens/SignIn';
import Register from './screens/Register';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <PaperProvider>
      <WalkProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="SignIn" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="SignIn" component={SignIn} />
            <Stack.Screen name="Register" component={Register} />
            <Stack.Screen name="Dashboard" component={Dashboard} />
            <Stack.Screen name="TrustedContacts" component={TrustedContacts} />
            <Stack.Screen name="Observer" component={Observer} />
          </Stack.Navigator>
        </NavigationContainer>
      </WalkProvider>
    </PaperProvider>
  );
}
