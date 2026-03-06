import React from 'react';
import {Text, TextInput} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {RiderAuthProvider} from './src/context/RiderAuthContext';
import {AppNavigator} from './src/navigation/AppNavigator';

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
