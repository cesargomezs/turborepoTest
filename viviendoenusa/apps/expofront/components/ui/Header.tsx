import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';
import { cn } from '../../utils/twcn';
import { ThemedText } from '../ThemedText';

export default function Header({ title }: { title?: string }) {
  const theme = useColorScheme() ?? 'light';
  return (
    <BlurView
      className={cn('w-full h-48 flex justify-end pb-1 px-8')}
      tint="systemChromeMaterial"
      intensity={100}
      style={StyleSheet.absoluteFill}
    >
      <View className="flex-row items-center justify-between">
        <View className='flex-row items-center gap-6'>
          <View className="w-20 h-20">
            <Image
              source={require('../../assets/images/cesar.webp')}
              className="rounded-full"
              style={{ width: '100%', height: '100%', borderRadius: 50 }}
            />
          </View>
          <ThemedText className="text-3xl">Hola, Cesar</ThemedText>
        </View>
        <MaterialCommunityIcons
          size={36}
          color={Colors[theme].text}
          name="translate"
        />
      </View>
      <Text
        className="text-center text-2xl"
        style={{ color: Colors[theme].tabIconDefault }}
      >
        {title}
      </Text>
    </BlurView>
  );
}
