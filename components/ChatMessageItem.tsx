import Colors from '@/constants/Colors';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type ChatUser = {
  id: string;
  username: string;
  displayName: string;
  color?: string;
  isMod?: boolean;
  isSubscriber?: boolean;
  isVip?: boolean;
};

export type ChatMessageItemProps = {
  id: string;
  text: string;
  channel: string;
  user: ChatUser;
  timestamp: string;
  isAction?: boolean;
  isHighlighted?: boolean;
};

export default function ChatMessageItem({ user, text, isAction, isHighlighted }: ChatMessageItemProps) {
  const usernameColor = user.color && /^#([0-9a-f]{3}){1,2}$/i.test(user.color)
    ? user.color
    : Colors.secondary;

  return (
    <View style={[styles.container, isHighlighted ? styles.highlighted : null]}>
      <View style={styles.headerRow}>
        <Text style={[styles.username, { color: usernameColor }]} numberOfLines={1}>
          {user.displayName || user.username}
        </Text>
        <View style={styles.badgesRow}>
          {user.isMod ? <Badge label="MOD" color={Colors.secondary} /> : null}
          {user.isSubscriber ? <Badge label="SUB" color={Colors.primary} /> : null}
          {user.isVip ? <Badge label="VIP" color={Colors.accent} /> : null}
        </View>
      </View>
      <Text style={[styles.message, isAction ? styles.action : null]}>{text}</Text>
    </View>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.badge, { borderColor: color, backgroundColor: 'rgba(255,255,255,0.04)' }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.cardDark,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  highlighted: {
    borderColor: Colors.secondary,
    backgroundColor: 'rgba(3, 218, 198, 0.08)'
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  username: {
    fontFamily: 'Orbitron-Bold',
    fontSize: 14,
    maxWidth: '60%',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgeText: {
    fontFamily: 'Roboto-Bold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  message: {
    fontFamily: 'Roboto-Regular',
    color: Colors.text,
    fontSize: 14,
    lineHeight: 18,
  },
  action: {
    fontStyle: 'italic',
    opacity: 0.95,
  },
});


