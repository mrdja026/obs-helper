import { useOBSProxy } from '@/hooks/useOBSProxy';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type QueueItem =
  | { kind: 'follow'; name: string }
  | { kind: 'sub'; name: string };

export const NotificationOverlay: React.FC = () => {
  const {
    /* chatMessages unused, */
  } = useOBSProxy();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [active, setActive] = useState<QueueItem | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-10)).current;

  // WS handling is done in useOBSProxy; extend there to push to some external mechanism.
  // For now, this component exposes setters via a global handler if needed.
  useEffect(() => {
    (global as any).__pushOverlayNotification = (item: QueueItem) => {
      setQueue((q) => [...q, item].slice(-5));
    };
    return () => {
      delete (global as any).__pushOverlayNotification;
    };
  }, []);

  useEffect(() => {
    if (!active && queue.length > 0) {
      setActive(queue[0]);
      setQueue((q) => q.slice(1));
    }
  }, [active, queue]);

  useEffect(() => {
    if (!active) return;
    opacity.setValue(0);
    translateY.setValue(-10);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();

    const timeout = setTimeout(
      () => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -10,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => setActive(null));
      },
      active.kind === 'follow' ? 4500 : 5000
    );

    return () => clearTimeout(timeout);
  }, [active]);

  if (!active) return null;

  return (
    <View pointerEvents="none" style={styles.root}>
      <Animated.View
        style={[
          styles.card,
          {
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <Text style={styles.title} numberOfLines={2}>
          {active.kind === 'follow'
            ? `Thank you for the follow: ${active.name}`
            : `Thank you for the sub: ${active.name}`}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  card: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(20,20,20,0.8)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
