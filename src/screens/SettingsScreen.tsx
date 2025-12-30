import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { List, Button, Divider, Text, TextInput, Portal, Dialog, RadioButton, Chip, Switch, Surface, Avatar, Appbar, useTheme } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import { exportDataToJSON, importDataFromJSON, exportDataToCSV } from '../db/backup';
import { resetDatabase } from '../db/repo';
import { useStore } from '../store/useStore';
import * as auth from '../utils/auth';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../utils/colors';

export const SettingsScreen = () => {
    const { refreshData, currency, setCurrency, hasPin, isBiometricEnabled, updateAuthSettings } = useStore();
    const navigation = useNavigation();
    const theme = useTheme();
    const [currencyDialogVisible, setCurrencyDialogVisible] = useState(false);
    const [tempCurrency, setTempCurrency] = useState(currency);

    // Auth State
    const [pinDialogVisible, setPinDialogVisible] = useState(false);
    const [pinStep, setPinStep] = useState<'create' | 'confirm' | 'enter_old' | 'enter_new' | 'remove'>('create');
    const [pinInput, setPinInput] = useState('');
    const [pinError, setPinError] = useState('');
    const [tempPin, setTempPin] = useState('');

    // Backup/Restore State
    const [passwordDialogVisible, setPasswordDialogVisible] = useState(false);
    const [password, setPassword] = useState('');
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [backupFilename, setBackupFilename] = useState('');
    const [backupMode, setBackupMode] = useState<'export' | 'import' | null>(null);
    const [selectedFileUri, setSelectedFileUri] = useState<string | null>(null);

    const showCurrencyDialog = () => {
        setTempCurrency(currency);
        setCurrencyDialogVisible(true);
    };
    const hideCurrencyDialog = () => setCurrencyDialogVisible(false);

    const handleCurrencySave = () => {
        setCurrency(tempCurrency);
        hideCurrencyDialog();
    };

    const handleSetPinPress = () => {
        setPinStep('create');
        setPinInput('');
        setPinError('');
        setTempPin('');
        setPinDialogVisible(true);
    };

    const handleChangePinPress = () => {
        setPinStep('enter_old');
        setPinInput('');
        setPinError('');
        setTempPin('');
        setPinDialogVisible(true);
    };

    const handleRemovePinPress = () => {
        setPinStep('remove');
        setPinInput('');
        setPinError('');
        setPinDialogVisible(true);
    };

    const handleBiometricToggle = async () => {
        if (isBiometricEnabled) {
            await auth.disableBiometric();
        } else {
            const success = await auth.authenticateBiometric();
            if (success) {
                await auth.enableBiometric();
            } else {
                Alert.alert('Error', 'Biometric authentication failed');
                return;
            }
        }
        updateAuthSettings();
    };

    const handlePinSubmit = async () => {
        if (pinInput.length !== 4) {
            setPinError('PIN must be 4 digits');
            return;
        }

        if (pinStep === 'create') {
            setTempPin(pinInput);
            setPinStep('confirm');
            setPinInput('');
            setPinError('');
        } else if (pinStep === 'confirm') {
            if (pinInput === tempPin) {
                await auth.setPin(pinInput);
                await updateAuthSettings();
                setPinDialogVisible(false);
                Alert.alert('Success', 'PIN set successfully');
            } else {
                setPinError('PINs do not match');
            }
        } else if (pinStep === 'enter_old') {
            const isValid = await auth.checkPin(pinInput);
            if (isValid) {
                setPinStep('enter_new');
                setPinInput('');
                setPinError('');
            } else {
                setPinError('Incorrect PIN');
            }
        } else if (pinStep === 'enter_new') {
            setTempPin(pinInput);
            setPinStep('confirm');
            setPinInput('');
            setPinError('');
        } else if (pinStep === 'remove') {
            const isValid = await auth.checkPin(pinInput);
            if (isValid) {
                await auth.deletePin();
                await updateAuthSettings();
                setPinDialogVisible(false);
                Alert.alert('Success', 'PIN removed successfully');
            } else {
                setPinError('Incorrect PIN');
            }
        }
    };

    const handleExportPress = () => {
        setBackupMode('export');
        setPassword('');
        setPasswordVisible(false);
        setBackupFilename(`backup_${new Date().toISOString().split('T')[0]}`);
        setPasswordDialogVisible(true);
    };

    const handleImportPress = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                copyToCacheDirectory: true
            });

            if (result.canceled) return;

            // Check extension (optional, but good UX)
            // if (!result.assets[0].name.endsWith('.enc')) { ... }

            setSelectedFileUri(result.assets[0].uri);
            setBackupMode('import');
            setPassword('');
            setPasswordVisible(false);
            setPasswordDialogVisible(true);
        } catch (err) {
            Alert.alert('Error', 'Failed to pick file');
        }
    };

    const handleCSVExport = async () => {
        try {
            await exportDataToCSV();
        } catch (error) {
            Alert.alert('Error', 'Failed to export CSV');
        }
    };

    const executeBackupAction = async () => {
        if (!password) {
            Alert.alert('Error', 'Password is required');
            return;
        }

        setPasswordDialogVisible(false);

        if (backupMode === 'export') {
            try {
                const success = await exportDataToJSON(password, backupFilename);
                if (success) {
                    // Success is usually handled by the share dialog appearing
                }
            } catch (error) {
                Alert.alert('Error', 'Backup failed');
            }
        } else if (backupMode === 'import' && selectedFileUri) {
            try {
                const success = await importDataFromJSON(selectedFileUri, password);
                if (success) {
                    refreshData();
                    Alert.alert('Success', 'Data restored successfully!');
                }
            } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to restore data');
            }
        }
    };

    const handleResetPress = () => {
        Alert.alert(
            'Reset App',
            'Are you sure you want to delete ALL data? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        resetDatabase();
                        refreshData();
                        Alert.alert('Success', 'App has been reset to factory settings.');
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingLeft: 16 }}>
                    <Text variant="headlineMedium" style={{ fontWeight: 'bold' }}>Settings</Text>
                </View>

                <Text variant="labelLarge" style={styles.sectionTitle}>GENERAL</Text>
                <Surface style={styles.sectionCard} elevation={0}>
                    <List.Item
                        title="Currency"
                        description={`Current: ${currency}`}
                        left={() => <Avatar.Icon icon="currency-usd" size={40} style={{ backgroundColor: theme.colors.secondaryContainer }} color={theme.colors.onSecondaryContainer} />}
                        right={props => <List.Icon {...props} icon="chevron-right" />}
                        onPress={showCurrencyDialog}
                        style={styles.listItem}
                    />
                </Surface>

                <Text variant="labelLarge" style={styles.sectionTitle}>SECURITY</Text>
                <Surface style={styles.sectionCard} elevation={0}>
                    {!hasPin ? (
                        <List.Item
                            title="Set PIN"
                            description="Secure app with a 4-digit PIN"
                            left={() => <Avatar.Icon icon="lock-plus" size={40} style={{ backgroundColor: theme.colors.primaryContainer }} color={theme.colors.primary} />}
                            right={props => <List.Icon {...props} icon="chevron-right" />}
                            onPress={handleSetPinPress}
                            style={styles.listItem}
                        />
                    ) : (
                        <>
                            <List.Item
                                title="Change PIN"
                                description="Update your current PIN"
                                left={() => <Avatar.Icon icon="lock-reset" size={40} style={{ backgroundColor: theme.colors.secondaryContainer }} color={theme.colors.onSecondaryContainer} />}
                                right={props => <List.Icon {...props} icon="chevron-right" />}
                                onPress={handleChangePinPress}
                                style={styles.listItem}
                            />
                            <Divider style={styles.divider} />
                            <List.Item
                                title="Biometric Unlock"
                                description="Use Fingerprint/FaceID"
                                left={() => <Avatar.Icon icon="fingerprint" size={40} style={{ backgroundColor: theme.colors.secondaryContainer }} color={theme.colors.onSecondaryContainer} />}
                                right={() => <Switch value={isBiometricEnabled} onValueChange={handleBiometricToggle} style={{ marginRight: 10 }} />}
                                style={styles.listItem}
                            />
                            <Divider style={styles.divider} />
                            <List.Item
                                title="Remove PIN"
                                description="Disable app security"
                                left={() => <Avatar.Icon icon="lock-remove" size={40} style={{ backgroundColor: theme.colors.errorContainer }} color={theme.colors.error} />}
                                onPress={handleRemovePinPress}
                                titleStyle={{ color: theme.colors.error }}
                                style={styles.listItem}
                            />
                        </>
                    )}
                </Surface>

                <Text variant="labelLarge" style={styles.sectionTitle}>DATA MANAGEMENT</Text>
                <Surface style={styles.sectionCard} elevation={0}>
                    <List.Item
                        title="Export Backup"
                        description="Save data to JSON file"
                        left={() => <Avatar.Icon icon="database-export" size={40} style={{ backgroundColor: theme.colors.secondaryContainer }} color={theme.colors.onSecondaryContainer} />}
                        onPress={handleExportPress}
                        style={styles.listItem}
                    />
                    <Divider style={styles.divider} />
                    <List.Item
                        title="Import Backup"
                        description="Restore from JSON file"
                        left={() => <Avatar.Icon icon="database-import" size={40} style={{ backgroundColor: theme.colors.secondaryContainer }} color={theme.colors.onSecondaryContainer} />}
                        onPress={handleImportPress}
                        style={styles.listItem}
                    />
                    <Divider style={styles.divider} />
                    <List.Item
                        title="Reset App"
                        description="Delete all data"
                        left={() => <Avatar.Icon icon="delete-forever" size={40} style={{ backgroundColor: theme.colors.errorContainer }} color={theme.colors.error} />}
                        onPress={handleResetPress}
                        titleStyle={{ color: theme.colors.error }}
                        style={styles.listItem}
                    />
                </Surface>

                <View style={{ alignItems: 'center', marginTop: 30, marginBottom: 20 }}>
                    <Text variant="bodySmall" style={{ color: 'gray' }}>Version 1.0.0</Text>
                    <View style={{ backgroundColor: '#FFD700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, margin: 10 }}>
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#000' }}>BETA</Text>
                    </View>
                    <Text variant="bodySmall" style={{ color: 'gray' }}>Developed by:</Text>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#4d4d4dff' }}> Rahmat Mondol</Text>
                </View>
            </ScrollView>

            {/* PIN Dialog */}
            <Portal>
                <Dialog visible={pinDialogVisible} onDismiss={() => setPinDialogVisible(false)} style={[styles.dialog, { marginTop: -100 }]}>
                    <View style={styles.dialogIconContainer}>
                        <Avatar.Icon icon="lock" size={50} style={{ backgroundColor: theme.colors.primaryContainer }} color={theme.colors.primary} />
                    </View>
                    <Dialog.Title style={styles.dialogTitle}>
                        {pinStep === 'create' ? 'Set PIN' :
                            pinStep === 'confirm' ? 'Confirm PIN' :
                                pinStep === 'enter_old' || pinStep === 'remove' ? 'Enter Current PIN' :
                                    pinStep === 'enter_new' ? 'Enter New PIN' : 'Confirm New PIN'}
                    </Dialog.Title>
                    <Dialog.Content>
                        <TextInput
                            label="PIN Code"
                            value={pinInput}
                            onChangeText={(text) => {
                                // Only allow numbers and max 4 digits
                                if (/^\d*$/.test(text) && text.length <= 4) {
                                    setPinInput(text);
                                    setPinError('');
                                }
                            }}
                            mode="outlined"
                            keyboardType="numeric"
                            secureTextEntry
                            maxLength={4}
                            autoFocus
                            error={!!pinError}
                            style={styles.input}
                            contentStyle={{ textAlign: 'center', fontSize: 24, letterSpacing: 10 }}
                        />
                        {pinError ? <Text style={styles.errorText}>{pinError}</Text> : null}
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setPinDialogVisible(false)}>Cancel</Button>
                        <Button mode="contained" onPress={handlePinSubmit} style={{ marginLeft: 10 }}>
                            {pinStep === 'remove' ? 'Remove' : 'Next'}
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* Currency Dialog */}
            <Portal>
                <Dialog visible={currencyDialogVisible} onDismiss={hideCurrencyDialog} style={styles.dialog}>
                    <View style={styles.dialogIconContainer}>
                        <Avatar.Icon icon="currency-usd" size={50} style={{ backgroundColor: theme.colors.primaryContainer }} color={theme.colors.primary} />
                    </View>
                    <Dialog.Title style={styles.dialogTitle}>Set Currency</Dialog.Title>
                    <Dialog.Content>
                        <TextInput
                            label="Symbol"
                            value={tempCurrency}
                            onChangeText={setTempCurrency}
                            mode="outlined"
                            maxLength={5}
                            style={styles.input}
                        />
                        <View style={styles.chipContainer}>
                            {['৳', '$', '€', '£', '₹', '¥'].map(sym => (
                                <Chip
                                    key={sym}
                                    onPress={() => setTempCurrency(sym)}
                                    selected={tempCurrency === sym}
                                    style={styles.chip}
                                    showSelectedOverlay
                                >
                                    {sym}
                                </Chip>
                            ))}
                        </View>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={hideCurrencyDialog}>Cancel</Button>
                        <Button mode="contained" onPress={handleCurrencySave} style={{ marginLeft: 10 }}>Save</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* Password Dialog */}
            <Portal>
                <Dialog visible={passwordDialogVisible} onDismiss={() => setPasswordDialogVisible(false)} style={[styles.dialog, { marginTop: -100 }]}>
                    <View style={styles.dialogIconContainer}>
                        <Avatar.Icon icon={backupMode === 'export' ? "database-export" : "database-import"} size={50} style={{ backgroundColor: theme.colors.primaryContainer }} color={theme.colors.primary} />
                    </View>
                    <Dialog.Title style={styles.dialogTitle}>
                        {backupMode === 'export' ? 'Encrypt Backup' : 'Decrypt Backup'}
                    </Dialog.Title>
                    <Dialog.Content>
                        <Text style={{ textAlign: 'center', marginBottom: 20, color: 'gray' }}>
                            {backupMode === 'export'
                                ? 'Set a password to protect your backup file.'
                                : 'Enter the password to decrypt your backup file.'}
                        </Text>

                        {backupMode === 'export' && (
                            <TextInput
                                label="Filename (Optional)"
                                value={backupFilename}
                                onChangeText={setBackupFilename}
                                mode="outlined"
                                style={[styles.input, { marginBottom: 15 }]}
                                placeholder="finance_backup"
                            />
                        )}

                        <TextInput
                            label="Password"
                            value={password}
                            onChangeText={setPassword}
                            mode="outlined"
                            secureTextEntry={!passwordVisible}
                            autoFocus
                            style={styles.input}
                            right={<TextInput.Icon icon={passwordVisible ? "eye-off" : "eye"} onPress={() => setPasswordVisible(!passwordVisible)} />}
                        />
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setPasswordDialogVisible(false)}>Cancel</Button>
                        <Button mode="contained" onPress={executeBackupAction} style={{ marginLeft: 10 }}>
                            {backupMode === 'export' ? 'Backup' : 'Restore'}
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { padding: 16, paddingBottom: 100 },
    sectionTitle: { marginLeft: 16, marginBottom: 8, marginTop: 16, color: 'gray' },
    sectionCard: { borderRadius: 12, overflow: 'hidden', backgroundColor: 'white', marginBottom: 8, paddingHorizontal: 16 },
    listItem: { paddingVertical: 8 },
    divider: { backgroundColor: '#c5c5c5ff' },
    dialog: { backgroundColor: 'white', borderRadius: 16 },
    dialogIconContainer: { alignItems: 'center', marginTop: -25, marginBottom: 10 },
    dialogTitle: { textAlign: 'center', fontSize: 20, fontWeight: 'bold' },
    input: { marginBottom: 10, backgroundColor: 'white' },
    errorText: { color: 'red', textAlign: 'center', marginTop: 5 },
    chipContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 10 },
    chip: { margin: 4 },
});
