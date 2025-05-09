import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Switch, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useOBSProxy } from '../hooks/useOBSProxy';
import PasswordPrompt from '../components/PasswordPrompt';

export default function SettingsScreen() {
    const {
        obsUrl,
        setObsUrl,
        obsPassword,
        setObsPassword,
        autoConnect,
        setAutoConnect,
        isConnected,
        isConnecting,
        connectionError,
        connect,
        disconnect,
        showPasswordPrompt,
        passwordPromptError,
        handlePasswordSave,
        handlePasswordCancel,
    } = useOBSProxy();

    const [isSaving, setIsSaving] = useState(false);

    const handleUrlChange = (text: string) => {
        setIsSaving(true);
        setObsUrl(text);
        // Reset saving state after a delay
        setTimeout(() => setIsSaving(false), 1000);
    };

    const handlePasswordChange = (text: string) => {
        setIsSaving(true);
        setObsPassword(text);
        // Reset saving state after a delay
        setTimeout(() => setIsSaving(false), 1000);
    };

    const handleAutoConnectChange = (value: boolean) => {
        setIsSaving(true);
        setAutoConnect(value);
        // Reset saving state after a delay
        setTimeout(() => setIsSaving(false), 1000);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>OBS Connection Settings</Text>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>OBS Host:</Text>
                <View style={styles.inputWrapper}>
                    <TextInput
                        style={styles.input}
                        value={obsUrl}
                        onChangeText={handleUrlChange}
                        placeholder="127.0.0.1:4456"
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!isConnecting}
                    />
                    {isSaving && <ActivityIndicator style={styles.savingIndicator} />}
                </View>
                <Text style={styles.helperText}>
                    Enter OBS WebSocket server address (e.g., 127.0.0.1:4456)
                </Text>
            </View>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>Password:</Text>
                <View style={styles.inputWrapper}>
                    <TextInput
                        style={styles.input}
                        value={obsPassword}
                        onChangeText={handlePasswordChange}
                        placeholder="OBS WebSocket password"
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!isConnecting}
                    />
                    {isSaving && <ActivityIndicator style={styles.savingIndicator} />}
                </View>
            </View>

            <View style={styles.switchContainer}>
                <Text style={styles.label}>Auto-connect on startup:</Text>
                <View style={styles.switchWrapper}>
                    <Switch
                        value={autoConnect}
                        onValueChange={handleAutoConnectChange}
                        disabled={isConnecting}
                    />
                    {isSaving && <ActivityIndicator style={styles.savingIndicator} />}
                </View>
            </View>

            {connectionError && (
                <Text style={styles.errorText}>{connectionError}</Text>
            )}

            <TouchableOpacity
                style={[styles.button, isConnected ? styles.disconnectButton : styles.connectButton]}
                onPress={isConnected ? disconnect : connect}
                disabled={isConnecting}
            >
                {isConnecting ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>
                        {isConnected ? 'Disconnect' : 'Connect'}
                    </Text>
                )}
            </TouchableOpacity>

            <PasswordPrompt
                visible={showPasswordPrompt}
                onSave={handlePasswordSave}
                onCancel={handlePasswordCancel}
                initialPassword={obsPassword}
                error={passwordPromptError || undefined}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    inputContainer: {
        marginBottom: 15,
    },
    label: {
        fontSize: 16,
        marginBottom: 5,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        fontSize: 16,
    },
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    switchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    button: {
        padding: 15,
        borderRadius: 5,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 50,
    },
    connectButton: {
        backgroundColor: '#4CAF50',
    },
    disconnectButton: {
        backgroundColor: '#f44336',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    errorText: {
        color: '#f44336',
        marginBottom: 15,
    },
    savingIndicator: {
        marginLeft: 10,
    },
    helperText: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
        fontStyle: 'italic',
    },
}); 