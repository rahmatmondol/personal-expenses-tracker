import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { 
    Button, TextInput, Text, 
    IconButton, useTheme, Avatar, SegmentedButtons, 
    Surface, Appbar, Chip
} from 'react-native-paper';
import { useStore } from '../store/useStore';
import { Account } from '../types';
import { formatAmount } from '../utils/formatting';

export const AccountManagementScreen = () => {
    const { accounts, addAccount, updateAccount, deleteAccount, currency } = useStore();
    const theme = useTheme();
    const [visible, setVisible] = useState(false);

    // Account State
    const [editingId, setEditingId] = useState<number | null>(null);
    const [name, setName] = useState('');
    const [type, setType] = useState<string>('Cash');
    const [balance, setBalance] = useState('');
    const [color, setColor] = useState('#4CAF50');
    const [icon, setIcon] = useState('cash');

    const showAddDialog = () => {
        resetForm();
        setVisible(true);
    };

    const showEditDialog = (acc: Account) => {
        setEditingId(acc.id);
        setName(acc.name);
        setType(acc.type);
        setBalance(acc.balance.toString());
        setColor(acc.color || '#4CAF50');
        setIcon(acc.icon || 'cash');
        setVisible(true);
    };
    
    const hideDialog = () => {
        setVisible(false);
        resetForm();
    };

    const resetForm = () => {
        setEditingId(null);
        setName('');
        setType('Cash');
        setBalance('');
        setColor('#4CAF50');
        setIcon('cash');
    };

    const handleSave = () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter an account name');
            return;
        }

        const balanceNum = parseFloat(balance) || 0;

        if (editingId) {
            updateAccount(editingId, name, type, balanceNum, color, icon);
        } else {
            addAccount(name, type, balanceNum, color, icon);
        }
        hideDialog();
    };

    const handleDelete = (id: number, accName: string) => {
        Alert.alert(
            'Delete Account',
            `Are you sure you want to delete "${accName}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteAccount(id) }
            ]
        );
    };

    const colors = [
        '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', 
        '#03A9F4', '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', 
        '#FFEB3B', '#FFC107', '#FF9800', '#FF5722', '#795548', '#607D8B'
    ];

    const icons = [
        'cash', 'bank', 'credit-card', 'cellphone', 'wallet', 'piggy-bank',
        'bitcoin', 'google-wallet', 'apple', 'safe', 'chart-line', 'briefcase'
    ];

    const accountTypes = ['Cash', 'Bank', 'Mobile', 'Card', 'Savings', 'Other'];

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {accounts.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Avatar.Icon size={80} icon="bank-remove" style={{ backgroundColor: theme.colors.surfaceVariant }} />
                        <Text variant="bodyLarge" style={{ marginTop: 16, color: theme.colors.secondary }}>
                            No accounts found.
                        </Text>
                    </View>
                ) : (
                    <View style={styles.grid}>
                        {accounts.map(acc => (
                            <Surface key={acc.id} style={styles.card} elevation={1}>
                                <TouchableOpacity 
                                    style={styles.cardContent}
                                    onPress={() => showEditDialog(acc)}
                                >
                                    <View style={styles.cardHeader}>
                                        <Avatar.Icon 
                                            icon={acc.icon || 'bank'} 
                                            size={40} 
                                            style={{ backgroundColor: acc.color }} 
                                            color="white"
                                        />
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text variant="titleMedium" numberOfLines={1} style={{ fontWeight: 'bold' }}>
                                                {acc.name}
                                            </Text>
                                            <Text variant="bodySmall" style={{ color: 'gray' }}>
                                                {acc.type}
                                            </Text>
                                        </View>
                                        <IconButton 
                                            icon="delete-outline" 
                                            size={20} 
                                            iconColor={theme.colors.error}
                                            onPress={() => handleDelete(acc.id, acc.name)}
                                        />
                                    </View>
                                    <View style={styles.cardFooter}>
                                        <Text variant="titleLarge" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                                            {currency}{formatAmount(acc.balance)}
                                        </Text>
                                        <Text variant="bodySmall" style={{ color: 'gray' }}>Balance</Text>
                                    </View>
                                </TouchableOpacity>
                            </Surface>
                        ))}
                    </View>
                )}
            </ScrollView>

            <Button 
                mode="contained" 
                icon="plus" 
                onPress={showAddDialog} 
                style={styles.fab}
                contentStyle={{ height: 56 }}
            >
                Add New Account
            </Button>

            {/* Full Screen Modal */}
            <Modal
                visible={visible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={hideDialog}
            >
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1, backgroundColor: 'white' }}
                >
                    <Appbar.Header style={{ backgroundColor: 'white', elevation: 0 }}>
                        <Appbar.BackAction onPress={hideDialog} />
                        <Appbar.Content title={editingId ? "Edit Account" : "New Account"} />
                        <Button onPress={handleSave} mode="text">Save</Button>
                    </Appbar.Header>

                    <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
                        <TextInput
                            label="Account Name"
                            value={name}
                            onChangeText={setName}
                            mode="outlined"
                            style={{ marginBottom: 20 }}
                            autoFocus={!editingId}
                        />

                        <TextInput
                            label={editingId ? "Current Balance (Read Only)" : "Initial Balance"}
                            value={balance}
                            onChangeText={setBalance}
                            mode="outlined"
                            keyboardType="numeric"
                            style={{ marginBottom: 20 }}
                            left={<TextInput.Affix text={currency} />}
                            disabled={!!editingId}
                        />

                        <Text variant="titleMedium" style={{ marginBottom: 10 }}>Account Type</Text>
                        <View style={styles.typeGrid}>
                            {accountTypes.map(t => (
                                <Chip 
                                    key={t} 
                                    selected={type === t} 
                                    onPress={() => setType(t)}
                                    style={{ margin: 4 }}
                                    showSelectedOverlay
                                >
                                    {t}
                                </Chip>
                            ))}
                        </View>

                        <Text variant="titleMedium" style={{ marginTop: 20, marginBottom: 10 }}>Select Color</Text>
                        <View style={styles.colorGrid}>
                            {colors.map(c => (
                                <TouchableOpacity
                                    key={c}
                                    onPress={() => setColor(c)}
                                    style={[
                                        styles.colorCircle, 
                                        { backgroundColor: c },
                                        color === c && styles.selectedColor
                                    ]}
                                >
                                    {color === c && <Avatar.Icon icon="check" size={20} color="white" style={{ backgroundColor: 'transparent' }} />}
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text variant="titleMedium" style={{ marginTop: 20, marginBottom: 10 }}>Select Icon</Text>
                        <View style={styles.iconGrid}>
                            {icons.map(i => (
                                <TouchableOpacity
                                    key={i}
                                    onPress={() => setIcon(i)}
                                    style={[
                                        styles.iconItem,
                                        icon === i && { backgroundColor: theme.colors.primaryContainer }
                                    ]}
                                >
                                    <Avatar.Icon 
                                        icon={i} 
                                        size={36} 
                                        color={icon === i ? theme.colors.primary : theme.colors.onSurfaceVariant}
                                        style={{ backgroundColor: 'transparent' }} 
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>
                        
                        <View style={{ height: 50 }} />
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    scrollContent: { padding: 16, paddingBottom: 100 },
    grid: { flexDirection: 'column' },
    card: { 
        marginBottom: 12, 
        borderRadius: 12, 
        backgroundColor: 'white',
        overflow: 'hidden'
    },
    cardContent: { 
        padding: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0'
    },
    fab: { 
        position: 'absolute', 
        margin: 16, 
        right: 0, 
        bottom: 0, 
        borderRadius: 28,
        elevation: 4 
    },
    emptyState: { alignItems: 'center', marginTop: 50 },
    
    // Modal Styles
    modalContent: { padding: 20 },
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
    colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
    colorCircle: { 
        width: 40, 
        height: 40, 
        borderRadius: 20, 
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    selectedColor: { borderWidth: 3, borderColor: '#000', transform: [{scale: 1.1}] },
    iconGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
    iconItem: { 
        width: 50, 
        height: 50, 
        alignItems: 'center', 
        justifyContent: 'center', 
        borderRadius: 12,
        margin: 6 
    }
});