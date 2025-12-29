import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Button, Icon, useTheme } from 'react-native-paper';
import { useStore } from '../store/useStore';
import * as auth from '../utils/auth';
import * as LocalAuthentication from 'expo-local-authentication';

export const LockScreen = () => {
    const theme = useTheme();
    const { setLocked, isBiometricEnabled } = useStore();
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isBiometricEnabled) {
            handleBiometricAuth();
        }
    }, [isBiometricEnabled]);

    const handleBiometricAuth = async () => {
        const success = await auth.authenticateBiometric();
        if (success) {
            setLocked(false);
        }
    };

    const handlePress = (key: string) => {
        if (key === 'backspace') {
            setPin(prev => prev.slice(0, -1));
            setError('');
        } else if (pin.length < 4) {
            const newPin = pin + key;
            setPin(newPin);
            if (newPin.length === 4) {
                validatePin(newPin);
            }
        }
    };

    const validatePin = async (inputPin: string) => {
        const isValid = await auth.checkPin(inputPin);
        if (isValid) {
            setLocked(false);
        } else {
            setError('Incorrect PIN');
            setPin('');
        }
    };

    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'backspace'];

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.content}>
                <Icon source="lock" size={64} color={theme.colors.primary} />
                <Text variant="headlineMedium" style={{ marginTop: 20 }}>Enter PIN</Text>
                
                <View style={styles.dotsContainer}>
                    {[0, 1, 2, 3].map(i => (
                        <View 
                            key={i} 
                            style={[
                                styles.dot, 
                                { 
                                    backgroundColor: i < pin.length ? theme.colors.primary : theme.colors.surfaceVariant,
                                    borderColor: error ? theme.colors.error : 'transparent',
                                    borderWidth: error ? 1 : 0
                                }
                            ]} 
                        />
                    ))}
                </View>

                {error ? <Text style={{ color: theme.colors.error, marginTop: 10 }}>{error}</Text> : null}

                <View style={styles.keypad}>
                    {keys.map((key, index) => (
                        <View key={index} style={styles.keyWrapper}>
                            {key === 'backspace' ? (
                                <TouchableOpacity onPress={() => handlePress('backspace')} style={styles.key}>
                                    <Icon source="backspace-outline" size={24} color={theme.colors.onSurface} />
                                </TouchableOpacity>
                            ) : key !== '' ? (
                                <TouchableOpacity onPress={() => handlePress(key)} style={styles.key}>
                                    <Text variant="headlineSmall">{key}</Text>
                                </TouchableOpacity>
                            ) : (
                                isBiometricEnabled && (
                                    <TouchableOpacity onPress={handleBiometricAuth} style={styles.key}>
                                        <Icon source="fingerprint" size={32} color={theme.colors.primary} />
                                    </TouchableOpacity>
                                )
                            )}
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { alignItems: 'center', width: '100%' },
    dotsContainer: { flexDirection: 'row', marginTop: 30, gap: 20 },
    dot: { width: 20, height: 20, borderRadius: 10 },
    keypad: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 50, width: 280, justifyContent: 'center' },
    keyWrapper: { width: 80, height: 80, justifyContent: 'center', alignItems: 'center', margin: 5 },
    key: { 
        width: 70, 
        height: 70, 
        borderRadius: 35, 
        backgroundColor: '#e0e0e0', // Light gray for keys
        justifyContent: 'center', 
        alignItems: 'center',
        elevation: 2
    }
});
