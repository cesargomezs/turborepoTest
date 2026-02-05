import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons'; // Or any icon library
import { ThemedText } from './ThemedText';
import { useTheme } from '@react-navigation/native';

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
  const animation = new Animated.Value(0);
  const { dark } = useTheme();

  const toggleAccordion = () => {
    setExpanded(!expanded);
  };

  const contentHeight = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200], // Adjust the maximum height as needed
  });

  return (
    <View className={`border border-gray-300 rounded-lg m-2 z-500 overflow-hidden ${className}`}>
      <TouchableOpacity className="flex-row justify-between items-center p-2" onPress={toggleAccordion}>
        <ThemedText style={styles.headerText}>{title}</ThemedText>
        <Icon
          name={expanded ? 'expand-less' : 'expand-more'}
          size={24}
          color={dark ? 'white' : 'black'}
        />
      </TouchableOpacity>
      <View style={[styles.content, { height: contentHeight }]}>
        {expanded && <View style={styles.contentInner}>{children}</View>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    zIndex: 100,
    margin: 10,
    overflow: 'hidden', // Important for hiding content when collapsed
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
  },
  headerText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    overflow: 'hidden',
  },
  contentInner: {
    padding: 10,
  },
});

export default Accordion;
