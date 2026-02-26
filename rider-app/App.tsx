import React from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {RiderAuthProvider} from './src/context/RiderAuthContext';
import {AppNavigator} from './src/navigation/AppNavigator';

const App: React.FC = () => {
  return (
    <SafeAreaProvider>
      <RiderAuthProvider>
        <AppNavigator />
      </RiderAuthProvider>
    </SafeAreaProvider>
  );
};

export default App;
