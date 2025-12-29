import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

const PIN_KEY = 'user_pin';
const BIOMETRIC_KEY = 'biometric_enabled';

export const setPin = async (pin: string) => {
    await SecureStore.setItemAsync(PIN_KEY, pin);
};

export const checkPin = async (pin: string) => {
    const storedPin = await SecureStore.getItemAsync(PIN_KEY);
    return storedPin === pin;
};

export const hasPin = async () => {
    const pin = await SecureStore.getItemAsync(PIN_KEY);
    return !!pin;
};

export const deletePin = async () => {
    await SecureStore.deleteItemAsync(PIN_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_KEY);
};

export const enableBiometric = async () => {
    await SecureStore.setItemAsync(BIOMETRIC_KEY, 'true');
};

export const disableBiometric = async () => {
    await SecureStore.deleteItemAsync(BIOMETRIC_KEY);
};

export const isBiometricEnabled = async () => {
    const enabled = await SecureStore.getItemAsync(BIOMETRIC_KEY);
    return enabled === 'true';
};

export const authenticateBiometric = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) return false;

    const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock with Biometrics',
        fallbackLabel: 'Use PIN',
    });

    return result.success;
};
