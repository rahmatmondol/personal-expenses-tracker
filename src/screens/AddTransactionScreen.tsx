import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInput, Button, Chip, Text, Divider, IconButton, useTheme, Card, Surface, SegmentedButtons, Avatar, ProgressBar, Switch } from 'react-native-paper';
import { useStore } from '../store/useStore';
import { useNavigation } from '@react-navigation/native';
import { TransactionItem } from '../types';
import { formatAmount } from '../utils/formatting';
import { colors } from '../utils/colors';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const AddTransactionScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation();
    const { categories, accounts, addTransaction, currency } = useStore();

    const [type, setType] = useState<'income' | 'expense'>('expense');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

    // Partial/Due state
    const [isPartial, setIsPartial] = useState(false);
    const [paidAmount, setPaidAmount] = useState('');
    const [shopName, setShopName] = useState('');
    const [dueDate, setDueDate] = useState(new Date());
    const [showDueDatePicker, setShowDueDatePicker] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
    const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
    const [accountAllocations, setAccountAllocations] = useState<{ [key: number]: string }>({});
    const [isMultiAccount, setIsMultiAccount] = useState(false);
    const [items, setItems] = useState<Omit<TransactionItem, 'id' | 'transactionId'>[]>([]);

    // Set default account
    React.useEffect(() => {
        if (accounts.length > 0) {
            if (!isMultiAccount && selectedAccount === null) {
                setSelectedAccount(accounts[0].id);
            } else if (isMultiAccount && selectedAccounts.length === 0) {
                // Pre-select first account if switching to multi
                setSelectedAccounts([accounts[0].id]);
            }
        }
    }, [accounts, isMultiAccount]);

    // Handle Account Selection logic
    const toggleAccount = (id: number) => {
        if (isMultiAccount) {
            if (selectedAccounts.includes(id)) {
                setSelectedAccounts(selectedAccounts.filter(accId => accId !== id));
                const newAlloc = { ...accountAllocations };
                delete newAlloc[id];
                setAccountAllocations(newAlloc);
            } else {
                setSelectedAccounts([...selectedAccounts, id]);
            }
        } else {
            setSelectedAccount(id);
        }
    };

    // Helper to calculate remaining amount for allocations
    const getUnallocatedAmount = () => {
        const total = parseFloat(amount) || 0;
        let allocated = 0;
        Object.values(accountAllocations).forEach(val => {
            allocated += parseFloat(val) || 0;
        });
        return total - allocated;
    };

    const distributeEvenly = () => {
        const total = parseFloat(amount);
        if (!total || selectedAccounts.length === 0) return;

        const count = selectedAccounts.length;
        const split = Math.floor(total / count);
        const newAlloc: { [key: number]: string } = {};

        let distributed = 0;
        selectedAccounts.forEach((accId, index) => {
            if (index === count - 1) {
                // Give the remainder to the last one to ensure exact sum
                newAlloc[accId] = (total - distributed).toString();
            } else {
                newAlloc[accId] = split.toString();
                distributed += split;
            }
        });
        setAccountAllocations(newAlloc);
    };

    const fillRemaining = (accId: number) => {
        const total = parseFloat(amount) || 0;
        let otherAllocated = 0;
        selectedAccounts.forEach(id => {
            if (id !== accId) {
                otherAllocated += parseFloat(accountAllocations[id]) || 0;
            }
        });
        const remaining = total - otherAllocated;
        if (remaining > 0) {
            setAccountAllocations(prev => ({ ...prev, [accId]: remaining.toFixed(2) }));
        }
    };

    const handleAllocationChange = (id: number, val: string) => {
        setAccountAllocations(prev => ({ ...prev, [id]: val }));
    };

    // Item Input State
    const [itemName, setItemName] = useState('');
    const [itemQty, setItemQty] = useState('');
    const [itemUnit, setItemUnit] = useState('');
    const [itemPrice, setItemPrice] = useState('');
    const [showItemInput, setShowItemInput] = useState(false);

    const handleAddItem = () => {
        if (!itemName || !itemQty || !itemPrice) {
            Alert.alert('Error', 'Please fill Item Name, Quantity and Price');
            return;
        }
        setItems([
            ...items,
            {
                name: itemName,
                quantity: parseFloat(itemQty),
                unit: itemUnit || 'pcs',
                pricePerUnit: parseFloat(itemPrice)
            }
        ]);
        // Clear inputs
        setItemName('');
        setItemQty('');
        setItemUnit('');
        setItemPrice('');
        setShowItemInput(false);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const handleSave = () => {
        if (!amount || !selectedCategory) {
            Alert.alert('Error', 'Please enter Amount and Category');
            return;
        }

        const totalAmount = parseFloat(amount);
        let finalPaidAmount = totalAmount;

        if (isPartial) {
            finalPaidAmount = parseFloat(paidAmount) || 0;
            if (finalPaidAmount > totalAmount) {
                Alert.alert('Error', 'Paid amount cannot be greater than total amount');
                return;
            }
            if (!shopName) {
                Alert.alert('Error', 'Please enter shop/contact name for the pending bill');
                return;
            }
        }

        // Validation for Allocations
        let finalAllocations: { accountId: number; amount: number }[] | undefined = undefined;
        let finalAccountId = selectedAccount;

        // If partial, the transaction amount is the paid amount
        const transactionAmount = isPartial ? finalPaidAmount : totalAmount;

        if (isMultiAccount) {
            if (selectedAccounts.length === 0) {
                Alert.alert('Error', 'Please select at least one account');
                return;
            }

            // Check if amounts sum up
            let allocatedSum = 0;
            const allocs: { accountId: number; amount: number }[] = [];

            for (const accId of selectedAccounts) {
                const val = parseFloat(accountAllocations[accId]) || 0;
                if (val <= 0 && transactionAmount > 0) {
                    Alert.alert('Error', 'Allocation amount must be greater than 0');
                    return;
                }

                // Check Balance if Expense
                if (type === 'expense') {
                    const acc = accounts.find(a => a.id === accId);
                    if (acc && acc.balance < val) {
                        Alert.alert('Error', `Insufficient balance in ${acc.name}`);
                        return;
                    }
                }

                allocatedSum += val;
                allocs.push({ accountId: accId, amount: val });
            }

            if (Math.abs(allocatedSum - transactionAmount) > 0.01) {
                Alert.alert('Error', `Allocated sum (${currency}${allocatedSum}) must match transaction amount (${currency}${transactionAmount})`);
                return;
            }
            finalAllocations = allocs;
            finalAccountId = null;
        } else if (finalAccountId) {
            // Single Account Check
            if (type === 'expense') {
                const acc = accounts.find(a => a.id === finalAccountId);
                if (acc && acc.balance < transactionAmount) {
                    Alert.alert('Error', `Insufficient balance in ${acc.name}`);
                    return;
                }
            }
        } else if (transactionAmount > 0) {
            Alert.alert('Error', 'Please select an account for the paid amount');
            return;
        }

        addTransaction(
            transactionAmount,
            Date.now(),
            selectedCategory,
            note,
            items,
            finalAccountId || undefined,
            finalAllocations,
            isPartial ? {
                amount: totalAmount - finalPaidAmount,
                contactName: shopName,
                dueDate: dueDate.getTime()
            } : undefined
        );
        navigation.goBack();
    };

    // Auto-calculate total from items if items exist
    React.useEffect(() => {
        if (items.length > 0) {
            const total = items.reduce((sum, item) => sum + (item.quantity * item.pricePerUnit), 0);
            setAmount(formatAmount(total));
        }
    }, [items]);

    const filteredCategories = categories.filter(c => c.type === type);

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 10}
            >
                <ScrollView
                    style={styles.container}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    keyboardShouldPersistTaps="handled"
                >

                    {/* Transaction Type Toggle */}
                    <View style={styles.header}>
                        <SegmentedButtons
                            value={type}
                            onValueChange={value => {
                                setType(value as 'income' | 'expense');
                                setSelectedCategory(null); // Reset category on switch
                            }}
                            theme={{
                                colors: {
                                    secondaryContainer: theme.colors.primary,
                                    onSecondaryContainer: 'white',
                                }
                            }}
                            buttons={[
                                { value: 'expense', label: 'Expense', icon: 'cart-outline' },
                                { value: 'income', label: 'Income', icon: 'cash' },
                            ]}
                        />
                    </View>

                    {/* Account Selection */}
                    {accounts.length > 0 && (
                        <View style={{ paddingHorizontal: 16, marginTop: 10 }}>
                            <View style={styles.rowBetween}>
                                <Text variant="titleMedium" style={{ marginBottom: 8, fontWeight: 'bold' }}>Account</Text>
                                <TouchableOpacity onPress={() => setIsMultiAccount(!isMultiAccount)}>
                                    <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                                        {isMultiAccount ? 'Switch to Single' : 'Split Payment'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
                                {accounts.map(acc => {
                                    const isSelected = isMultiAccount ? selectedAccounts.includes(acc.id) : selectedAccount === acc.id;
                                    return (
                                        <Chip
                                            key={acc.id}
                                            selected={isSelected}
                                            onPress={() => toggleAccount(acc.id)}
                                            style={{ marginRight: 8 }}
                                            showSelectedOverlay
                                            avatar={<Avatar.Icon size={24} icon={acc.icon || 'bank'} style={{ backgroundColor: acc.color }} color="white" />}
                                        >
                                            {acc.name} • {currency}{formatAmount(acc.balance)}
                                        </Chip>
                                    );
                                })}
                            </ScrollView>

                            {/* Multi Allocation Inputs */}
                            {isMultiAccount && selectedAccounts.length > 0 && (
                                <View style={styles.splitSection}>
                                    <View style={styles.splitHeader}>
                                        <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Split Breakdown</Text>
                                        <Chip icon="scale-balance" mode="outlined" onPress={distributeEvenly} compact>Auto Split</Chip>
                                    </View>

                                    {selectedAccounts.map(accId => {
                                        const acc = accounts.find(a => a.id === accId);
                                        if (!acc) return null;
                                        return (
                                            <View key={accId} style={styles.splitRow}>
                                                <Avatar.Icon size={40} icon={acc.icon || 'bank'} style={{ backgroundColor: acc.color }} color="white" />

                                                <View style={{ flex: 1, marginLeft: 12, justifyContent: 'center' }}>
                                                    <Text variant="bodyLarge" style={{ fontWeight: 'bold' }}>{acc.name}</Text>
                                                    <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
                                                        Avail: {currency}{formatAmount(acc.balance)}
                                                    </Text>
                                                </View>

                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    {getUnallocatedAmount() > 0 && (
                                                        <TouchableOpacity onPress={() => fillRemaining(accId)} style={{ marginRight: 4, padding: 4 }}>
                                                            <Text style={{ color: theme.colors.primary, fontSize: 10, fontWeight: 'bold' }}>FILL</Text>
                                                        </TouchableOpacity>
                                                    )}
                                                    <TextInput
                                                        value={accountAllocations[accId] || ''}
                                                        onChangeText={(val) => handleAllocationChange(accId, val)}
                                                        keyboardType="numeric"
                                                        mode="flat"
                                                        placeholder="0"
                                                        style={{ backgroundColor: 'transparent', width: 90, height: 40, fontSize: 16 }}
                                                        contentStyle={{ textAlign: 'right', fontWeight: 'bold', fontSize: 16 }}
                                                        underlineColor="transparent"
                                                        activeUnderlineColor={theme.colors.primary}
                                                        right={<TextInput.Affix text={currency} />}
                                                    />
                                                </View>
                                            </View>
                                        );
                                    })}

                                    <Divider style={{ marginVertical: 10 }} />

                                    <View style={styles.splitFooter}>
                                        <View style={{ flex: 1 }}>
                                            <Text variant="labelSmall" style={{ color: theme.colors.secondary }}>Remaining to allocate</Text>
                                            <Text variant="titleMedium" style={{ color: getUnallocatedAmount() !== 0 ? theme.colors.error : theme.colors.primary, fontWeight: 'bold' }}>
                                                {currency}{formatAmount(getUnallocatedAmount())}
                                            </Text>
                                        </View>
                                        <ProgressBar
                                            progress={parseFloat(amount) ? (parseFloat(amount) - getUnallocatedAmount()) / parseFloat(amount) : 0}
                                            color={getUnallocatedAmount() < 0 ? theme.colors.error : theme.colors.primary}
                                            style={{ height: 8, borderRadius: 4, width: 120, backgroundColor: '#eee' }}
                                        />
                                    </View>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Main Amount Input */}
                    <Surface style={styles.amountCard} elevation={1}>
                        <Text variant="titleSmall" style={{ color: theme.colors.secondary }}>Total Amount</Text>
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

                    {/* Partial/Due Toggle (Only for Expense) */}
                    {type === 'expense' && (
                        <View style={styles.section}>
                            <Surface style={styles.partialCard} elevation={1}>
                                <View style={styles.rowBetween}>
                                    <View>
                                        <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Partial/Pending Bill</Text>
                                        <Text variant="bodySmall" style={{ color: theme.colors.outline }}>Mark if you're not paying the full amount now</Text>
                                    </View>
                                    <Switch value={isPartial} onValueChange={setIsPartial} color={theme.colors.primary} />
                                </View>

                                {isPartial && (
                                    <View style={{ marginTop: 16 }}>
                                        <TextInput
                                            label="Amount Paid Now"
                                            value={paidAmount}
                                            onChangeText={setPaidAmount}
                                            keyboardType="numeric"
                                            mode="outlined"
                                            style={styles.input}
                                            left={<TextInput.Affix text={currency} />}
                                        />
                                        <Text variant="labelSmall" style={{ color: theme.colors.error, marginBottom: 12, marginLeft: 4 }}>
                                            Remaining Due: {currency}{formatAmount(Math.max(0, (parseFloat(amount) || 0) - (parseFloat(paidAmount) || 0)))}
                                        </Text>

                                        <TextInput
                                            label="Shop / Contact Name"
                                            placeholder="Who do you owe?"
                                            value={shopName}
                                            onChangeText={setShopName}
                                            mode="outlined"
                                            style={styles.input}
                                            left={<TextInput.Icon icon="store-outline" />}
                                        />

                                        <TouchableOpacity onPress={() => setShowDueDatePicker(true)} style={styles.datePicker}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <MaterialCommunityIcons name="calendar-clock" size={24} color={theme.colors.primary} />
                                                <View style={{ marginLeft: 12 }}>
                                                    <Text variant="labelSmall" style={{ color: theme.colors.outline }}>Due Date</Text>
                                                    <Text variant="bodyLarge">{dueDate.toLocaleDateString()}</Text>
                                                </View>
                                            </View>
                                            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.outline} />
                                        </TouchableOpacity>

                                        {showDueDatePicker && (
                                            <DateTimePicker
                                                value={dueDate}
                                                mode="date"
                                                display="default"
                                                onChange={(event, date) => {
                                                    setShowDueDatePicker(false);
                                                    if (date) setDueDate(date);
                                                }}
                                                minimumDate={new Date()}
                                            />
                                        )}
                                    </View>
                                )}
                            </Surface>
                        </View>
                    )}

                    {/* Category Selection */}
                    <View style={styles.section}>
                        <Text variant="titleMedium" style={styles.sectionTitle}>Category</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipContainer}>
                            {filteredCategories.map(cat => (
                                <TouchableOpacity
                                    key={cat.id}
                                    onPress={() => setSelectedCategory(cat.id)}
                                    style={[
                                        styles.categoryItem,
                                        selectedCategory === cat.id && { backgroundColor: theme.colors.secondaryContainer, borderColor: theme.colors.primary }
                                    ]}
                                >
                                    <Avatar.Icon
                                        size={40}
                                        icon={cat.icon || 'tag'}
                                        style={{ backgroundColor: selectedCategory === cat.id ? theme.colors.primary : cat.color }}
                                        color="white"
                                    />
                                    <Text
                                        variant="labelMedium"
                                        style={[
                                            styles.categoryText,
                                            selectedCategory === cat.id && { fontWeight: 'bold', color: theme.colors.primary }
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {cat.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Note Input */}
                    <View style={styles.section}>
                        <TextInput
                            label="Note (Optional)"
                            mode="outlined"
                            value={note}
                            onChangeText={setNote}
                            left={<TextInput.Icon icon="note-text-outline" />}
                            style={{ backgroundColor: 'white' }}
                        />
                    </View>

                    <Divider style={styles.divider} />

                    {/* Itemized List Section */}
                    <View style={styles.section}>
                        <View style={styles.rowBetween}>
                            <Text variant="titleMedium">Items Breakdown</Text>
                            <Button mode="text" onPress={() => setShowItemInput(!showItemInput)} icon={showItemInput ? "chevron-up" : "plus"}>
                                {showItemInput ? "Hide" : "Add Item"}
                            </Button>
                        </View>

                        {showItemInput && (
                            <Card style={styles.itemInputCard}>
                                <Card.Content>
                                    <TextInput label="Item Name" value={itemName} onChangeText={setItemName} mode="outlined" style={styles.inputSpacing} />
                                    <View style={styles.row}>
                                        <TextInput label="Qty" value={itemQty} onChangeText={setItemQty} keyboardType="numeric" mode="outlined" style={[styles.flexInput, { flex: 1 }]} />
                                        <TextInput label="Unit" value={itemUnit} onChangeText={setItemUnit} placeholder="kg" mode="outlined" style={[styles.flexInput, { flex: 1 }]} />
                                    </View>
                                    <View style={styles.row}>
                                        <TextInput label="Price/Unit" value={itemPrice} onChangeText={setItemPrice} keyboardType="numeric" mode="outlined" style={[styles.flexInput, { flex: 1 }]} left={<TextInput.Affix text={currency} />} />
                                    </View>
                                    <Button mode="contained" onPress={handleAddItem} style={{ marginTop: 10 }}>
                                        Add Item
                                    </Button>
                                </Card.Content>
                            </Card>
                        )}

                        {/* Items List */}
                        {items.map((item, index) => (
                            <Surface key={index} style={styles.itemRow} elevation={1}>
                                <View style={{ flex: 1 }}>
                                    <Text variant="bodyLarge" style={{ fontWeight: 'bold' }}>{item.name}</Text>
                                    <Text variant="bodySmall" style={{ color: 'gray' }}>{item.quantity} {item.unit} x {currency}{item.pricePerUnit}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text variant="bodyLarge" style={{ fontWeight: 'bold' }}>{currency}{formatAmount(item.quantity * item.pricePerUnit)}</Text>
                                    <TouchableOpacity onPress={() => handleRemoveItem(index)}>
                                        <Text style={{ color: theme.colors.error, fontSize: 12 }}>Remove</Text>
                                    </TouchableOpacity>
                                </View>
                            </Surface>
                        ))}
                    </View>
                    <View style={styles.footer}>
                        <Button mode="contained" onPress={handleSave} style={styles.saveButton} contentStyle={{ height: 50 }}>
                            Save Transaction
                        </Button>
                    </View>
                    <View style={{ height: 40 }}></View>
                </ScrollView>
            </KeyboardAvoidingView>
            {/* Floating Save Button */}

        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        padding: 16,
    },
    amountCard: { margin: 16, padding: 20, borderRadius: 16, backgroundColor: colors.white, alignItems: 'center' },
    amountInputContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    amountInput: {
        backgroundColor: 'transparent',
        width: 250,
        textAlign: 'center',
        height: 80,
    },
    partialCard: {
        padding: 16,
        borderRadius: 12,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#FFE0B2', // Light orange border
    },
    datePicker: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        backgroundColor: '#F9F9F9',
        marginTop: 8,
    },
    section: {
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    sectionTitle: { marginBottom: 10, fontWeight: 'bold' },
    chipContainer: { paddingVertical: 8 },
    categoryItem: { alignItems: 'center', marginRight: 16, width: 70, padding: 5, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
    categoryText: { marginTop: 4, textAlign: 'center', fontSize: 12 },
    divider: { marginVertical: 10 },
    row: { flexDirection: 'row', marginBottom: 10 },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    flexInput: { marginRight: 8, backgroundColor: 'white' },
    inputSpacing: { marginBottom: 10, backgroundColor: 'white' },
    itemInputCard: { marginBottom: 16, backgroundColor: 'white' },
    itemRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: 'white', marginBottom: 8, borderRadius: 12, alignItems: 'center' },
    footer: {
        paddingHorizontal: 16,
        backgroundColor: 'transparent',
    },
    saveButton: { borderRadius: 25 },
    splitSection: { marginTop: 10, backgroundColor: 'white', padding: 16, borderRadius: 12 },
    splitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    splitRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    splitFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 },
});
