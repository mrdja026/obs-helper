import Colors from '@/constants/Colors';
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type ConnectionStatusProps = {
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  error: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  syncing?: boolean;
  needsReauth?: boolean;
};

export default function ConnectionStatus({
  isConnected,
  isConnecting,
  isReconnecting,
  error,
  onConnect,
  onDisconnect,
  syncing,
  needsReauth,
}: ConnectionStatusProps) {
  const getStatusColor = () => {
    if (error || needsReauth) return Colors.error;
    if (isConnected) return Colors.success;
    return Colors.warning;
  };

  const getStatusText = () => {
    if (needsReauth) return 'Needs Re-auth';
    if (error) return 'Connection Error';
    if (syncing) return 'Syncing…';
    if (isReconnecting) return 'Reconnecting...';
    if (isConnecting) return 'Connecting...';
    if (isConnected) return 'Connected';
    return 'Disconnected';
  };

  return (
    <View style={styles.container}>
      <View style={[styles.statusContainer, { borderColor: getStatusColor() }]}>
        <View
          style={[styles.indicator, { backgroundColor: getStatusColor() }]}
        />

        <View style={styles.statusTextContainer}>
          <Text style={styles.statusText}>{getStatusText()}</Text>
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        {syncing || isConnecting || isReconnecting ? (
          <ActivityIndicator size="small" color={Colors.accent} />
        ) : (
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: isConnected ? Colors.error : Colors.primary },
            ]}
            onPress={isConnected ? onDisconnect : onConnect}
          >
            {isConnected ? (
              <MaterialIcons name="wifi-off" size={16} color={Colors.text} />
            ) : (
              <MaterialIcons name="wifi" size={16} color={Colors.text} />
            )}
            <Text style={styles.actionButtonText}>
              {isConnected ? 'Disconnect' : 'Connect'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 0,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  indicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusText: {
    fontFamily: 'Roboto-Medium',
    fontSize: 14,
    color: Colors.text,
  },
  errorText: {
    fontFamily: 'Roboto-Regular',
    fontSize: 12,
    color: Colors.error,
    marginTop: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
  actionButtonText: {
    fontFamily: 'Roboto-Medium',
    fontSize: 12,
    color: Colors.text,
    marginLeft: 6,
  },
});
