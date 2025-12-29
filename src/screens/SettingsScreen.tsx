import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { List, Button, Divider, Text, TextInput, Portal, Dialog, RadioButton, Chip } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import { exportDataToJSON, importDataFromJSON } from '../db/backup';
import { useStore } from '../store/useStore';
import { useNavigation } from '@react-navigation/native';

export const SettingsScreen = () => {
  const { refreshData, currency, setCurrency } = useStore();
  const navigation = useNavigation();
  const [currencyDialogVisible, setCurrencyDialogVisible] = useState(false);
  const [tempCurrency, setTempCurrency] = useState(currency);

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
        <List.Subheader>Data Management</List.Subheader>
        
        <List.Item
            title="Backup Data"
            description="Encrypt and export data to file"
            left={props => <List.Icon {...props} icon="lock-outline" />}
            onPress={handleExportPress}
        />
        
        <List.Item
            title="Restore Data"
            description="Import and decrypt data from file"
            left={props => <List.Icon {...props} icon="lock-open-outline" />}
            onPress={handleImportPress}
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
