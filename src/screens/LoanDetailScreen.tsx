import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity, Dimensions } from 'react-native';
import { Text, Card, ProgressBar, List, Button, Portal, Modal, RadioButton, Divider, Surface, useTheme } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { formatAmount } from '../utils/formatting';
import { Loan, LoanInstallment } from '../types';
import * as repo from '../db/repo';
import { colors } from '../utils/colors';
import { useStore } from '../store/useStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const SCREEN_WIDTH = Dimensions.get('window').width;

export const LoanDetailScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { loanId } = route.params as { loanId: number };
    const { currency, accounts } = useStore();
    const theme = useTheme();
    
    const [loan, setLoan] = useState<Loan | null>(null);
    const [installments, setInstallments] = useState<LoanInstallment[]>([]);
    
    // Payment Modal State
    const [showPayModal, setShowPayModal] = useState(false);
    const [selectedInstallmentId, setSelectedInstallmentId] = useState<number | null>(null);
    const [paymentAccountId, setPaymentAccountId] = useState<number | null>(null);

    useEffect(() => {
        loadData();
    }, [loanId]);

    const loadData = () => {
        const loans = repo.getLoans(); // Ideally getLoanById
        const foundLoan = loans.find(l => l.id === loanId);
        setLoan(foundLoan || null);
        setInstallments(repo.getLoanInstallments(loanId));
    };

    const initiatePay = (installmentId: number) => {
        setSelectedInstallmentId(installmentId);
        // Default to first account if available, or keep null
        if (accounts.length > 0 && paymentAccountId === null) {
            setPaymentAccountId(accounts[0].id);
        }
        setShowPayModal(true);
    };

    const confirmPay = () => {
        if (selectedInstallmentId) {
            repo.payInstallment(selectedInstallmentId, paymentAccountId || undefined);
            loadData();
            setShowPayModal(false);
            setSelectedInstallmentId(null);
            
            // Trigger a refresh of global store to update account balances
            useStore.getState().refreshData();
        }
    };

    if (!loan) return null;

    const progress = 1 - (loan.remaining_amount / loan.total_repayable);
    const nextInstallment = installments.find(i => i.status === 'pending');

    return (
        <View style={styles.container}>
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                
                {/* Header Card */}
                <Surface style={styles.headerCard} elevation={2}>
                    <View style={styles.headerTop}>
                        <View>
                            <Text variant="labelMedium" style={{color: 'rgba(255,255,255,0.8)'}}>Remaining Balance</Text>
                            <Text variant="displaySmall" style={{color: 'white', fontWeight: 'bold'}}>
                                {currency}{formatAmount(loan.remaining_amount)}
                            </Text>
                        </View>
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>{loan.status.toUpperCase()}</Text>
                        </View>
                    </View>

                    <View style={styles.progressContainer}>
                        <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4}}>
                            <Text variant="bodySmall" style={{color: 'rgba(255,255,255,0.8)'}}>Progress</Text>
                            <Text variant="bodySmall" style={{color: 'white'}}>{Math.round(progress * 100)}%</Text>
                        </View>
                        <ProgressBar progress={progress} color="white" style={styles.progressBar} />
                    </View>
                </Surface>

                {/* Info Grid */}
                <View style={styles.gridContainer}>
                    <Card style={[styles.gridItem, {marginRight: 8}]}>
                        <Card.Content style={styles.gridContent}>
                            <MaterialCommunityIcons name="cash-multiple" size={24} color={colors.primary} />
                            <Text variant="labelSmall" style={styles.gridLabel}>Principal</Text>
                            <Text variant="titleMedium">{currency}{formatAmount(loan.principal_amount)}</Text>
                        </Card.Content>
                    </Card>
                    <Card style={[styles.gridItem, {marginLeft: 8}]}>
                        <Card.Content style={styles.gridContent}>
                            <MaterialCommunityIcons name="percent" size={24} color={colors.error} />
                            <Text variant="labelSmall" style={styles.gridLabel}>Interest</Text>
                            <Text variant="titleMedium">{loan.interest_rate}%</Text>
                        </Card.Content>
                    </Card>
                </View>

                <View style={[styles.gridContainer, {marginTop: 16}]}>
                    <Card style={[styles.gridItem, {marginRight: 8}]}>
                        <Card.Content style={styles.gridContent}>
                            <MaterialCommunityIcons name="calendar" size={24} color={colors.secondary} />
                            <Text variant="labelSmall" style={styles.gridLabel}>Start Date</Text>
                            <Text variant="titleMedium">{new Date(loan.start_date).toLocaleDateString()}</Text>
                        </Card.Content>
                    </Card>
                    <Card style={[styles.gridItem, {marginLeft: 8}]}>
                        <Card.Content style={styles.gridContent}>
                            <MaterialCommunityIcons name="cash-fast" size={24} color={colors.success} />
                            <Text variant="labelSmall" style={styles.gridLabel}>Installment</Text>
                            <Text variant="titleMedium">{currency}{formatAmount(loan.installment_amount)}</Text>
                        </Card.Content>
                    </Card>
                </View>

                {/* Installments List */}
                <Text variant="titleMedium" style={styles.sectionTitle}>Installments</Text>
                
                {installments.map((inst, index) => {
                    const isNext = nextInstallment?.id === inst.id;
                    const isPaid = inst.status === 'paid';
                    
                    // Robust overdue check: compare dates only
                    const dueDate = new Date(inst.due_date);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const dueDateStart = new Date(dueDate);
                    dueDateStart.setHours(0, 0, 0, 0);
                    
                    const isOverdue = !isPaid && dueDateStart.getTime() < today.getTime();
                    
                    return (
                        <Surface 
                            key={inst.id} 
                            style={[
                                styles.installmentCard, 
                                isPaid && styles.installmentCardPaid,
                                isOverdue && styles.installmentCardOverdue
                            ]} 
                            elevation={isOverdue ? 2 : 1}
                        >
                            <View style={styles.installmentRow}>
                                <View style={styles.installmentInfo}>
                                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                        <Text variant="titleSmall" style={{color: isPaid ? colors.textSecondary : (isOverdue ? colors.error : colors.textPrimary)}}>
                                            #{index + 1} • {new Date(inst.due_date).toLocaleDateString()}
                                        </Text>
                                        {isOverdue && (
                                            <View style={styles.overdueBadge}>
                                                <Text style={styles.overdueText}>Overdue</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text variant="bodyMedium" style={{
                                        color: isPaid ? colors.textSecondary : colors.textPrimary,
                                        fontWeight: isOverdue ? 'bold' : 'normal',
                                        marginTop: 2
                                    }}>
                                        {currency}{formatAmount(inst.amount)}
                                    </Text>
                                </View>
                                
                                {isPaid ? (
                                    <View style={styles.paidBadge}>
                                        <MaterialCommunityIcons name="check" size={16} color={colors.success} />
                                        <Text style={{color: colors.success, fontSize: 12, fontWeight: 'bold', marginLeft: 4}}>PAID</Text>
                                    </View>
                                ) : (
                                    <TouchableOpacity 
                                        style={[
                                            styles.payButton, 
                                            isNext && !isOverdue && styles.payButtonHighlight,
                                            isOverdue && styles.payButtonOverdue
                                        ]} 
                                        onPress={() => initiatePay(inst.id)}
                                    >
                                        <MaterialCommunityIcons name="hand-coin" size={18} color="white" style={{marginRight: 4}} />
                                        <Text style={styles.payButtonText}>Pay</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </Surface>
                    );
                })}
                <View style={{height: 70}} />
            </ScrollView>

            {/* Payment Modal */}
            <Portal>
                <Modal visible={showPayModal} onDismiss={() => setShowPayModal(false)} contentContainerStyle={styles.modalContainer}>
                    <Text variant="headlineSmall" style={{marginBottom: 16, textAlign: 'center'}}>Confirm Payment</Text>
                    
                    <Text variant="bodyMedium" style={{marginBottom: 12}}>
                        Pay installment of <Text style={{fontWeight: 'bold'}}>{currency}{formatAmount(loan.installment_amount)}</Text>?
                    </Text>

                    <Text variant="titleSmall" style={{marginBottom: 8, marginTop: 8}}>Pay from Account:</Text>
                    <ScrollView style={{maxHeight: 300}}>
                        <TouchableOpacity 
                            style={[styles.accountOption, paymentAccountId === null && styles.accountOptionSelected]}
                            onPress={() => setPaymentAccountId(null)}
                        >
                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                <MaterialCommunityIcons name="cash-off" size={24} color={colors.textSecondary} />
                                <Text style={{marginLeft: 12, fontWeight: '500'}}>None (No Account)</Text>
                            </View>
                            <Text style={{color: colors.textSecondary, fontSize: 12}}>No transaction</Text>
                        </TouchableOpacity>

                        {accounts.map(acc => (
                            <TouchableOpacity 
                                key={acc.id} 
                                style={[
                                    styles.accountOption, 
                                    paymentAccountId === acc.id && styles.accountOptionSelected,
                                    { borderColor: acc.color || colors.border }
                                ]}
                                onPress={() => setPaymentAccountId(acc.id)}
                            >
                                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <MaterialCommunityIcons 
                                        name={acc.icon as any || 'wallet'} 
                                        size={24} 
                                        color={acc.color || colors.textPrimary} 
                                        style={{marginRight: 12}}
                                    />
                                    <View>
                                        <Text variant="bodyLarge">{acc.name}</Text>
                                        <Text variant="bodySmall" style={{color: colors.textSecondary}}>
                                            Bal: {currency}{formatAmount(acc.balance)}
                                        </Text>
                                    </View>
                                </View>
                                {paymentAccountId === acc.id && (
                                    <MaterialCommunityIcons name="check-circle" size={24} color={colors.primary} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <View style={styles.modalActions}>
                        <Button onPress={() => setShowPayModal(false)} style={{flex: 1, marginRight: 8}}>Cancel</Button>
                        <Button 
                            mode="contained" 
                            onPress={confirmPay} 
                            style={{flex: 1, marginLeft: 8}}
                            buttonColor={colors.primary}
                        >
                            Confirm Pay
                        </Button>
                    </View>
                </Modal>
            </Portal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    headerCard: {
        backgroundColor: colors.primary,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    statusBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    progressContainer: {
        width: '100%',
    },
    progressBar: {
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    gridContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    gridItem: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 12,
        elevation: 0,
        borderWidth: 1,
        borderColor: colors.outline,
    },
    gridContent: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    gridLabel: {
        color: colors.textSecondary,
        marginTop: 4,
        marginBottom: 2,
    },
    sectionTitle: {
        marginTop: 24,
        marginBottom: 12,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    installmentCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        marginBottom: 8,
        padding: 16,
    },
    installmentCardPaid: {
        backgroundColor: colors.background,
        opacity: 0.8,
    },
    installmentCardOverdue: {
        backgroundColor: '#FFEBEE', // Light red background
        borderColor: colors.error,
        borderWidth: 1,
    },
    installmentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    installmentInfo: {
        flex: 1,
    },
    payButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    payButtonHighlight: {
        backgroundColor: colors.secondary, // Highlight next payment
        elevation: 4,
    },
    payButtonOverdue: {
        backgroundColor: colors.error,
        elevation: 4,
    },
    payButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    overdueBadge: {
        backgroundColor: colors.error,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    overdueText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    paidBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    modalContainer: {
        backgroundColor: 'white',
        padding: 20,
        margin: 20,
        borderRadius: 16,
        maxHeight: '80%',
    },
    accountOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 8,
        backgroundColor: colors.background,
    },
    accountOptionSelected: {
        backgroundColor: '#E3F2FD',
        borderWidth: 2,
        borderColor: colors.primary,
    },
    modalActions: {
        flexDirection: 'row',
        marginTop: 16,
    }
});
