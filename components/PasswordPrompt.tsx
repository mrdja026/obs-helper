import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Switch,
} from 'react-native';
import Colors from '@/constants/Colors';

interface PasswordPromptProps {
    visible: boolean;
    onSave: (password: string, remember: boolean) => void;
    onCancel: () => void;
    initialPassword?: string;
    error?: string;
}

export default function PasswordPrompt({
    visible,
    onSave,
    onCancel,
    initialPassword = '',
    error,
}: PasswordPromptProps) {
    const [password, setPassword] = useState(initialPassword);
    const [remember, setRemember] = useState(true);

    const handleSave = () => {
        onSave(password, remember);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <Text style={styles.title}>OBS Password Required</Text>

                    {error && (
                        <Text style={styles.error}>{error}</Text>
                    )}

                    <Text style={styles.description}>
                        Please enter the password for your OBS WebSocket connection.
                    </Text>

                    <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Enter password"
                        placeholderTextColor={Colors.textSecondary}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                    />

                    <View style={styles.switchContainer}>
                        <Text style={styles.switchLabel}>Remember password</Text>
                        <Switch
                            value={remember}
                            onValueChange={setRemember}
                            trackColor={{ false: Colors.backgroundLight, true: Colors.primaryDark }}
                            thumbColor={remember ? Colors.primary : Colors.textSecondary}
                        />
                    </View>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton]}
                            onPress={onCancel}
                        >
                            <Text style={styles.buttonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.button, styles.saveButton]}
                            onPress={handleSave}
                        >
                            <Text style={styles.buttonText}>Connect</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        backgroundColor: Colors.background,
        borderRadius: 12,
        padding: 24,
        width: '90%',
        maxWidth: 400,
    },
    title: {
        fontFamily: 'Orbitron-Bold',
        fontSize: 20,
        color: Colors.text,
        marginBottom: 16,
        textAlign: 'center',
    },
    description: {
        fontFamily: 'Roboto-Regular',
        fontSize: 16,
        color: Colors.textSecondary,
        marginBottom: 24,
        textAlign: 'center',
    },
    input: {
        backgroundColor: Colors.backgroundLight,
        borderRadius: 8,
        padding: 16,
        color: Colors.text,
        fontFamily: 'Roboto-Regular',
        fontSize: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: 16,
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    switchLabel: {
        fontFamily: 'Roboto-Medium',
        fontSize: 16,
        color: Colors.text,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 16,
    },
    button: {
        flex: 1,
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: Colors.backgroundLight,
    },
    saveButton: {
        backgroundColor: Colors.primary,
    },
    buttonText: {
        fontFamily: 'Roboto-Bold',
        fontSize: 16,
        color: Colors.text,
    },
    error: {
        fontFamily: 'Roboto-Medium',
        fontSize: 14,
        color: '#FF4444',
        marginBottom: 16,
        textAlign: 'center',
    },
}); 