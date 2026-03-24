import React, {useEffect} from 'react';
import {Text, TextInput} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {RiderAuthProvider} from './src/context/RiderAuthContext';
import {AppNavigator} from './src/navigation/AppNavigator';
import {useGeofencing} from './src/hooks/useGeofencing';

const TextComponent = Text as any;
const TextInputComponent = TextInput as any;

if (TextComponent.defaultProps == null) {
  TextComponent.defaultProps = {};
}

if (TextInputComponent.defaultProps == null) {
  TextInputComponent.defaultProps = {};
}

TextComponent.defaultProps.allowFontScaling = false;
TextComponent.defaultProps.maxFontSizeMultiplier = 1;
TextInputComponent.defaultProps.allowFontScaling = false;
TextInputComponent.defaultProps.maxFontSizeMultiplier = 1;

const AppContent: React.FC = () => {
  // Check geofencing on app mount
  const {isInsideZone, currentZone} = useGeofencing(true);

  useEffect(() => {
    // Yahan aap log store kare sakte ho ya screen navigate kar sakte ho
    if (!isInsideZone && currentZone) {
      console.log(`User outside delivery zone. Closest: ${currentZone.name}`);
    }
  }, [isInsideZone, currentZone]);

  return <AppNavigator />;
};

const App: React.FC = () => {
  return (
    <SafeAreaProvider>
      <RiderAuthProvider>
        <AppContent />
      </RiderAuthProvider>
    </SafeAreaProvider>
  );
};

export default App;
