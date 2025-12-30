import React, { useEffect, useState } from 'react';
import { View, StyleSheet, SectionList, Alert, TouchableOpacity, Platform } from 'react-native';
import { Text, useTheme, Appbar, Surface, Avatar, Button } from 'react-native-paper';
import { useStore } from '../store/useStore';
import { useNavigation, useRoute } from '@react-navigation/native';
import { formatAmount } from '../utils/formatting';
import { Transaction } from '../types';
import DateTimePicker from '@react-native-community/datetimepicker';

export const TransactionHistoryScreen = () => {
    const { transactions, deleteTransaction, currency, filterTransactions } = useStore();
    const navigation = useNavigation();
    const route = useRoute();
    const { accountId, accountName } = route.params as { accountId?: number; accountName?: string } || {};
    const theme = useTheme();

    const [startDate, setStartDate] = useState(
        accountId 
            ? new Date(2000, 0, 1) // Show all history for account
            : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    );
    const [endDate, setEndDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState<'start' | 'end' | null>(null);

    // Re-fetch when accountId changes (e.g. navigation)
    useEffect(() => {
        if (accountId) {
             setStartDate(new Date(2000, 0, 1));
        } else {
             setStartDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
        }
    }, [accountId]);

    useEffect(() => {
        handleFilter();
    }, [startDate, endDate, accountId]);

    const handleFilter = () => {
        // Set end date to end of day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        
        // Set start date to beginning of day
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        filterTransactions(start.getTime(), end.getTime(), accountId);
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        const type = showPicker;
        setShowPicker(null);

        if (selectedDate && type) {
            if (type === 'start') {
                setStartDate(selectedDate);
            } else {
                setEndDate(selectedDate);
            }
        }
    };

    // Group transactions by date
    const groupedTransactions = React.useMemo(() => {
        const groups: { title: string; data: Transaction[] }[] = [];
        
        transactions.forEach(t => {
            const date = new Date(t.date);
            const title = date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            
            const existingGroup = groups.find(g => g.title === title);
            if (existingGroup) {
                existingGroup.data.push(t);
            } else {
                groups.push({ title, data: [t] });
            }
        });
        
        return groups;
    }, [transactions]);

    // Calculate Totals
    const { totalIncome, totalExpense } = React.useMemo(() => {
        let income = 0;
        let expense = 0;
        transactions.forEach(t => {
            if (t.categoryType === 'income') {
                income += t.amount;
            } else {
                expense += t.amount;
            }
        });
        return { totalIncome: income, totalExpense: expense };
    }, [transactions]);

    const handleDelete = (id: number) => {
        Alert.alert(
            'Delete Transaction',
            'Are you sure you want to delete this transaction?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteTransaction(id) }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <Appbar.Header style={{ backgroundColor: 'white' }}>
                <Appbar.BackAction onPress={() => navigation.goBack()} />
                <Appbar.Content title={accountName ? `${accountName} History` : "Transaction History"} />
            </Appbar.Header>

            <Surface style={styles.filterContainer} elevation={1}>
                <View style={styles.dateCol}>
                    <Text variant="labelSmall" style={{color: 'gray'}}>From Date</Text>
                    <Button 
                        mode="outlined" 
                        onPress={() => setShowPicker('start')}
                        compact
                        style={{ borderColor: '#ddd' }}
                    >
                        {startDate.toLocaleDateString()}
                    </Button>
                </View>

                <Text style={{ marginHorizontal: 10, alignSelf: 'center', marginTop: 15 }}>-</Text>

                <View style={styles.dateCol}>
                    <Text variant="labelSmall" style={{color: 'gray'}}>To Date</Text>
                    <Button 
                        mode="outlined" 
                        onPress={() => setShowPicker('end')}
                        compact
                        style={{ borderColor: '#ddd' }}
                    >
                        {endDate.toLocaleDateString()}
                    </Button>
                </View>
            </Surface>

            {showPicker && (
                <DateTimePicker
                    value={showPicker === 'start' ? startDate : endDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onDateChange}
                    maximumDate={new Date()}
                />
            )}

            {/* Summary Card */}
            {transactions.length > 0 && (
                <Surface style={styles.summaryCard} elevation={2}>
                    <View style={styles.summaryItem}>
                        <Text variant="labelMedium" style={{color: 'gray'}}>Total Income</Text>
                        <Text variant="titleMedium" style={{color: '#4CAF50', fontWeight: 'bold'}}>
                            {currency}{formatAmount(totalIncome)}
                        </Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                        <Text variant="labelMedium" style={{color: 'gray'}}>Total Expense</Text>
                        <Text variant="titleMedium" style={{color: '#F44336', fontWeight: 'bold'}}>
                            {currency}{formatAmount(totalExpense)}
                        </Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                        <Text variant="labelMedium" style={{color: 'gray'}}>Net Result</Text>
                        <Text variant="titleMedium" style={{color: totalIncome >= totalExpense ? '#2196F3' : '#F44336', fontWeight: 'bold'}}>
                            {totalIncome >= totalExpense ? '+' : '-'}{currency}{formatAmount(Math.abs(totalIncome - totalExpense))}
                        </Text>
                    </View>
                </Surface>
            )}

            <SectionList
                sections={groupedTransactions}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ paddingBottom: 50 }}
                renderSectionHeader={({ section: { title } }) => (
                    <Surface style={styles.header} elevation={0}>
                        <Text variant="labelMedium" style={{ color: theme.colors.secondary, fontWeight: 'bold' }}>{title}</Text>
                    </Surface>
                )}
                renderItem={({ item }) => (
                    <Surface style={styles.card} elevation={1}>
                        <TouchableOpacity 
                            onLongPress={() => handleDelete(item.id)}
                            style={styles.cardContent}
                        >
                            <View style={styles.leftContent}>
                                <Avatar.Icon 
                                    size={40} 
                                    icon={item.categoryIcon || 'tag'} 
                                    style={{ backgroundColor: item.categoryColor || theme.colors.primary }} 
                                    color="white"
                                />
                                <View style={{ marginLeft: 12, flex: 1 }}>
                                    <Text variant="titleMedium" numberOfLines={1}>
                                        {item.note || item.categoryName}
                                    </Text>
                                    <Text variant="bodySmall" style={{ color: 'gray' }}>
                                        {item.categoryName} • {item.accountName || (item.accountId === null ? 'Multiple Accounts' : 'Cash')}
                                    </Text>
                                </View>
                            </View>
                            
                            <View style={styles.rightContent}>
                                <Text 
                                    variant="titleMedium" 
                                    style={{ 
                                        fontWeight: 'bold', 
                                        color: item.categoryType === 'income' ? '#4CAF50' : '#F44336' 
                                    }}
                                >
                                    {item.categoryType === 'income' ? '+' : '-'}{currency}{formatAmount(item.amount)}
                                </Text>
                                {item.items && item.items.length > 0 && (
                                    <Text variant="bodySmall" style={{ color: 'gray' }}>
                                        {item.items.length} items
                                    </Text>
                                )}
                            </View>
                        </TouchableOpacity>
                    </Surface>
                )}
                stickySectionHeadersEnabled={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Avatar.Icon size={64} icon="history" style={{ backgroundColor: '#eee' }} color="gray" />
                        <Text style={{ marginTop: 10, color: 'gray' }}>No transactions found</Text>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    header: { 
        paddingHorizontal: 16, 
        paddingVertical: 8, 
        backgroundColor: '#f5f5f5' 
    },
    filterContainer: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: 'white',
        borderRadius: 8,
        margin: 16,
        marginBottom: 10,
        justifyContent: 'center'
    },
    dateCol: {
        flex: 1
    },
    summaryCard: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 10,
        padding: 16,
        backgroundColor: 'white',
        borderRadius: 12,
        justifyContent: 'space-between'
    },
    summaryItem: {
        alignItems: 'center',
        flex: 1
    },
    summaryDivider: {
        width: 1,
        backgroundColor: '#eee',
        height: '100%'
    },
    card: {
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 12,
        backgroundColor: 'white',
        overflow: 'hidden'
    },
    cardContent: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    leftContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1
    },
    rightContent: {
        alignItems: 'flex-end',
        minWidth: 80
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 50
    }
});