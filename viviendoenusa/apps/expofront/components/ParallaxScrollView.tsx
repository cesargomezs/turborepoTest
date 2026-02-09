import type { PropsWithChildren, ReactElement } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useScrollViewOffset,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

import { ThemedView } from '../components/ThemedView';
import { useBottomTabOverflow } from '../components/ui/TabBarBackground';

import { useColorScheme } from '../hooks/useColorScheme';
import { cn } from '../utils/twcn';


const HEADER_HEIGHT = 250;

type Props = PropsWithChildren<{
  headerImage: ReactElement;
  headerBackgroundColor: { dark: string; light: string };
  className?: string;
}>;

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
  className,
}: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollViewOffset(scrollRef);
  const bottom = useBottomTabOverflow();

  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(
            scrollOffset.value,
            [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
            [-HEADER_HEIGHT / 2, 0, HEADER_HEIGHT * 0.75]
          ),
        },
        {
          scale: interpolate(
            scrollOffset.value,
            [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
            [2, 1, 1]
          ),
        },
      ],
    };
  });

  return (
    <View className="flex-1 bg-transparent">
      <Animated.ScrollView
        removeClippedSubviews={Platform.OS === 'android'}
        ref={scrollRef}
        scrollEventThrottle={16}
        scrollIndicatorInsets={{ bottom }}
        contentContainerStyle={{ paddingBottom: bottom + 20 }}
        className="bg-transparent"
      >
        <Animated.View
          style={[
            styles.header,
            { backgroundColor: headerBackgroundColor[colorScheme] },
            headerAnimatedStyle,
          ]}
        >
          {headerImage}
        </Animated.View>

        <View style={styles.containerRelative}>
          <BlurView
            intensity={Platform.OS === 'ios' ? 45 : 80}
            tint={colorScheme === 'dark' ? 'dark' : 'light'}
            style={[StyleSheet.absoluteFill, styles.blurRadius]}
          />
          
          <ThemedView 
            className={cn(
              "flex-1 p-8 gap-4 bg-transparent", 
              className
            )}
            style={styles.content}
          >
            {children}
          </ThemedView>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: HEADER_HEIGHT,
    overflow: 'hidden',
  },
  containerRelative: {
    marginTop: -32, 
    flex: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  blurRadius: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  content: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
});