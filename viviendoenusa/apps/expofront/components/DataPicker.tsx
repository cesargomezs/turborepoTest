import React, { useState } from 'react';
import { TouchableOpacity, View, Platform, StyleSheet } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { IconSymbol } from './ui/IconSymbol'; // Ajusta la ruta si es necesario
import { ThemedText } from './ThemedText';
import { useColorScheme } from '../hooks/useColorScheme';

export default function DataPicker({
  date,
  setDate,
  label = "Birthdate"
}: {
  date: Date;
  setDate: (date: Date) => void;
  label?: string;
}) {
  const theme = useColorScheme() ?? 'light';
  const [showAndroid, setShowAndroid] = useState(false);

  const onChange = (event: DateTimePickerEvent, selectedDate?: Date) => {

    if (Platform.OS === 'android') {
      setShowAndroid(false);
    }
    
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  return (
    <View className="flex flex-row items-center justify-between py-2 border-b border-white/10">
      <ThemedText type="defaultSemiBold">{label}</ThemedText>
      
      <View className="flex-row items-center">
        {Platform.OS === 'ios' && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={onChange}
            themeVariant={theme}
            style={styles.iosPicker}
          />
        )}

        {Platform.OS === 'android' && (
          <>
            <TouchableOpacity 
              onPress={() => setShowAndroid(true)}
              className="flex-row items-center gap-2 bg-white/10 px-3 py-2 rounded-lg"
            >
              <ThemedText>{date.toLocaleDateString()}</ThemedText>
              <IconSymbol name="calendar" color={theme === 'dark' ? '#fff' : '#000'} size={24} />
            </TouchableOpacity>
            
            {showAndroid && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={onChange}
              />
            )}
          </>
        )}

        {Platform.OS === 'web' && (
           <input 
            type="date" 
            value={date.toISOString().split('T')[0]}
            onChange={(e) => setDate(new Date(e.target.value))}
            style={{
              background: 'transparent',
              color: theme === 'dark' ? 'white' : 'black',
              border: 'none',
              fontSize: 16
            }}
           />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  iosPicker: {
    width: 120, 
    height: 40,
  }
});