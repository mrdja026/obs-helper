import Colors from '@/constants/Colors';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';

type SceneButtonProps = {
  name: string;
  isActive: boolean;
  onPress: () => void;
  isLast?: boolean;
};

export default function SceneButton({
  name,
  isActive,
  onPress,
  isLast = false,
}: SceneButtonProps) {
  const activeBorderOpacity = useRef(
    new Animated.Value(isActive ? 1 : 0)
  ).current;
  const backgroundColorValue = useRef(
    new Animated.Value(isActive ? 1 : 0)
  ).current;

  // Update animation values when active state changes
  useEffect(() => {
    Animated.timing(activeBorderOpacity, {
      toValue: isActive ? 1 : 0,
      duration: 300,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: true,
    }).start();

    Animated.timing(backgroundColorValue, {
      toValue: isActive ? 1 : 0,
      duration: 300,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: false,
    }).start();
  }, [isActive, activeBorderOpacity, backgroundColorValue]);

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress();
  };

  const animatedBorderStyle = {
    opacity: activeBorderOpacity,
  } as const;

  const backgroundColor = backgroundColorValue.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.cardDark, Colors.primaryDark],
  });
  const animatedBackgroundStyle = { backgroundColor } as const;

  return (
    <Animated.View
      style={[
        styles.container,
        animatedBackgroundStyle,
        isLast ? null : styles.marginBottom,
      ]}
    >
      <TouchableOpacity
        style={styles.button}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Text style={[styles.sceneName, isActive && styles.sceneNameActive]}>
          {name}
        </Text>

        {isActive && <Text style={styles.activeIndicator}>ACTIVE</Text>}
      </TouchableOpacity>

      <Animated.View style={[styles.borderContainer, animatedBorderStyle]}>
        <LinearGradient
          colors={[Colors.accent, Colors.primary, Colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientBorder}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    position: 'relative',
  },
  marginBottom: {
    marginBottom: 16,
  },
  button: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sceneName: {
    fontFamily: 'Orbitron-Medium',
    fontSize: 16,
    color: Colors.text,
    letterSpacing: 0.5,
  },
  sceneNameActive: {
    color: Colors.text,
  },
  activeIndicator: {
    fontFamily: 'Roboto-Bold',
    fontSize: 12,
    color: Colors.secondary,
    backgroundColor: 'rgba(3, 218, 198, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: 'hidden',
    letterSpacing: 0.5,
  },
  borderContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
  },
  gradientBorder: {
    height: '100%',
    width: '100%',
  },
});
