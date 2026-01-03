import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { Text, Card, List, Button, Divider, Surface, useTheme, Appbar, Avatar } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { formatAmount } from '../utils/formatting';
import { Debt, Transaction, TransactionItem } from '../types';
import * as repo from '../db/repo';
import { colors } from '../utils/colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export const DebtDetailScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { debtId } = route.params as { debtId: number };
    const theme = useTheme();
    
    const [debt, setDebt] = useState<Debt | null>(null);
    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const [items, setItems] = useState<TransactionItem[]>([]);
    
    const currency = repo.getSetting('currency') || '৳';

    useEffect(() => {
        loadData();
    }, [debtId]);

    const loadData = () => {
        const foundDebt = repo.getDebtById(debtId);
        if (foundDebt) {
            setDebt(foundDebt);
            if (foundDebt.transactionId) {
                const foundTrans = repo.getTransactionById(foundDebt.transactionId);
                setTransaction(foundTrans);
                const foundItems = repo.getTransactionItems(foundDebt.transactionId);
                setItems(foundItems);
            }
        }
    };

    if (!debt) return null;

    const isOverdue = !debt.is_paid && debt.due_date < new Date().setHours(0,0,0,0);

    return (
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Status Card */}
                <Surface style={[styles.statusCard, { backgroundColor: debt.is_paid ? '#E8F5E9' : (isOverdue ? '#FFEBEE' : '#FFF3E0') }]} elevation={1}>
                    <View style={styles.statusHeader}>
                        <Avatar.Icon 
                            size={48} 
                            icon={debt.is_paid ? 'check-circle' : (isOverdue ? 'alert-circle' : 'clock-outline')} 
                            style={{ backgroundColor: 'white' }} 
                            color={debt.is_paid ? '#388E3C' : (isOverdue ? '#D32F2F' : '#E65100')} 
                        />
                        <View style={{ marginLeft: 16 }}>
                            <Text variant="titleLarge" style={{ fontWeight: 'bold', color: debt.is_paid ? '#388E3C' : (isOverdue ? '#D32F2F' : '#E65100') }}>
                                {debt.is_paid ? 'COMPLETED' : (isOverdue ? 'OVERDUE' : 'PENDING')}
                            </Text>
                            <Text variant="bodyMedium" style={{ opacity: 0.7 }}>
                                {debt.type === 'borrowed' ? 'You owe money' : 'Money owed to you'}
                            </Text>
                        </View>
                    </View>
                </Surface>

                {/* Main Info */}
                <Card style={styles.card}>
                    <Card.Content>
                        <View style={styles.infoRow}>
                            <View>
                                <Text variant="labelMedium" style={styles.label}>Contact</Text>
                                <Text variant="titleMedium" style={styles.value}>{debt.contact_name}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text variant="labelMedium" style={styles.label}>Amount</Text>
                                <Text variant="headlineSmall" style={[styles.value, { color: debt.type === 'borrowed' ? '#F44336' : '#4CAF50', fontWeight: 'bold' }]}>
                                    {currency}{formatAmount(debt.amount)}
                                </Text>
                            </View>
                        </View>

                        <Divider style={styles.divider} />

                        <View style={styles.infoRow}>
                            <View>
                                <Text variant="labelMedium" style={styles.label}>Due Date</Text>
                                <Text variant="bodyLarge">{new Date(debt.due_date).toLocaleDateString()}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text variant="labelMedium" style={styles.label}>Created At</Text>
                                <Text variant="bodyLarge">{new Date(debt.created_at).toLocaleDateString()}</Text>
                            </View>
                        </View>

                        {debt.description ? (
                            <>
                                <Divider style={styles.divider} />
                                <Text variant="labelMedium" style={styles.label}>Note</Text>
                                <Text variant="bodyMedium">{debt.description}</Text>
                            </>
                        ) : null}
                    </Card.Content>
                </Card>

                {/* Linked Transaction Info */}
                {transaction && (
                    <>
                        <Text variant="titleMedium" style={styles.sectionTitle}>Linked Transaction</Text>
                        <Card style={styles.card}>
                            <Card.Content>
                                <View style={styles.transactionHeader}>
                                    <Avatar.Icon size={32} icon={transaction.categoryIcon || 'cart'} style={{ backgroundColor: transaction.categoryColor || colors.primary }} color="white" />
                                    <View style={{ marginLeft: 12, flex: 1 }}>
                                        <Text variant="titleSmall">{transaction.categoryName}</Text>
                                        <Text variant="bodySmall" style={{ color: 'gray' }}>{new Date(transaction.date).toLocaleString()}</Text>
                                    </View>
                                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{currency}{formatAmount(transaction.amount)}</Text>
                                </View>
                                
                                {transaction.note ? (
                                    <Text variant="bodyMedium" style={{ marginTop: 8, fontStyle: 'italic', color: 'gray' }}>
                                        "{transaction.note}"
                                    </Text>
                                ) : null}

                                {items.length > 0 && (
                                    <View style={{ marginTop: 12 }}>
                                        <Text variant="labelSmall" style={{ color: 'gray', marginBottom: 4 }}>ITEMS</Text>
                                        {items.map((item, index) => (
                                            <View key={index} style={styles.itemRow}>
                                                <Text style={{ flex: 1 }}>{item.name}</Text>
                                                <Text style={{ color: 'gray' }}>{item.quantity} {item.unit} x {currency}{formatAmount(item.pricePerUnit)}</Text>
                                                <Text style={{ marginLeft: 8, fontWeight: '500' }}>{currency}{formatAmount(item.quantity * item.pricePerUnit)}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </Card.Content>
                        </Card>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { flex: 1, padding: 16 },
    statusCard: { padding: 16, borderRadius: 12, marginBottom: 16 },
    statusHeader: { flexDirection: 'row', alignItems: 'center' },
    card: { marginBottom: 16, backgroundColor: 'white' },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    label: { color: 'gray', marginBottom: 2 },
    value: { fontWeight: '500' },
    divider: { marginVertical: 12 },
    sectionTitle: { marginBottom: 8, fontWeight: 'bold', marginTop: 8 },
    transactionHeader: { flexDirection: 'row', alignItems: 'center' },
    itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderTopWidth: 0.5, borderTopColor: '#f0f0f0' },
});
