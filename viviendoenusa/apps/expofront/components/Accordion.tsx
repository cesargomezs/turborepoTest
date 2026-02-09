import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import { ThemedText } from './ThemedText';
import { useTheme } from '@react-navigation/native';
import { cn } from '../utils/twcn';

const Accordion = ({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) => {
  const [expanded, setExpanded] = useState(false);
  const { dark } = useTheme();
  const animatedController = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedController, {
      toValue: expanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false, 
    }).start();
  }, [expanded]);

  const toggleAccordion = () => {
    setExpanded(!expanded);
  };

  const arrowAngle = animatedController.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View 
      className={cn(
        "border rounded-2xl mb-4 overflow-hidden",
        dark ? "border-white/20 bg-white/5" : "border-black/10 bg-black/5",
        className
      )}
    >
      <TouchableOpacity 
        className="flex-row justify-between items-center p-4" 
        onPress={toggleAccordion}
        activeOpacity={0.7}
      >
        <ThemedText type="defaultSemiBold" className="text-lg">
          {title}
        </ThemedText>
        <Animated.View style={{ transform: [{ rotate: arrowAngle }] }}>
          <Icon
            name="expand-more"
            size={24}
            color={dark ? 'white' : 'black'}
          />
        </Animated.View>
      </TouchableOpacity>

      <Animated.View
        style={{
          maxHeight: animatedController.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 500],
          }),
          opacity: animatedController,
          overflow: 'hidden',
        }}
      >
        <View className="p-4 pt-0 bg-transparent">
          {children}
        </View>
      </Animated.View>
    </View>
  );
};

export default Accordion;