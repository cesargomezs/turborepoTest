import React from 'react';
import { Text, View } from 'react-native';

export default function App() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'red' }}>
      <Text style={{ color: 'white', fontSize: 25 }}>If you see red, the app is working!</Text>
      <Text style={{ color: 'white', fontSize: 25 }}>If you see red, the app is working....!</Text>
      <Text style={{ color: 'white', fontSize: 25 }}>If you see red, the app is working....!</Text>
      <Text style={{ color: 'white', fontSize: 25 }}>If you see red, the app is working....!</Text>
      <Text style={{ color: 'white', fontSize: 25 }}>If you see red, the app is working....!</Text>
      <Text className="mb-24 text-base italic">
              "Crear comunidades más unidas, participativas y solidarias, donde
              cada residente se sienta conectado, seguro y orgulloso de su
              barrio."
            </Text>
    
    </View>
  );
}