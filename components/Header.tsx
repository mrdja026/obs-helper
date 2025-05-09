import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/Colors';

type HeaderProps = {
  title: string;
};

export default function Header({ title }: HeaderProps) {
  return (
    <View style={styles.headerContainer}>
      <LinearGradient
        colors={[Colors.backgroundDark, 'transparent']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.titleAccent} />
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    height: 80,
    width: '100%',
  },
  headerGradient: {
    height: '100%',
    width: '100%',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Orbitron-Bold',
    fontSize: 20,
    color: Colors.text,
    letterSpacing: 1,
    marginRight: 8,
  },
  titleAccent: {
    height: 4,
    width: 24,
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
});