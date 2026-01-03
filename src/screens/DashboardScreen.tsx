import React, { useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card, FAB, List, useTheme, ActivityIndicator, Avatar, Surface } from 'react-native-paper';
import { useStore } from '../store/useStore';
import { useNavigation } from '@react-navigation/native';
import { formatAmount } from '../utils/formatting';
import { colors } from '../utils/colors';

export const DashboardScreen = () => {
    const { balance, transactions, accounts, isLoading, refreshData, currency } = useStore();
    const navigation = useNavigation();
    const theme = useTheme();

    // Refresh data when screen comes into focus
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            refreshData();
        });
        return unsubscribe;
    }, [navigation]);

    if (isLoading) {
        return <View style={styles.center}><ActivityIndicator size="large" /></View>;
    }

    return (
        <View style={styles.container}>
            <ScrollView>
                {/* Balance Card */}
                <Card style={styles.card}>
                    <Card.Content>
                        <Text variant="titleSmall" style={styles.cardTitle}>Total Balance</Text>
                        <Text variant="displayMedium" style={styles.totalBalanceText}>
                            {currency}{formatAmount(balance.balance)}
                        </Text>
                        <View style={styles.row}>
                            <View>
                                <Text style={styles.incomeLabel}>Income</Text>
                                <Text variant="titleMedium">{currency}{formatAmount(balance.totalIncome)}</Text>
                            </View>
                            <View>
                                <Text style={styles.expenseLabel}>Expense</Text>
                                <Text variant="titleMedium">{currency}{formatAmount(balance.totalExpense)}</Text>
                            </View>
                        </View>
                    </Card.Content>
                </Card>

                {/* Accounts Horizontal List */}
                {accounts.length > 0 && (
                    <View>
                        <View style={styles.sectionHeader}>
                            <Text variant="titleMedium" style={styles.boldText}>My Accounts</Text>
                            <Text
                                variant="labelLarge"
                                style={[styles.boldText, { color: theme.colors.primary }]}
                                onPress={() => navigation.navigate('Accounts' as never)}
                            >
                                Manage
                            </Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountsListContent}>
                            {accounts.map(acc => (
                                <Surface key={acc.id} style={styles.accountCard} elevation={1}>
                                    <View style={styles.accountHeader}>
                                        <Avatar.Icon size={32} icon={acc.icon || 'bank'} style={{ backgroundColor: acc.color, marginRight: 8 }} color={colors.white} />
                                        <View>
                                            <Text variant="titleSmall" numberOfLines={1} style={styles.accountName}>{acc.name}</Text>
                                            <Text variant="labelSmall" style={styles.accountType}>{acc.type}</Text>
                                        </View>
                                    </View>
                                    <Text variant="titleMedium" style={[styles.boldText, { color: theme.colors.primary }]}>
                                        {currency}{formatAmount(acc.balance)}
                                    </Text>
                                </Surface>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Upcoming Bills & Debts Quick Access */}
                <View style={styles.quickAccessContainer}>
                    <View style={styles.quickAccessHeader}>
                        <Text variant="titleMedium" style={styles.boldText}>Quick Access</Text>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickAccessScroll}>
                        <Surface style={[styles.quickAccessCard, styles.billsCard]} elevation={1}>
                            <TouchableOpacity onPress={() => navigation.navigate('RecurringBills' as never)} style={styles.cardContent}>
                                <View style={styles.cardHeader}>
                                    <Avatar.Icon size={32} icon="calendar-clock" style={styles.billsIcon} color={colors.white} />
                                    <Text variant="labelLarge" style={styles.billsLabel}>Bills</Text>
                                </View>
                                <Text variant="titleSmall">Next Due:</Text>
                                <Text variant="bodyMedium" numberOfLines={1}>
                                    {useStore.getState().recurringPayments.find(p => p.next_due_date > Date.now())?.categoryName || 'None'}
                                </Text>
                            </TouchableOpacity>
                        </Surface>

                        <Surface style={[styles.quickAccessCard, styles.debtsCard]} elevation={1}>
                            <TouchableOpacity onPress={() => navigation.navigate('Debts' as never)} style={styles.cardContent}>
                                <View style={styles.cardHeader}>
                                    <Avatar.Icon size={32} icon="handshake" style={styles.debtsIcon} color={colors.white} />
                                    <Text variant="labelLarge" style={styles.debtsLabel}>Debts</Text>
                                </View>
                                <Text variant="titleSmall">Pending:</Text>
                                <Text variant="bodyMedium">
                                    {useStore.getState().debts.filter(d => !d.is_paid).length} Active
                                </Text>
                            </TouchableOpacity>
                        </Surface>

                         <Surface style={[styles.quickAccessCard, styles.loansCard]} elevation={1}>
                            <TouchableOpacity onPress={() => navigation.navigate('Loan' as never)} style={styles.cardContent}>
                                <View style={styles.cardHeader}>
                                    <Avatar.Icon size={32} icon="cash-multiple" style={styles.loansIcon} color={colors.white} />
                                    <Text variant="labelLarge" style={styles.loansLabel}>Loans</Text>
                                </View>
                                <Text variant="titleSmall">Active:</Text>
                                <Text variant="bodyMedium">
                                    {useStore.getState().loans?.filter(l => l.status === 'active').length || 0} Loans
                                </Text>
                            </TouchableOpacity>
                        </Surface>
                    </ScrollView>
                </View>

                {/* Recent Transactions */}
                <View style={styles.sectionHeader}>
                    <Text variant="titleMedium" style={styles.boldText}>Recent Transactions</Text>
                    <Text
                        variant="labelLarge"
                        style={[styles.boldText, { color: theme.colors.primary }]}
                        onPress={() => navigation.navigate('TransactionHistory' as never)}
                    >
                        See All
                    </Text>
                </View>
                {transactions.slice(0, 5).map(t => (
                    <List.Item
                        key={t.id}
                        title={t.note || t.categoryName}
                        description={new Date(t.date).toLocaleDateString()}
                        left={props => <List.Icon {...props} icon={t.categoryType === 'income' ? 'arrow-up-circle' : 'arrow-down-circle'} color={t.categoryColor} />}
                        right={props => (
                            <Text {...props} style={[styles.transactionAmount, { color: t.categoryType === 'income' ? colors.income : colors.expense }]}>
                                {t.categoryType === 'income' ? '+' : '-'}{currency}{formatAmount(t.amount)}
                            </Text>
                        )}
                        style={styles.listItem}
                    />
                ))}
                <View style={styles.bottomSpacer} />
            </ScrollView>

            <FAB
                icon="plus"
                style={styles.fab}
                onPress={() => navigation.navigate('AddTransaction' as never)}
                label="Add"
                color="white"
                theme={{ colors: { primary: colors.darkBlue } }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: { margin: 16, backgroundColor: colors.white, elevation: 4 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
    totalBalanceText: {
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    incomeLabel: { color: colors.income },
    expenseLabel: { color: colors.expense },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginHorizontal: 16,
        marginTop: 10,
        marginBottom: 5
    },
    boldText: { fontWeight: 'bold', color: colors.textPrimary },
    cardTitle: { color: colors.textSecondary, marginBottom: 4 },
    accountsListContent: { paddingHorizontal: 16, paddingBottom: 10 },
    accountCard: {
        backgroundColor: colors.white,
        padding: 12,
        borderRadius: 12,
        marginRight: 12,
        minWidth: 160,
        justifyContent: 'center'
    },
    accountHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    accountName: { width: 100, fontWeight: 'bold', color: colors.textPrimary },
    accountType: { color: colors.textSecondary },
    quickAccessContainer: { marginHorizontal: 16, marginTop: 10 },
    quickAccessHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    quickAccessScroll: { gap: 12, paddingRight: 16, paddingBottom: 12 },
    quickAccessCard: { width: 140, borderRadius: 12 },
    billsCard: { backgroundColor: colors.billsCardBg },
    debtsCard: { backgroundColor: colors.debtsCardBg },
    loansCard: { backgroundColor: colors.loansCardBg },
    cardContent: { 
        padding: 16,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    billsIcon: { backgroundColor: colors.billsIconBg },
    billsLabel: { color: colors.billsText, fontWeight: 'bold' },
    debtsIcon: { backgroundColor: colors.debtsIconBg },
    debtsLabel: { color: colors.debtsText, fontWeight: 'bold' },
    loansIcon: { backgroundColor: colors.loansIconBg },
    loansLabel: { color: colors.loansText, fontWeight: 'bold' },
    transactionAmount: { alignSelf: 'center', fontWeight: 'bold' },
    listItem: { backgroundColor: colors.white, marginHorizontal: 16, marginVertical: 4, borderRadius: 8 },
    bottomSpacer: { height: 80 },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
        backgroundColor: colors.primary,
    },
});
