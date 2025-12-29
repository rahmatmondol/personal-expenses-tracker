import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Platform } from 'react-native';
import { Text, Card, SegmentedButtons, DataTable, useTheme, ActivityIndicator, Button, Surface } from 'react-native-paper';
import { BarChart } from 'react-native-gifted-charts';
import { useNavigation } from '@react-navigation/native';
import { getItemConsumptionReport, getMonthlyTrendByRange, getDailyTrend } from '../db/repo';
import { formatAmount } from '../utils/formatting';
import { useStore } from '../store/useStore';
import DateTimePicker from '@react-native-community/datetimepicker';

export const ReportsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { currency } = useStore();
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('consumption'); // 'consumption' | 'financial'
  
  // Data State
  const [consumptionData, setConsumptionData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [isSingleMonth, setIsSingleMonth] = useState(true);

  // Filter State
  const [fromDate, setFromDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [toDate, setToDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState<'from' | 'to' | null>(null);

  const loadData = () => {
    setLoading(true);
    
    // Normalize dates
    const start = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
    const end = new Date(toDate.getFullYear(), toDate.getMonth() + 1, 0); // End of month

    const isSameMonth = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
    setIsSingleMonth(isSameMonth);

    // 1. Load Consumption Data (Aggregate for the range)
    const consumption = getItemConsumptionReport(start.getTime(), end.getTime());
    setConsumptionData(consumption);

    // 2. Load Trend Data
    let chartData = [];
    if (isSameMonth) {
        // Daily Trend for the selected month
        const daily = getDailyTrend(start.getTime(), end.getTime());
        chartData = daily.map(d => ({
            value: d.expense,
            label: d.day,
            frontColor: theme.colors.error,
            spacing: 14,
            labelTextStyle: { fontSize: 10, color: 'gray' }
        }));
    } else {
        // Monthly Trend for the range
        const monthly = getMonthlyTrendByRange(start.getTime(), end.getTime());
        chartData = monthly.map(m => ({
            value: m.expense,
            label: m.month,
            frontColor: theme.colors.error,
            spacing: 20,
            labelTextStyle: { fontSize: 10, color: 'gray' }
        }));
    }
    setTrendData(chartData);

    setLoading(false);
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
        loadData();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    loadData();
  }, [fromDate, toDate]);

  const onDateChange = (event: any, date?: Date) => {
    const type = showPicker;
    setShowPicker(null);
    if (date && type) {
        if (type === 'from') {
            setFromDate(date);
            // Auto adjust toDate if it's before fromDate
            if (date > toDate) {
                setToDate(date);
            }
        } else {
            setToDate(date);
            // Auto adjust fromDate if it's after toDate
            if (date < fromDate) {
                setFromDate(date);
            }
        }
    }
  };

  if (loading) {
      return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  }

  const formattedFrom = fromDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  const formattedTo = toDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });

  return (
    <ScrollView style={styles.container}>
      <View style={{ padding: 16 }}>
        <SegmentedButtons
            value={reportType}
            onValueChange={setReportType}
            buttons={[
            { value: 'consumption', label: 'Item Consumption' },
            { value: 'financial', label: 'Financial Trend' },
            ]}
        />
        
        <Surface style={styles.filterCard} elevation={1}>
            <View style={styles.filterRow}>
                <View style={styles.dateCol}>
                    <Text variant="labelSmall" style={{color: 'gray'}}>From Month</Text>
                    <Button 
                        mode="outlined" 
                        onPress={() => setShowPicker('from')}
                        compact
                        style={{ borderColor: '#ddd' }}
                    >
                        {formattedFrom}
                    </Button>
                </View>
                <Text style={{ marginHorizontal: 10, alignSelf: 'center', marginTop: 15 }}>-</Text>
                <View style={styles.dateCol}>
                    <Text variant="labelSmall" style={{color: 'gray'}}>To Month</Text>
                    <Button 
                        mode="outlined" 
                        onPress={() => setShowPicker('to')}
                        compact
                        style={{ borderColor: '#ddd' }}
                    >
                        {formattedTo}
                    </Button>
                </View>
            </View>
        </Surface>

        {showPicker && (
            <DateTimePicker
                value={showPicker === 'from' ? fromDate : toDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
                maximumDate={new Date()}
            />
        )}
      </View>

      {reportType === 'consumption' ? (
        <Card style={styles.card}>
            <Card.Title 
                title={isSingleMonth ? `${formattedFrom} Consumption` : `Consumption Report`} 
                subtitle={isSingleMonth ? "Daily breakdown available in Financial Trend" : `${formattedFrom} - ${formattedTo}`} 
            />
            <Card.Content>
                <DataTable>
                    <DataTable.Header>
                        <DataTable.Title>Item</DataTable.Title>
                        <DataTable.Title numeric>Qty</DataTable.Title>
                        <DataTable.Title numeric>Spent</DataTable.Title>
                    </DataTable.Header>

                    {consumptionData.length === 0 ? (
                        <Text style={{ textAlign: 'center', margin: 20, color: 'gray' }}>No items purchased in this period.</Text>
                    ) : (
                        consumptionData.map((item, index) => (
                            <DataTable.Row key={index}>
                                <DataTable.Cell>{item.name}</DataTable.Cell>
                                <DataTable.Cell numeric>{item.totalQuantity} {item.unit}</DataTable.Cell>
                                <DataTable.Cell numeric>{currency}{formatAmount(item.totalSpent)}</DataTable.Cell>
                            </DataTable.Row>
                        ))
                    )}
                </DataTable>
            </Card.Content>
        </Card>
      ) : (
        <Card style={styles.card}>
            <Card.Title 
                title={isSingleMonth ? "Daily Expense Trend" : "Monthly Expense Comparison"} 
                subtitle={isSingleMonth ? `Daily breakdown for ${formattedFrom}` : `${formattedFrom} - ${formattedTo}`}
            />
            <Card.Content>
                <View style={{ height: 300, paddingVertical: 20 }}>
                     {trendData.length > 0 ? (
                        <BarChart
                            data={trendData}
                            barWidth={isSingleMonth ? 8 : 22}
                            noOfSections={4}
                            barBorderRadius={2}
                            frontColor={theme.colors.error}
                            yAxisThickness={0}
                            xAxisThickness={0}
                            initialSpacing={10}
                        />
                     ) : (
                        <Text>No data available</Text>
                     )}
                </View>
                <Text style={{ textAlign: 'center', fontSize: 12, color: 'gray' }}>
                    {isSingleMonth 
                        ? "* Showing daily expenses for the selected month"
                        : "* Showing monthly expense comparison for the selected range"
                    }
                </Text>
            </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { marginHorizontal: 16, marginBottom: 16, backgroundColor: 'white', elevation: 2 },
  filterCard: { 
      marginTop: 10, 
      padding: 12, 
      backgroundColor: 'white', 
      borderRadius: 8 
  },
  filterRow: { flexDirection: 'row', justifyContent: 'center' },
  dateCol: { flex: 1 }
});