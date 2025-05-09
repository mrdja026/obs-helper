import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/Colors';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';

type SceneButtonProps = {
  name: string;
  isActive: boolean;
  onPress: () => void;
  isLast?: boolean;
};

export default function SceneButton({ name, isActive, onPress, isLast = false }: SceneButtonProps) {
  const activeBorderOpacity = useSharedValue(isActive ? 1 : 0);
  const backgroundColorValue = useSharedValue(isActive ? 1 : 0);
  
  // Update animation values when active state changes
  useEffect(() => {
    activeBorderOpacity.value = withTiming(isActive ? 1 : 0, {
      duration: 300,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    
    backgroundColorValue.value = withTiming(isActive ? 1 : 0, {
      duration: 300,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [isActive]);
  
  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress();
  };
  
  const animatedBorderStyle = useAnimatedStyle(() => {
    return {
      opacity: activeBorderOpacity.value,
    };
  });
  
  const animatedBackgroundStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      backgroundColorValue.value,
      [0, 1],
      [Colors.cardDark, Colors.primaryDark]
    );
    
    return {
      backgroundColor,
    };
  });

  return (
    <Animated.View style={[
      styles.container, 
      animatedBackgroundStyle,
      isLast ? null : styles.marginBottom
    ]}>
      <TouchableOpacity 
        style={styles.button}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.sceneName,
          isActive && styles.sceneNameActive
        ]}>
          {name}
        </Text>
        
        {isActive && (
          <Text style={styles.activeIndicator}>ACTIVE</Text>
        )}
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