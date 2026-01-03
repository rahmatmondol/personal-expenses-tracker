import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity, Dimensions } from 'react-native';
import { Text, Card, useTheme, FAB, Chip, Surface, ProgressBar, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { formatAmount } from '../utils/formatting';
import { Loan } from '../types';
import * as repo from '../db/repo';
import { colors } from '../utils/colors';
import { useStore } from '../store/useStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const LoanScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation();
    const { currency } = useStore();
    const [loans, setLoans] = useState<Loan[]>([]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadData();
        });
        return unsubscribe;
    }, [navigation]);

    const loadData = () => {
        setLoans(repo.getLoans());
    };

    const handleDelete = (id: number) => {
        Alert.alert('Delete', 'Are you sure you want to delete this loan?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: () => {
                    repo.deleteLoan(id);
                    loadData();
                }
            }
        ]);
    };

    const summary = useMemo(() => {
        const totalPrincipal = loans.reduce((acc, loan) => acc + loan.principal_amount, 0);
        const totalRemaining = loans.reduce((acc, loan) => acc + loan.remaining_amount, 0);
        const activeLoans = loans.filter(l => l.status === 'active').length;
        return { totalPrincipal, totalRemaining, activeLoans };
    }, [loans]);

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                
                {/* Summary Header */}
                <Surface style={styles.headerCard} elevation={2}>
                    <View style={styles.headerRow}>
                        <View>
                            <Text variant="labelMedium" style={styles.headerLabel}>Total Outstanding</Text>
                            <Text variant="displaySmall" style={styles.headerValue}>{currency}{formatAmount(summary.totalRemaining)}</Text>
                        </View>
                        <View style={styles.iconContainer}>
                            <MaterialCommunityIcons name="bank-transfer-out" size={32} color="white" />
                        </View>
                    </View>
                    
                    <Divider style={{ backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 12 }} />
                    
                    <View style={styles.statsRow}>
                        <View>
                            <Text variant="labelSmall" style={styles.statLabel}>Active Loans</Text>
                            <Text variant="titleMedium" style={styles.statValue}>{summary.activeLoans}</Text>
                        </View>
                        <View>
                            <Text variant="labelSmall" style={styles.statLabel}>Total Principal</Text>
                            <Text variant="titleMedium" style={styles.statValue}>{currency}{formatAmount(summary.totalPrincipal)}</Text>
                        </View>
                    </View>
                </Surface>

                <Text variant="titleMedium" style={styles.sectionTitle}>Your Loans</Text>

                {loans.map((loan) => {
                    const progress = 1 - (loan.remaining_amount / loan.total_repayable);
                    const isCompleted = loan.status === 'completed';

                    return (
                        <TouchableOpacity
                            key={loan.id}
                            onPress={() => navigation.navigate('LoanDetail', { loanId: loan.id } as any)}
                            onLongPress={() => handleDelete(loan.id)}
                            activeOpacity={0.8}
                        >
                            <Surface style={[styles.loanCard, isCompleted && styles.completedCard]} elevation={1}>
                                <View style={styles.cardHeader}>
                                    <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
                                        <View style={[styles.iconBox, {backgroundColor: isCompleted ? '#E8F5E9' : '#E3F2FD'}]}>
                                            <MaterialCommunityIcons 
                                                name={isCompleted ? "check-decagram" : "cash-multiple"} 
                                                size={24} 
                                                color={isCompleted ? colors.success : colors.primary} 
                                            />
                                        </View>
                                        <View style={{marginLeft: 12, flex: 1}}>
                                            <Text variant="titleMedium" numberOfLines={1} style={{fontWeight: 'bold'}}>{loan.title}</Text>
                                            <Text variant="bodySmall" style={{color: colors.textSecondary}}>
                                                {loan.installment_frequency.charAt(0).toUpperCase() + loan.installment_frequency.slice(1)} • {currency}{formatAmount(loan.installment_amount)}
                                            </Text>
                                        </View>
                                    </View>
                                    <Chip
                                        mode="flat"
                                        style={{ backgroundColor: isCompleted ? '#E8F5E9' : '#FFF3E0', height: 28 }}
                                        textStyle={{ color: isCompleted ? colors.success : colors.warning, fontSize: 12, lineHeight: 12 }}
                                    >
                                        {isCompleted ? 'Paid' : 'Active'}
                                    </Chip>
                                </View>

                                <View style={styles.progressSection}>
                                    <View style={styles.progressLabels}>
                                        <Text variant="bodySmall" style={{color: colors.textSecondary}}>Repaid: {Math.round(progress * 100)}%</Text>
                                        <Text variant="bodySmall" style={{fontWeight: 'bold', color: isCompleted ? colors.success : colors.error}}>
                                            {currency}{formatAmount(loan.remaining_amount)} Left
                                        </Text>
                                    </View>
                                    <ProgressBar 
                                        progress={progress} 
                                        color={isCompleted ? colors.success : colors.primary} 
                                        style={styles.progressBar} 
                                    />
                                </View>
                            </Surface>
                        </TouchableOpacity>
                    );
                })}

                {loans.length === 0 && (
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="piggy-bank-outline" size={64} color={colors.disabled} />
                        <Text style={{ color: colors.textSecondary, marginTop: 16 }}>No active loans</Text>
                        <Text variant="bodySmall" style={{ color: colors.textSecondary }}>Tap + to add a new loan</Text>
                    </View>
                )}
            </ScrollView>

            <FAB
                icon="plus"
                style={[styles.fab, { backgroundColor: colors.primary }]}
                color="white"
                onPress={() => navigation.navigate('AddLoan' as any)}
            />
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
        paddingBottom: 80,
    },
    headerCard: {
        backgroundColor: colors.primary,
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerLabel: {
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 4,
    },
    headerValue: {
        color: 'white',
        fontWeight: 'bold',
    },
    iconContainer: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 12,
        borderRadius: 12,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statLabel: {
        color: 'rgba(255,255,255,0.8)',
    },
    statValue: {
        color: 'white',
        fontWeight: 'bold',
    },
    sectionTitle: {
        marginBottom: 12,
        fontWeight: '600',
        color: colors.textPrimary,
        marginLeft: 4,
    },
    loanCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    completedCard: {
        opacity: 0.9,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressSection: {
        marginTop: 4,
    },
    progressLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    progressBar: {
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.outline,
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 60,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 60,
    }
});
