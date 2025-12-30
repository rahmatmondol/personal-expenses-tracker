import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { Text, TextInput, Button, Card, useTheme, Appbar, SegmentedButtons, FAB, Avatar, Chip, Portal, Dialog, RadioButton } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { formatAmount } from '../utils/formatting';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Debt, Account } from '../types';
import * as repo from '../db/repo';
import { colors } from '../utils/colors';

export const DebtScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation();
    const [debts, setDebts] = useState<Debt[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isAdding, setIsAdding] = useState(false);

    // Form State
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [contactName, setContactName] = useState('');
    const [type, setType] = useState<'borrowed' | 'lent'>('borrowed');
    const [dueDate, setDueDate] = useState(new Date());
    const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
    const [showPicker, setShowPicker] = useState(false);

    // Payment Modal State
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);
    const [selectedDebtId, setSelectedDebtId] = useState<number | null>(null);
    const [paymentAccountId, setPaymentAccountId] = useState<number | null>(null);

    const currency = repo.getSetting('currency') || '৳';

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        setDebts(repo.getDebts());
        setAccounts(repo.getAccounts());
    };

    const handleSave = () => {
        if (!amount || !contactName) {
            Alert.alert('Error', 'Please enter amount and contact name');
            return;
        }
        repo.addDebt(parseFloat(amount), description, type, dueDate.getTime(), contactName, selectedAccountId);
        setIsAdding(false);
        resetForm();
        loadData();
    };

    const resetForm = () => {
        setAmount('');
        setDescription('');
        setContactName('');
        setDueDate(new Date());
        setSelectedAccountId(null);
    };

    const confirmMarkPaid = (id: number) => {
        setSelectedDebtId(id);
        setPaymentAccountId(null);
        setPaymentModalVisible(true);
    };

    const handleMarkPaid = () => {
        if (selectedDebtId) {
            const debt = debts.find(d => d.id === selectedDebtId);

            // Check balance if paying back a loan (borrowed)
            if (debt && debt.type === 'borrowed' && paymentAccountId) {
                const account = accounts.find(a => a.id === paymentAccountId);
                if (account && account.balance < debt.amount) {
                    Alert.alert('Error', 'Insufficient balance in selected account');
                    return;
                }
            }

            repo.markDebtAsPaid(selectedDebtId, paymentAccountId);
            setPaymentModalVisible(false);
            loadData();
        }
    };

    const handleDelete = (id: number) => {
        Alert.alert('Delete', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: () => {
                    repo.deleteDebt(id);
                    loadData();
                }
            }
        ]);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Appbar.Header style={{ backgroundColor: 'white', elevation: 0 }}>
                <Appbar.BackAction onPress={() => navigation.goBack()} />
                <Appbar.Content title="Debts & Loans" titleStyle={{ fontWeight: 'bold' }} />
            </Appbar.Header>

            <Portal>
                <Dialog visible={paymentModalVisible} onDismiss={() => setPaymentModalVisible(false)} style={{ backgroundColor: 'white' }}>
                    <Dialog.Title>Mark as Paid</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
                            Select the account used for this payment (Optional):
                        </Text>
                        <ScrollView style={{ maxHeight: 200 }}>
                            <RadioButton.Group onValueChange={val => setPaymentAccountId(val ? parseInt(val) : null)} value={paymentAccountId ? paymentAccountId.toString() : ''}>
                                <View style={styles.radioItem}>
                                    <RadioButton value="" status={!paymentAccountId ? 'checked' : 'unchecked'} onPress={() => setPaymentAccountId(null)} />
                                    <Text onPress={() => setPaymentAccountId(null)}>None (Just mark as paid)</Text>
                                </View>
                                {accounts.map(acc => (
                                    <View key={acc.id} style={styles.radioItem}>
                                        <RadioButton value={acc.id.toString()} />
                                        <Text onPress={() => setPaymentAccountId(acc.id)}>{acc.name} ({currency}{formatAmount(acc.balance)})</Text>
                                    </View>
                                ))}
                            </RadioButton.Group>
                        </ScrollView>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setPaymentModalVisible(false)}>Cancel</Button>
                        <Button onPress={handleMarkPaid}>Confirm</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {isAdding ? (
                <KeyboardAvoidingView
                    style={styles.formContainer}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <ScrollView contentContainerStyle={styles.formScroll}>
                        <Text variant="headlineSmall" style={styles.formTitle}>
                            {type === 'borrowed' ? 'I Borrowed From...' : 'I Lent To...'}
                        </Text>

                        <SegmentedButtons
                            value={type}
                            onValueChange={val => setType(val as any)}
                            buttons={[
                                { value: 'borrowed', label: 'Borrowed', icon: 'arrow-down' },
                                { value: 'lent', label: 'Lent', icon: 'arrow-up' },
                            ]}
                            style={{ marginBottom: 24 }}
                        />

                        <TextInput
                            label="Amount"
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="numeric"
                            mode="outlined"
                            left={<TextInput.Affix text={currency} />}
                            style={styles.input}
                        />

                        <Text variant="titleMedium" style={{ marginTop: 10, marginBottom: 8, fontWeight: 'bold' }}>
                            {type === 'borrowed' ? 'Deposit to Account' : 'Pay from Account'}
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                            {accounts.map(acc => (
                                <Chip
                                    key={acc.id}
                                    selected={selectedAccountId === acc.id}
                                    onPress={() => setSelectedAccountId(selectedAccountId === acc.id ? null : acc.id)}
                                    style={{ marginRight: 8, backgroundColor: selectedAccountId === acc.id ? '#E3F2FD' : '#f0f0f0' }}
                                    icon={acc.icon}
                                    showSelectedOverlay
                                >
                                    {acc.name}
                                </Chip>
                            ))}
                        </ScrollView>

                        <TextInput
                            label="Contact Name (e.g. John Doe)"
                            value={contactName}
                            onChangeText={setContactName}
                            mode="outlined"
                            style={styles.input}
                            right={<TextInput.Icon icon="account" />}
                        />

                        <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.datePicker}>
                            <View>
                                <Text variant="labelMedium" style={{ color: 'gray' }}>Due Date</Text>
                                <Text variant="bodyLarge">{dueDate.toLocaleDateString()}</Text>
                            </View>
                            <Avatar.Icon size={40} icon="calendar" style={{ backgroundColor: '#E0E0E0' }} color="#616161" />
                        </TouchableOpacity>

                        {showPicker && (
                            <DateTimePicker
                                value={dueDate}
                                mode="date"
                                onChange={(event, date) => {
                                    setShowPicker(false);
                                    if (date) setDueDate(date);
                                }}
                            />
                        )}

                        <TextInput
                            label="Note (Optional)"
                            value={description}
                            onChangeText={setDescription}
                            mode="outlined"
                            multiline
                            style={styles.input}
                        />
                    </ScrollView>
                    <View style={styles.footerButtons}>
                        <Button mode="outlined" onPress={() => setIsAdding(false)} style={styles.cancelBtn}>Cancel</Button>
                        <Button mode="contained" onPress={handleSave} style={styles.saveBtn}>Save Debt</Button>
                    </View>
                </KeyboardAvoidingView>
            ) : (
                <View style={{ flex: 1 }}>
                    {/* Summary Cards */}
                    <View style={styles.summaryContainer}>
                        <Card style={[styles.summaryCard, { backgroundColor: '#FFEBEE' }]}>
                            <Card.Content>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                    <Avatar.Icon size={36} icon="arrow-bottom-left" style={{ backgroundColor: 'white', marginRight: 8 }} color="#D32F2F" />
                                    <View>
                                        <Text variant="labelMedium" style={{ color: '#D32F2F', opacity: 0.8 }}>To Pay</Text>
                                        <Text variant="titleLarge" style={{ color: '#D32F2F', fontWeight: 'bold' }}>
                                            {currency}{formatAmount(debts.filter(d => d.type === 'borrowed' && !d.is_paid).reduce((acc, curr) => acc + curr.amount, 0))}
                                        </Text>
                                    </View>
                                </View>
                            </Card.Content>
                        </Card>
                        <Card style={[styles.summaryCard, { backgroundColor: '#E8F5E9' }]}>
                            <Card.Content>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                    <Avatar.Icon size={36} icon="arrow-top-right" style={{ backgroundColor: 'white', marginRight: 8 }} color="#388E3C" />
                                    <View>
                                        <Text variant="labelMedium" style={{ color: '#388E3C', opacity: 0.8 }}>To Receive</Text>
                                        <Text variant="titleLarge" style={{ color: '#388E3C', fontWeight: 'bold' }}>
                                            {currency}{formatAmount(debts.filter(d => d.type === 'lent' && !d.is_paid).reduce((acc, curr) => acc + curr.amount, 0))}
                                        </Text>
                                    </View>
                                </View>
                            </Card.Content>
                        </Card>
                    </View>

                    <ScrollView contentContainerStyle={styles.list}>
                        <Text variant="titleMedium" style={{ marginBottom: 10, fontWeight: 'bold', paddingHorizontal: 4 }}>Active Debts</Text>
                        {debts.filter(d => !d.is_paid).map(debt => (
                            <Card key={debt.id} style={styles.card} elevation={1}>
                                <View style={styles.cardInner}>
                                    <View style={[styles.indicator, { backgroundColor: debt.type === 'borrowed' ? '#F44336' : '#4CAF50' }]} />
                                    <View style={styles.cardContent}>
                                        <View style={styles.rowBetween}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>

                                                <View>
                                                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{debt.contact_name}</Text>
                                                    <Text variant="bodySmall" style={{ color: 'gray' }}>
                                                        {debt.type === 'borrowed' ? 'Borrowed' : 'Lent'} • Due: {new Date(debt.due_date).toLocaleDateString()}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text variant="titleMedium" style={{ fontWeight: 'bold', color: debt.type === 'borrowed' ? '#F44336' : '#4CAF50' }}>
                                                    {debt.type === 'borrowed' ? '-' : '+'}{currency}{formatAmount(debt.amount)}
                                                </Text>
                                                <Text variant="labelSmall" style={{ color: 'orange' }}>PENDING</Text>
                                            </View>
                                        </View>
                                        {debt.description ? <Text variant="bodySmall" style={{ marginTop: 4, color: 'gray' }}>{debt.description}</Text> : null}

                                        <View style={styles.actionRow}>
                                            <Avatar.Icon
                                                size={30}
                                                icon={debt.type === 'borrowed' ? 'arrow-bottom-left' : 'arrow-top-right'}
                                                style={{ backgroundColor: debt.type === 'borrowed' ? '#FFEBEE' : '#E8F5E9', marginRight: 12 }}
                                                color={debt.type === 'borrowed' ? '#F44336' : '#4CAF50'}
                                            />
                                            <TouchableOpacity onPress={() => confirmMarkPaid(debt.id)}>
                                                <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>MARK AS PAID</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            </Card>
                        ))}

                        {debts.filter(d => d.is_paid).length > 0 && (
                            <Text variant="titleMedium" style={{ marginVertical: 10, fontWeight: 'bold', paddingHorizontal: 4, marginTop: 20 }}>History</Text>
                        )}

                        {debts.filter(d => d.is_paid).map(debt => (
                            <Card key={debt.id} style={[styles.card, { opacity: 0.7 }]} elevation={0}>
                                <View style={styles.cardInner}>
                                    <View style={[styles.indicator, { backgroundColor: 'gray' }]} />
                                    <View style={styles.cardContent}>
                                        <View style={styles.rowBetween}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Avatar.Icon
                                                    size={40}
                                                    icon={debt.type === 'borrowed' ? 'arrow-bottom-left' : 'arrow-top-right'}
                                                    style={{ backgroundColor: '#f0f0f0', marginRight: 12 }}
                                                    color="gray"
                                                />
                                                <View>
                                                    <Text variant="titleMedium" style={{ textDecorationLine: 'line-through' }}>{debt.contact_name}</Text>
                                                    <Text variant="bodySmall" style={{ color: 'gray' }}>
                                                        Due: {new Date(debt.due_date).toLocaleDateString()}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text variant="titleMedium" style={{ color: 'gray', textDecorationLine: 'line-through' }}>
                                                    {currency}{formatAmount(debt.amount)}
                                                </Text>
                                                <TouchableOpacity onPress={() => handleDelete(debt.id)} style={{ marginTop: 4 }}>
                                                    <Avatar.Icon size={20} icon="delete-outline" style={{ backgroundColor: 'transparent' }} color="#B0BEC5" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                        <Text variant="labelSmall" style={{ color: 'green', marginTop: 4 }}>COMPLETED</Text>
                                    </View>
                                </View>
                            </Card>
                        ))}

                        {debts.length === 0 && (
                            <View style={{ padding: 40, alignItems: 'center' }}>
                                <Avatar.Icon size={64} icon="handshake-outline" style={{ backgroundColor: '#f0f0f0' }} color="gray" />
                                <Text style={{ marginTop: 10, color: 'gray' }}>No active debts or loans.</Text>
                            </View>
                        )}
                    </ScrollView>

                    <FAB
                        icon="plus"
                        label="Add New"
                        color={colors.white}
                        style={[styles.fab, { backgroundColor: colors.primary }]}
                        onPress={() => setIsAdding(true)}
                    />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    formContainer: { flex: 1, backgroundColor: colors.white },
    formScroll: { padding: 20 },
    formTitle: { fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    input: { marginBottom: 16, backgroundColor: 'white' },
    datePicker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 4, marginBottom: 16 },
    footerButtons: { padding: 16, flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#eee' },
    cancelBtn: { flex: 1, marginRight: 8 },
    saveBtn: { flex: 1 },

    summaryContainer: { flexDirection: 'row', padding: 16, paddingBottom: 0 },
    summaryCard: { flex: 1, marginHorizontal: 4 },
    list: { padding: 16, paddingBottom: 80 },
    card: { marginBottom: 12, backgroundColor: 'white', overflow: 'hidden', borderRadius: 12 },
    cardInner: { flexDirection: 'row' },
    indicator: { width: 6 },
    cardContent: { flex: 1, padding: 16 },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
    actionButton: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
    fab: { position: 'absolute', margin: 16, right: 0, bottom: 60 },
    radioItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
});
