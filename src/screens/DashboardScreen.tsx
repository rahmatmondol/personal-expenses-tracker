import React, { useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card, FAB, List, useTheme, ActivityIndicator, Avatar, Surface } from 'react-native-paper';
import { useStore } from '../store/useStore';
import { useNavigation } from '@react-navigation/native';
import { formatAmount } from '../utils/formatting';

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
            <Text variant="titleSmall">Total Balance</Text>
            <Text variant="displayMedium" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
              {currency}{formatAmount(balance.balance)}
            </Text>
            <View style={styles.row}>
                <View>
                    <Text style={{ color: 'green' }}>Income</Text>
                    <Text variant="titleMedium">{currency}{formatAmount(balance.totalIncome)}</Text>
                </View>
                <View>
                    <Text style={{ color: 'red' }}>Expense</Text>
                    <Text variant="titleMedium">{currency}{formatAmount(balance.totalExpense)}</Text>
                </View>
            </View>
          </Card.Content>
        </Card>

        {/* Accounts Horizontal List */}
        {accounts.length > 0 && (
            <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginTop: 10, marginBottom: 5 }}>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>My Accounts</Text>
                    <Text 
                        variant="labelLarge" 
                        style={{ color: theme.colors.primary, fontWeight: 'bold' }}
                        onPress={() => navigation.navigate('Accounts' as never)}
                    >
                        Manage
                    </Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10 }}>
                    {accounts.map(acc => (
                        <Surface key={acc.id} style={styles.accountCard} elevation={1}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                <Avatar.Icon size={32} icon={acc.icon || 'bank'} style={{ backgroundColor: acc.color, marginRight: 8 }} color="white" />
                                <View>
                                    <Text variant="titleSmall" numberOfLines={1} style={{ width: 100, fontWeight: 'bold' }}>{acc.name}</Text>
                                    <Text variant="labelSmall" style={{ color: 'gray' }}>{acc.type}</Text>
                                </View>
                            </View>
                            <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                                {currency}{formatAmount(acc.balance)}
                            </Text>
                        </Surface>
                    ))}
                </ScrollView>
            </View>
        )}

        {/* Upcoming Bills & Debts Quick Access */}
        <View style={{ marginHorizontal: 16, marginTop: 10 }}>
             <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Upcoming & Debts</Text>
             </View>
             
             <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                 <Surface style={[styles.dashboardCard, { flex: 1, marginRight: 8, backgroundColor: '#E3F2FD' }]} elevation={1}>
                    <TouchableOpacity onPress={() => navigation.navigate('RecurringBills' as never)} style={{ padding: 16 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Avatar.Icon size={32} icon="calendar-clock" style={{ backgroundColor: '#2196F3' }} color="white" />
                            <Text variant="labelLarge" style={{ color: '#2196F3', fontWeight: 'bold' }}>Bills</Text>
                        </View>
                        <Text variant="titleSmall">Next Due:</Text>
                        <Text variant="bodyMedium" numberOfLines={1}>
                            {useStore.getState().recurringPayments.find(p => p.next_due_date > Date.now())?.categoryName || 'None'}
                        </Text>
                    </TouchableOpacity>
                 </Surface>

                 <Surface style={[styles.dashboardCard, { flex: 1, marginLeft: 8, backgroundColor: '#FFEBEE' }]} elevation={1}>
                    <TouchableOpacity onPress={() => navigation.navigate('Debts' as never)} style={{ padding: 16 }}>
                         <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Avatar.Icon size={32} icon="handshake" style={{ backgroundColor: '#F44336' }} color="white" />
                            <Text variant="labelLarge" style={{ color: '#F44336', fontWeight: 'bold' }}>Debts</Text>
                        </View>
                        <Text variant="titleSmall">Pending:</Text>
                        <Text variant="bodyMedium">
                             {useStore.getState().debts.filter(d => !d.is_paid).length} Active
                        </Text>
                    </TouchableOpacity>
                 </Surface>
             </View>
        </View>

        {/* Recent Transactions */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginTop: 10, marginBottom: 5 }}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Recent Transactions</Text>
            <Text 
                variant="labelLarge" 
                style={{ color: theme.colors.primary, fontWeight: 'bold' }}
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
                    <Text {...props} style={{ alignSelf: 'center', fontWeight: 'bold', color: t.categoryType === 'income' ? 'green' : 'red' }}>
                        {t.categoryType === 'income' ? '+' : '-'}{currency}{formatAmount(t.amount)}
                    </Text>
                )}
                style={styles.listItem}
            />
        ))}
        <View style={{ height: 80 }} />
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('AddTransaction' as never)}
        label="Add"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { margin: 16, backgroundColor: 'white', elevation: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  sectionTitle: { marginHorizontal: 16, marginTop: 10, marginBottom: 5, fontWeight: 'bold' },
  listItem: { backgroundColor: 'white', marginHorizontal: 16, marginVertical: 4, borderRadius: 8 },
  accountCard: {
      backgroundColor: 'white',
      padding: 12,
      borderRadius: 12,
      marginRight: 12,
      minWidth: 160,
      justifyContent: 'center'
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
