import React, { useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, Appbar, SegmentedButtons, Card, HelperText, Avatar, useTheme, Chip, Divider, Surface } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as repo from '../db/repo';
import { colors } from '../utils/colors';
import { useStore } from '../store/useStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const AddLoanScreen = () => {
    const navigation = useNavigation();
    const theme = useTheme();
    const accounts = useStore(state => state.accounts);

    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [interestRate, setInterestRate] = useState('');
    const [startDate, setStartDate] = useState(new Date());
    const [frequency, setFrequency] = useState('monthly');
    const [description, setDescription] = useState('');
    const [duration, setDuration] = useState(''); // Number of installments
    const [showPicker, setShowPicker] = useState(false);
    const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

    // Derived calculations for preview
    const summary = useMemo(() => {
        const principal = parseFloat(amount) || 0;
        const rate = parseFloat(interestRate) || 0;
        const numberOfInstallments = parseInt(duration) || 0;

        if (principal === 0 || numberOfInstallments === 0) return null;

        const totalInterest = Math.round(principal * (rate / 100));
        const totalRepayable = principal + totalInterest;
        const installmentAmount = Math.round(totalRepayable / numberOfInstallments);

        return {
            totalRepayable,
            totalInterest,
            installmentAmount
        };
    }, [amount, interestRate, duration]);

    const handleSave = () => {
        if (!title || !amount || !interestRate || !duration) {
            Alert.alert('Error', 'Please fill all required fields');
            return;
        }

        const principal = parseFloat(amount);
        const rate = parseFloat(interestRate);
        const numberOfInstallments = parseInt(duration);

        if (isNaN(principal) || isNaN(rate) || isNaN(numberOfInstallments)) {
             Alert.alert('Error', 'Invalid number format');
             return;
        }

        const totalInterest = Math.round(principal * (rate / 100));
        const totalRepayable = principal + totalInterest;
        const installmentAmount = Math.round(totalRepayable / numberOfInstallments);

        const installments = [];
        let currentDate = new Date(startDate);

        for (let i = 0; i < numberOfInstallments; i++) {
            // Calculate next date based on frequency
            // First installment is usually one period after start date, or start date itself?
            // Let's assume start date is the disbursement date, first payment is 1 period later.
            // Or usually start date IS the first payment date?
            // The previous code used start date + period for subsequent ones.
            // Let's stick to: first installment is 1 period AFTER start date.
            // Wait, previous code:
            // if (i > 0) ... currentDate.setDate...
            // This implies the first installment is ON the start date? That's unusual for loans.
            // Usually you get money on start date, pay later.
            // Let's change it so the first payment is 1 period after start date.
            
            if (frequency === 'daily') {
                currentDate.setDate(currentDate.getDate() + 1);
            } else if (frequency === 'weekly') {
                currentDate.setDate(currentDate.getDate() + 7);
            } else if (frequency === 'monthly') {
                currentDate.setMonth(currentDate.getMonth() + 1);
            }
            
            installments.push({
                due_date: currentDate.getTime(),
                amount: installmentAmount
            });
        }

        repo.addLoan({
            title,
            principal_amount: principal,
            interest_rate: rate,
            total_repayable: totalRepayable,
            start_date: startDate.getTime(),
            installment_frequency: frequency as any,
            installment_amount: installmentAmount,
            status: 'active',
            description,
            remaining_amount: totalRepayable
        }, installments, selectedAccountId || undefined);

        // Refresh store
        useStore.getState().refreshData();
        navigation.goBack();
    };

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <ScrollView contentContainerStyle={styles.content}>
                    
                    {/* Section 1: Loan Details */}
                    <Card style={styles.card}>
                        <Card.Content>
                            <Text variant="titleMedium" style={styles.sectionTitle}>Loan Details</Text>
                            
                            <TextInput
                                label="Loan Title"
                                placeholder="e.g. Home Loan, Car Loan"
                                value={title}
                                onChangeText={setTitle}
                                style={styles.input}
                                mode="outlined"
                                outlineColor={colors.border}
                                activeOutlineColor={colors.primary}
                            />
                            
                            <View style={styles.row}>
                                <TextInput
                                    label="Amount"
                                    value={amount}
                                    onChangeText={setAmount}
                                    keyboardType="numeric"
                                    style={[styles.input, { flex: 1, marginRight: 8 }]}
                                    mode="outlined"
                                    left={<TextInput.Affix text="৳" />}
                                    outlineColor={colors.border}
                                    activeOutlineColor={colors.primary}
                                />
                                <TextInput
                                    label="Interest (%)"
                                    value={interestRate}
                                    onChangeText={setInterestRate}
                                    keyboardType="numeric"
                                    style={[styles.input, { flex: 1, marginLeft: 8 }]}
                                    mode="outlined"
                                    outlineColor={colors.border}
                                    activeOutlineColor={colors.primary}
                                />
                            </View>

                            <TouchableOpacity onPress={() => setShowPicker(true)}>
                                <TextInput
                                    label="Start Date"
                                    value={startDate.toLocaleDateString()}
                                    editable={false}
                                    style={styles.input}
                                    mode="outlined"
                                    right={<TextInput.Icon icon="calendar" />}
                                    outlineColor={colors.border}
                                    activeOutlineColor={colors.primary}
                                />
                            </TouchableOpacity>
                            {showPicker && (
                                <DateTimePicker
                                    value={startDate}
                                    mode="date"
                                    display="default"
                                    onChange={(event, selectedDate) => {
                                        setShowPicker(false);
                                        if (selectedDate) setStartDate(selectedDate);
                                    }}
                                />
                            )}
                        </Card.Content>
                    </Card>

                    {/* Section 2: Repayment Plan */}
                    <Card style={styles.card}>
                        <Card.Content>
                            <Text variant="titleMedium" style={styles.sectionTitle}>Repayment Plan</Text>
                            
                            <Text variant="bodySmall" style={styles.label}>Frequency</Text>
                            <SegmentedButtons
                                value={frequency}
                                onValueChange={setFrequency}
                                buttons={[
                                    { value: 'daily', label: 'Daily' },
                                    { value: 'weekly', label: 'Weekly' },
                                    { value: 'monthly', label: 'Monthly' },
                                ]}
                                style={styles.input}
                                density="medium"
                            />

                            <TextInput
                                label="Number of Installments"
                                value={duration}
                                onChangeText={setDuration}
                                keyboardType="numeric"
                                style={styles.input}
                                mode="outlined"
                                outlineColor={colors.border}
                                activeOutlineColor={colors.primary}
                            />

                            {summary && (
                                <Surface style={styles.summaryContainer} elevation={0}>
                                    <View style={styles.summaryRow}>
                                        <Text variant="bodyMedium" style={{color: colors.textSecondary}}>Installment:</Text>
                                        <Text variant="titleSmall" style={{color: colors.primary}}>৳{summary.installmentAmount}</Text>
                                    </View>
                                    <View style={styles.summaryRow}>
                                        <Text variant="bodyMedium" style={{color: colors.textSecondary}}>Total Interest:</Text>
                                        <Text variant="bodyMedium" style={{color: colors.error}}>৳{summary.totalInterest}</Text>
                                    </View>
                                    <Divider style={{marginVertical: 8}}/>
                                    <View style={styles.summaryRow}>
                                        <Text variant="titleSmall">Total Repayable:</Text>
                                        <Text variant="titleMedium">৳{summary.totalRepayable}</Text>
                                    </View>
                                </Surface>
                            )}
                        </Card.Content>
                    </Card>

                    {/* Section 3: Deposit To */}
                    <Card style={styles.card}>
                        <Card.Content>
                            <Text variant="titleMedium" style={styles.sectionTitle}>Deposit To Account (Optional)</Text>
                            <Text variant="bodySmall" style={{color: colors.textSecondary, marginBottom: 12}}>
                                Select an account to add the loan principal amount to its balance.
                            </Text>
                            
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={styles.accountContainer}>
                                    <TouchableOpacity 
                                        style={[
                                            styles.accountChip, 
                                            selectedAccountId === null && styles.accountChipSelected,
                                            { borderColor: colors.border }
                                        ]}
                                        onPress={() => setSelectedAccountId(null)}
                                    >
                                        <Text style={[
                                            styles.accountChipText,
                                            selectedAccountId === null && styles.accountChipTextSelected
                                        ]}>None</Text>
                                    </TouchableOpacity>
                                    
                                    {accounts.map(acc => (
                                        <TouchableOpacity 
                                            key={acc.id}
                                            style={[
                                                styles.accountChip,
                                                selectedAccountId === acc.id && styles.accountChipSelected,
                                                { borderColor: acc.color || colors.border }
                                            ]}
                                            onPress={() => setSelectedAccountId(acc.id)}
                                        >
                                            {acc.icon && (
                                                <MaterialCommunityIcons 
                                                    name={acc.icon as any} 
                                                    size={16} 
                                                    color={selectedAccountId === acc.id ? 'white' : (acc.color || colors.textPrimary)} 
                                                    style={{marginRight: 6}}
                                                />
                                            )}
                                            <Text style={[
                                                styles.accountChipText,
                                                selectedAccountId === acc.id && styles.accountChipTextSelected
                                            ]}>{acc.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>
                        </Card.Content>
                    </Card>

                    {/* Section 4: Description */}
                    <Card style={styles.card}>
                        <Card.Content>
                            <TextInput
                                label="Description (Optional)"
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                numberOfLines={3}
                                style={[styles.input, { height: 80 }]}
                                mode="outlined"
                                outlineColor={colors.border}
                                activeOutlineColor={colors.primary}
                            />
                        </Card.Content>
                    </Card>

                    <Button 
                        mode="contained" 
                        onPress={handleSave} 
                        style={styles.saveButton} 
                        buttonColor={colors.primary}
                        contentStyle={{ height: 48 }}
                    >
                        Save Loan
                    </Button>
                    <View style={{height: 40}} />
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: 16,
    },
    card: {
        marginBottom: 16,
        backgroundColor: 'white',
        borderRadius: 12,
        elevation: 1,
    },
    sectionTitle: {
        marginBottom: 16,
        fontWeight: '600',
        color: colors.textPrimary
    },
    input: {
        marginBottom: 16,
        backgroundColor: 'white',
        fontSize: 15,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    label: {
        marginBottom: 8,
        color: colors.textSecondary
    },
    summaryContainer: {
        backgroundColor: colors.background,
        padding: 12,
        borderRadius: 8,
        marginTop: 8,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    accountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    accountChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 8,
        backgroundColor: 'white',
    },
    accountChipSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    accountChipText: {
        color: colors.textPrimary,
        fontSize: 14,
    },
    accountChipTextSelected: {
        color: 'white',
        fontWeight: '600',
    },
    saveButton: {
        marginTop: 8,
        borderRadius: 8,
    }
});
