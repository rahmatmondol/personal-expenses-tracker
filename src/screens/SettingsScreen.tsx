import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { List, Button, Divider, Text, TextInput, Portal, Dialog, RadioButton, Chip, Switch } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import { exportDataToJSON, importDataFromJSON, exportDataToCSV } from '../db/backup';
import { resetDatabase } from '../db/repo';
import { useStore } from '../store/useStore';
import * as auth from '../utils/auth';
import { useNavigation } from '@react-navigation/native';

export const SettingsScreen = () => {
  const { refreshData, currency, setCurrency, hasPin, isBiometricEnabled, updateAuthSettings } = useStore();
  const navigation = useNavigation();
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
              const success = await exportDataToJSON(password);
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
      <List.Section>
        <List.Subheader>General</List.Subheader>
        <List.Item
            title="Accounts"
            description="Manage your accounts"
            left={props => <List.Icon {...props} icon="bank" />}
            onPress={() => navigation.navigate('AccountManagement' as never)}
        />
        <List.Item
            title="Currency"
            description={`Current: ${currency}`}
            left={props => <List.Icon {...props} icon="currency-usd" />}
            onPress={showCurrencyDialog}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>Security</List.Subheader>
        {!hasPin ? (
            <List.Item
                title="Set PIN"
                description="Secure app with a 4-digit PIN"
                left={props => <List.Icon {...props} icon="lock-plus" />}
                onPress={handleSetPinPress}
            />
        ) : (
            <>
                <List.Item
                    title="Change PIN"
                    description="Update your current PIN"
                    left={props => <List.Icon {...props} icon="lock-reset" />}
                    onPress={handleChangePinPress}
                />
                <List.Item
                    title="Biometric Unlock"
                    description="Use Fingerprint/FaceID to unlock"
                    left={props => <List.Icon {...props} icon="fingerprint" />}
                    right={() => <Switch value={isBiometricEnabled} onValueChange={handleBiometricToggle} />}
                />
                <List.Item
                    title="Remove PIN"
                    description="Disable app security"
                    left={props => <List.Icon {...props} icon="lock-remove" color="red" />}
                    onPress={handleRemovePinPress}
                    titleStyle={{ color: 'red' }}
                />
            </>
        )}
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>Data Management</List.Subheader>
        
        <List.Item
            title="Export Backup (JSON)"
            description="Encrypt and export data to file"
            left={props => <List.Icon {...props} icon="database-export" />}
            onPress={handleExportPress}
        />
        
        <List.Item
            title="Import Backup (JSON)"
            description="Import and decrypt data from file"
            left={props => <List.Icon {...props} icon="database-import" />}
            onPress={handleImportPress}
        />

        
        <List.Item
            title="Reset App"
            description="Delete all data and reset to factory settings"
            left={props => <List.Icon {...props} icon="delete-forever" color="red" />}
            onPress={handleResetPress}
            titleStyle={{ color: 'red' }}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>App Info</List.Subheader>
        <List.Item
            title="Version"
            description="1.0.0"
            left={props => <List.Icon {...props} icon="information" />}
        />
      </List.Section>

      {/* PIN Dialog */}
      <Portal>
        <Dialog visible={pinDialogVisible} onDismiss={() => setPinDialogVisible(false)}>
            <Dialog.Title>
                {pinStep === 'create' ? 'Set PIN' : 
                 pinStep === 'confirm' ? 'Confirm PIN' :
                 pinStep === 'enter_old' || pinStep === 'remove' ? 'Enter Current PIN' :
                 pinStep === 'enter_new' ? 'Enter New PIN' : 'Confirm New PIN'}
            </Dialog.Title>
            <Dialog.Content>
                <TextInput
                    label="PIN"
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
                />
                {pinError ? <Text style={{ color: 'red', marginTop: 5 }}>{pinError}</Text> : null}
            </Dialog.Content>
            <Dialog.Actions>
                <Button onPress={() => setPinDialogVisible(false)}>Cancel</Button>
                <Button onPress={handlePinSubmit}>
                    {pinStep === 'remove' ? 'Remove' : 'Next'}
                </Button>
            </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Currency Dialog */}
      <Portal>
        <Dialog visible={currencyDialogVisible} onDismiss={hideCurrencyDialog}>
            <Dialog.Title>Set Currency Symbol</Dialog.Title>
            <Dialog.Content>
                <TextInput
                    label="Symbol (e.g. $, ৳, €)"
                    value={tempCurrency}
                    onChangeText={setTempCurrency}
                    mode="outlined"
                    maxLength={5}
                />
                <View style={{ marginTop: 10 }}>
                    <Text variant="bodySmall">Common Symbols:</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 5 }}>
                        {['৳', '$', '€', '£', '₹'].map(sym => (
                            <Chip 
                                key={sym} 
                                onPress={() => setTempCurrency(sym)} 
                                selected={tempCurrency === sym}
                                style={{ margin: 2 }}
                            >
                                {sym}
                            </Chip>
                        ))}
                    </View>
                </View>
            </Dialog.Content>
            <Dialog.Actions>
                <Button onPress={hideCurrencyDialog}>Cancel</Button>
                <Button onPress={handleCurrencySave}>Save</Button>
            </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Password Dialog */}
      <Portal>
        <Dialog visible={passwordDialogVisible} onDismiss={() => setPasswordDialogVisible(false)}>
            <Dialog.Title>
                {backupMode === 'export' ? 'Encrypt Backup' : 'Decrypt Backup'}
            </Dialog.Title>
            <Dialog.Content>
                <Text style={{ marginBottom: 10 }}>
                    {backupMode === 'export' 
                        ? 'Enter a password to encrypt your backup file. You will need this password to restore it.' 
                        : 'Enter the password to decrypt this backup file.'}
                </Text>
                <TextInput
                    label="Password"
                    value={password}
                    onChangeText={setPassword}
                    mode="outlined"
                    secureTextEntry
                    autoFocus
                />
            </Dialog.Content>
            <Dialog.Actions>
                <Button onPress={() => setPasswordDialogVisible(false)}>Cancel</Button>
                <Button onPress={executeBackupAction}>
                    {backupMode === 'export' ? 'Backup' : 'Restore'}
                </Button>
            </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' }
});
