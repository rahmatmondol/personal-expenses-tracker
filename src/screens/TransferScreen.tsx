import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Button, TextInput, Text, useTheme, Appbar, Surface, Avatar, Menu } from 'react-native-paper';
import { useStore } from '../store/useStore';
import { useNavigation, useRoute } from '@react-navigation/native';
import { formatAmount } from '../utils/formatting';

export const TransferScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation();
    const route = useRoute();
    const { accounts, transferFunds, currency } = useStore();
    
    // Get initial account from params if available
    const initialFromId = (route.params as any)?.fromAccountId;
    
    const [fromAccountId, setFromAccountId] = useState<number | null>(initialFromId || null);
    const [toAccountId, setToAccountId] = useState<number | null>(null);
    const [amount, setAmount] = useState('');
    
    const [showFromMenu, setShowFromMenu] = useState(false);
    const [showToMenu, setShowToMenu] = useState(false);

    // Auto-select first account if not set
    useEffect(() => {
        if (!fromAccountId && accounts.length > 0) {
            setFromAccountId(accounts[0].id);
        }
    }, [accounts]);

    // Ensure toAccount is different from fromAccount
    useEffect(() => {
        if (fromAccountId && toAccountId === fromAccountId) {
            setToAccountId(null);
        }
    }, [fromAccountId]);

    const handleTransfer = () => {
        if (!fromAccountId || !toAccountId) {
            Alert.alert('Error', 'Please select both accounts');
            return;
        }
        
        const transferAmount = parseFloat(amount);
        if (!transferAmount || transferAmount <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }
        
        const fromAccount = accounts.find(a => a.id === fromAccountId);
        if (fromAccount && fromAccount.balance < transferAmount) {
            Alert.alert('Error', 'Insufficient balance in source account');
            return;
        }

        Alert.alert(
            'Confirm Transfer',
            `Transfer ${currency}${formatAmount(transferAmount)} from ${fromAccount?.name} to ${accounts.find(a => a.id === toAccountId)?.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Confirm', 
                    onPress: () => {
                        transferFunds(fromAccountId, toAccountId, transferAmount);
                        Alert.alert('Success', 'Transfer completed successfully');
                        navigation.goBack();
                    } 
                }
            ]
        );
    };

    const fromAccount = accounts.find(a => a.id === fromAccountId);
    const toAccount = accounts.find(a => a.id === toAccountId);

    return (
        <View style={styles.container}>
            <Appbar.Header style={{ backgroundColor: 'white' }}>
                <Appbar.BackAction onPress={() => navigation.goBack()} />
                <Appbar.Content title="Transfer Funds" />
            </Appbar.Header>

            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content}>
                    
                    {/* Source Account */}
                    <Text variant="titleMedium" style={styles.label}>From Account</Text>
                    <Menu
                        visible={showFromMenu}
                        onDismiss={() => setShowFromMenu(false)}
                        anchor={
                            <Surface style={styles.accountSelector} elevation={1}>
                                <Avatar.Icon 
                                    size={40} 
                                    icon={fromAccount?.icon || 'bank'} 
                                    style={{ backgroundColor: fromAccount?.color || '#ccc' }} 
                                    color="white"
                                />
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text variant="titleMedium">{fromAccount?.name || 'Select Account'}</Text>
                                    {fromAccount && (
                                        <Text variant="bodySmall" style={{ color: 'gray' }}>
                                            Balance: {currency}{formatAmount(fromAccount.balance)}
                                        </Text>
                                    )}
                                </View>
                                <Button mode="text" onPress={() => setShowFromMenu(true)}>Change</Button>
                            </Surface>
                        }
                    >
                        {accounts.map(acc => (
                            <Menu.Item 
                                key={acc.id} 
                                onPress={() => {
                                    setFromAccountId(acc.id);
                                    setShowFromMenu(false);
                                }} 
                                title={`${acc.name} (${currency}${formatAmount(acc.balance)})`}
                                leadingIcon={props => <Avatar.Icon {...props} size={24} icon={acc.icon || 'bank'} style={{backgroundColor: acc.color}} />}
                            />
                        ))}
                    </Menu>

                    <View style={styles.arrowContainer}>
                        <Avatar.Icon size={32} icon="arrow-down" style={{ backgroundColor: theme.colors.surfaceVariant }} color={theme.colors.onSurfaceVariant} />
                    </View>

                    {/* Destination Account */}
                    <Text variant="titleMedium" style={styles.label}>To Account</Text>
                    <Menu
                        visible={showToMenu}
                        onDismiss={() => setShowToMenu(false)}
                        anchor={
                            <Surface style={styles.accountSelector} elevation={1}>
                                <Avatar.Icon 
                                    size={40} 
                                    icon={toAccount?.icon || 'bank'} 
                                    style={{ backgroundColor: toAccount?.color || '#ccc' }} 
                                    color="white"
                                />
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text variant="titleMedium">{toAccount?.name || 'Select Account'}</Text>
                                    {toAccount && (
                                        <Text variant="bodySmall" style={{ color: 'gray' }}>
                                            Balance: {currency}{formatAmount(toAccount.balance)}
                                        </Text>
                                    )}
                                </View>
                                <Button mode="text" onPress={() => setShowToMenu(true)}>Change</Button>
                            </Surface>
                        }
                    >
                        {accounts.filter(a => a.id !== fromAccountId).map(acc => (
                            <Menu.Item 
                                key={acc.id} 
                                onPress={() => {
                                    setToAccountId(acc.id);
                                    setShowToMenu(false);
                                }} 
                                title={`${acc.name} (${currency}${formatAmount(acc.balance)})`}
                                leadingIcon={props => <Avatar.Icon {...props} size={24} icon={acc.icon || 'bank'} style={{backgroundColor: acc.color}} />}
                            />
                        ))}
                    </Menu>

                    {/* Amount Input */}
                    <Surface style={styles.amountCard} elevation={1}>
                        <Text variant="titleSmall" style={{ color: theme.colors.secondary }}>Amount to Transfer</Text>
                        <View style={styles.amountInputContainer}>
                            <Text variant="headlineLarge" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{currency}</Text>
                            <TextInput
                                value={amount}
                                onChangeText={setAmount}
                                keyboardType="numeric"
                                style={styles.amountInput}
                                placeholder="0"
                                placeholderTextColor={theme.colors.outline}
                                contentStyle={{ fontSize: 40, fontWeight: 'bold', color: theme.colors.primary }}
                                underlineColor="transparent"
                                activeUnderlineColor="transparent"
                            />
                        </View>
                    </Surface>

                    <Button 
                        mode="contained" 
                        onPress={handleTransfer} 
                        style={styles.button}
                        contentStyle={{ height: 50 }}
                        disabled={!fromAccountId || !toAccountId || !amount}
                    >
                        Transfer Funds
                    </Button>

                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    content: { padding: 16 },
    label: { marginBottom: 8, color: 'gray' },
    accountSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderRadius: 12,
        marginBottom: 10
    },
    arrowContainer: {
        alignItems: 'center',
        marginVertical: 10
    },
    amountCard: {
        marginTop: 20,
        padding: 20,
        borderRadius: 16,
        backgroundColor: 'white',
        alignItems: 'center',
        marginBottom: 30
    },
    amountInputContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    amountInput: { backgroundColor: 'transparent', width: 200, textAlign: 'center', height: 60 },
    button: { borderRadius: 25 }
});
