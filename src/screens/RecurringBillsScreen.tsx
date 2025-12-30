import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Card, useTheme, Appbar, FAB, Chip, Avatar, Surface, Portal, Modal } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { formatAmount } from '../utils/formatting';
import { RecurringPayment, Category, Account } from '../types';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as repo from '../db/repo';
import { colors } from '../utils/colors';

export const RecurringBillsScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation();
    const [bills, setBills] = useState<RecurringPayment[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    
    // Pay Modal State
    const [isPayModalVisible, setIsPayModalVisible] = useState(false);
    const [selectedBill, setSelectedBill] = useState<RecurringPayment | null>(null);
    const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
    
    // Form State
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [frequency, setFrequency] = useState<'monthly'>('monthly'); // Simplified for now
    const [dueDay, setDueDay] = useState('');

    const currency = repo.getSetting('currency') || '৳';

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        setBills(repo.getRecurringPayments());
        setCategories(repo.getCategories().filter(c => c.type === 'expense'));
        setAccounts(repo.getAccounts());
    };

    const handlePayPress = (bill: RecurringPayment) => {
        setSelectedBill(bill);
        setSelectedAccount(accounts.length > 0 ? accounts[0].id : null);
        setIsPayModalVisible(true);
    };

    const confirmPayment = () => {
        if (!selectedBill || !selectedAccount) return;

        // Check for sufficient balance
        const account = accounts.find(a => a.id === selectedAccount);
        if (account && account.balance < selectedBill.amount) {
            Alert.alert('Error', 'Insufficient balance in selected account');
            return;
        }

        const nextDate = new Date(selectedBill.next_due_date);
        nextDate.setMonth(nextDate.getMonth() + 1);

        repo.updateRecurringPaymentNextDate(
            selectedBill.id,
            nextDate.getTime(),
            Date.now(),
            selectedBill.amount,
            selectedBill.categoryId,
            `Recurring Bill: ${selectedBill.description}`,
            selectedAccount
        );

        setIsPayModalVisible(false);
        setSelectedBill(null);
        loadData();
    };

    const handleSave = () => {
        if (!amount || !selectedCategory || !dueDay) {
            Alert.alert('Error', 'Please fill all fields');
            return;
        }
        const day = parseInt(dueDay);
        if (day < 1 || day > 31) {
             Alert.alert('Error', 'Invalid day');
             return;
        }

        // Calculate next due date
        const today = new Date();
        let nextDate = new Date();
        nextDate.setDate(day);
        if (nextDate < today) {
            nextDate.setMonth(nextDate.getMonth() + 1);
        }

        repo.addRecurringPayment(
            parseFloat(amount), 
            description, 
            selectedCategory, 
            'monthly', 
            day, 
            nextDate.getTime(), 
            5 // Default reminder days
        );
        setIsAdding(false);
        resetForm();
        loadData();
    };

    const resetForm = () => {
        setAmount('');
        setDescription('');
        setSelectedCategory(null);
        setDueDay('');
    };

    const handleDelete = (id: number) => {
        Alert.alert('Delete', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => {
                repo.deleteRecurringPayment(id);
                loadData();
            }}
        ]);
    };

    const getDaysRemaining = (timestamp: number) => {
        const diff = timestamp - Date.now();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return days;
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
            <Appbar.Header style={{ backgroundColor: colors.background, elevation: 0 }}>
                <Appbar.BackAction onPress={() => navigation.goBack()} />
                <Appbar.Content title="Monthly Bills" titleStyle={{ fontWeight: 'bold', color: colors.textPrimary }} />
            </Appbar.Header>

            {isAdding ? (
                <View style={styles.formContainer}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={{ flex: 1 }}
                    >
                        <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
                            <Text variant="headlineSmall" style={styles.formTitle}>Add New Bill</Text>
                            
                            {/* Amount Input */}
                            <Surface style={styles.amountCard} elevation={1}>
                                <Text variant="titleSmall" style={{ color: theme.colors.secondary }}>Amount</Text>
                                <View style={styles.amountInputContainer}>
                                    <Text variant="headlineLarge" style={{ color: colors.primary, fontWeight: 'bold' }}>{currency}</Text>
                                    <TextInput
                                        value={amount}
                                        onChangeText={setAmount}
                                        keyboardType="numeric"
                                        style={styles.amountInput}
                                        placeholder="0"
                                        placeholderTextColor={colors.outline}
                                        contentStyle={{ fontSize: 40, fontWeight: 'bold', color: colors.primary }}
                                        underlineColor="transparent"
                                        activeUnderlineColor="transparent"
                                    />
                                </View>
                            </Surface>

                            {/* Category Selection */}
                            <View style={styles.section}>
                                <Text variant="titleMedium" style={styles.sectionTitle}>Category</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4 }}>
                                    {categories.map(cat => (
                                        <Chip 
                                            key={cat.id} 
                                            selected={selectedCategory === cat.id} 
                                            onPress={() => setSelectedCategory(cat.id)}
                                            style={{ marginRight: 8, backgroundColor: selectedCategory === cat.id ? colors.primary + '20' : 'white', borderColor: selectedCategory === cat.id ? colors.primary : 'transparent', borderWidth: 1 }}
                                            textStyle={{ color: selectedCategory === cat.id ? colors.primary : colors.textPrimary }}
                                            icon={cat.icon}
                                            showSelectedOverlay
                                        >
                                            {cat.name}
                                        </Chip>
                                    ))}
                                </ScrollView>
                            </View>

                            {/* Due Day */}
                            <View style={styles.section}>
                                <Text variant="titleMedium" style={styles.sectionTitle}>Due Day of Month</Text>
                                <TextInput
                                    label="Day (1-31)"
                                    value={dueDay}
                                    onChangeText={setDueDay}
                                    keyboardType="numeric"
                                    mode="outlined"
                                    maxLength={2}
                                    style={styles.input}
                                    right={<TextInput.Icon icon="calendar" />}
                                    theme={{ colors: { primary: colors.primary } }}
                                />
                            </View>

                            {/* Note */}
                            <View style={styles.section}>
                                <Text variant="titleMedium" style={styles.sectionTitle}>Note</Text>
                                <TextInput
                                    label="Description (Optional)"
                                    value={description}
                                    onChangeText={setDescription}
                                    mode="outlined"
                                    multiline
                                    style={styles.input}
                                    theme={{ colors: { primary: colors.primary } }}
                                />
                            </View>
                        </ScrollView>
                    </KeyboardAvoidingView>

                    <View style={styles.footerButtons}>
                        <Button mode="outlined" onPress={() => setIsAdding(false)} style={styles.cancelBtn} contentStyle={{ height: 48 }}>Cancel</Button>
                        <Button mode="contained" onPress={handleSave} style={styles.saveBtn} contentStyle={{ height: 48 }} buttonColor={colors.primary}>Save Bill</Button>
                    </View>
                </View>
            ) : (
                <View style={{ flex: 1 }}>
                     {/* Summary Header */}
                     <Surface style={styles.headerSummary} elevation={2}>
                         <View>
                            <Text variant="titleMedium" style={{color: 'white', opacity: 0.9}}>Total Monthly</Text>
                            <Text variant="displaySmall" style={{color: 'white', fontWeight: 'bold'}}>
                                {currency}{formatAmount(bills.reduce((acc, curr) => acc + curr.amount, 0))}
                            </Text>
                         </View>
                         <Avatar.Icon size={48} icon="calendar-check" style={{backgroundColor: 'rgba(255,255,255,0.2)'}} color="white" />
                     </Surface>

                    <ScrollView contentContainerStyle={styles.list}>
                        <Text variant="titleMedium" style={{ marginBottom: 10, fontWeight: 'bold', paddingHorizontal: 4, color: colors.textPrimary }}>Upcoming Bills</Text>
                        
                        {bills
                            .sort((a, b) => a.next_due_date - b.next_due_date)
                            .map(bill => {
                                const daysLeft = getDaysRemaining(bill.next_due_date);
                                const isUrgent = daysLeft <= 3;
                                
                                return (
                                    <Card key={bill.id} style={styles.card} elevation={0}>
                                        <View style={styles.cardInner}>
                                            <View style={[styles.dateBox, { backgroundColor: isUrgent ? '#FFEBEE' : '#E3F2FD' }]}>
                                                <Text variant="titleLarge" style={{ fontWeight: 'bold', color: isUrgent ? '#D32F2F' : '#1976D2' }}>
                                                    {bill.due_day}
                                                </Text>
                                                <Text variant="labelSmall" style={{ color: isUrgent ? '#D32F2F' : '#1976D2', fontWeight: 'bold' }}>DAY</Text>
                                            </View>
                                            
                                            <View style={styles.cardContent}>
                                                <View style={styles.rowBetween}>
                                                    <View>
                                                        <Text variant="titleMedium" style={{ fontWeight: 'bold', color: colors.textPrimary }}>{bill.categoryName}</Text>
                                                        {bill.description ? <Text variant="bodySmall" style={{ color: colors.textSecondary }}>{bill.description}</Text> : null}
                                                    </View>
                                                    <Text variant="titleLarge" style={{ fontWeight: 'bold', color: colors.textPrimary }}>
                                                        {currency}{formatAmount(bill.amount)}
                                                    </Text>
                                                </View>
                                                
                                                <View style={[styles.rowBetween, { marginTop: 8 }]}>
                                                     <Chip 
                                                        icon="clock-outline" 
                                                        style={{ backgroundColor: isUrgent ? '#FFEBEE' : '#F5F5F5', height: 28 }}
                                                        textStyle={{ fontSize: 12, color: isUrgent ? '#D32F2F' : 'gray', lineHeight: 18 }}
                                                        compact
                                                     >
                                                        {daysLeft < 0 ? 'Overdue' : daysLeft === 0 ? 'Due Today' : `${daysLeft} days left`}
                                                     </Chip>
                                                     <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                                        <Button mode="contained-tonal" compact onPress={() => handlePayPress(bill)} style={{marginRight: 8}} buttonColor={colors.primary + '20'} textColor={colors.primary}>
                                                            Pay
                                                        </Button>
                                                        <TouchableOpacity onPress={() => handleDelete(bill.id)}>
                                                            <Avatar.Icon size={24} icon="delete-outline" style={{backgroundColor: 'transparent'}} color={colors.textSecondary} />
                                                        </TouchableOpacity>
                                                     </View>
                                                </View>
                                            </View>
                                        </View>
                                    </Card>
                                );
                            })}

                        {bills.length === 0 && (
                             <View style={{ padding: 40, alignItems: 'center' }}>
                                 <Avatar.Icon size={64} icon="calendar-blank-outline" style={{backgroundColor: '#fff'}} color={colors.outline} />
                                 <Text style={{marginTop: 10, color: colors.textSecondary}}>No recurring bills set up.</Text>
                             </View>
                        )}
                    </ScrollView>

                    <FAB
                        icon="plus"
                        label="Add Bill"
                        style={[styles.fab, { backgroundColor: colors.primary }]}
                        color="white"
                        onPress={() => setIsAdding(true)}
                    />
                </View>
            )}

            <Portal>
                <Modal visible={isPayModalVisible} onDismiss={() => setIsPayModalVisible(false)} contentContainerStyle={styles.modalContainer}>
                    <Text variant="headlineSmall" style={{ marginBottom: 16, fontWeight: 'bold', color: colors.textPrimary }}>Pay Bill</Text>
                    
                    {selectedBill && (
                        <View style={{ marginBottom: 20, alignItems: 'center', backgroundColor: colors.background, padding: 16, borderRadius: 12 }}>
                            <Text variant="titleMedium" style={{ color: colors.textSecondary }}>{selectedBill.categoryName}</Text>
                            <Text variant="displayMedium" style={{ color: colors.primary, fontWeight: 'bold', marginVertical: 8 }}>
                                {currency}{formatAmount(selectedBill.amount)}
                            </Text>
                            <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>Due: {new Date(selectedBill.next_due_date).toLocaleDateString()}</Text>
                        </View>
                    )}

                    <Text variant="titleMedium" style={{ marginBottom: 10, fontWeight: 'bold' }}>Pay from Account</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                        {accounts.map(acc => (
                            <Chip
                                key={acc.id}
                                selected={selectedAccount === acc.id}
                                onPress={() => setSelectedAccount(acc.id)}
                                style={{ marginRight: 8, backgroundColor: selectedAccount === acc.id ? colors.primary + '20' : '#f0f0f0' }}
                                showSelectedOverlay
                                textStyle={{ color: selectedAccount === acc.id ? colors.primary : colors.textPrimary }}
                            >
                                {acc.name} ({currency}{formatAmount(acc.balance)})
                            </Chip>
                        ))}
                    </ScrollView>

                    <Button mode="contained" onPress={confirmPayment} style={{ marginTop: 10, borderRadius: 25 }} contentStyle={{ height: 48 }} buttonColor={colors.primary}>
                        Confirm Payment
                    </Button>
                </Modal>
            </Portal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    formContainer: { flex: 1, backgroundColor: colors.white },
    formScroll: { paddingBottom: 20 },
    formTitle: { fontWeight: 'bold', margin: 20, textAlign: 'center', color: colors.textPrimary },
    
    amountCard: { margin: 16, padding: 20, borderRadius: 16, backgroundColor: 'white', alignItems: 'center' },
    amountInputContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    amountInput: { backgroundColor: 'transparent', width: 200, textAlign: 'center', height: 60 },
    
    section: { paddingHorizontal: 16, marginBottom: 16 },
    sectionTitle: { marginBottom: 10, fontWeight: 'bold', color: colors.textPrimary },
    input: { backgroundColor: 'white' },
    
    footerButtons: { padding: 16, flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: 'white' },
    cancelBtn: { flex: 1, marginRight: 8, borderRadius: 25, borderColor: colors.outline },
    saveBtn: { flex: 1, borderRadius: 25 },
    
    headerSummary: { margin: 16, padding: 20, borderRadius: 16, backgroundColor: colors.primary, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    list: { padding: 16, paddingBottom: 80 },
    card: { marginBottom: 12, backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#eee' },
    cardInner: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    dateBox: { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    cardContent: { flex: 1 },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    fab: { position: 'absolute', margin: 16, right: 0, bottom: 20 },
    modalContainer: { backgroundColor: 'white', padding: 24, margin: 20, borderRadius: 16 }
});
