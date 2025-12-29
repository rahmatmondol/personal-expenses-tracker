import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { 
    Button, TextInput, Text, 
    IconButton, useTheme, Avatar, SegmentedButtons, 
    Surface, Appbar
} from 'react-native-paper';
import { useStore } from '../store/useStore';
import { Category } from '../types';

export const CategoryManagementScreen = () => {
    const { categories, addCategory, updateCategory, deleteCategory } = useStore();
    const theme = useTheme();
    const [visible, setVisible] = useState(false);
    const [viewType, setViewType] = useState<'income' | 'expense'>('expense');

    // Category State
    const [editingId, setEditingId] = useState<number | null>(null);
    const [name, setName] = useState('');
    const [type, setType] = useState<'income' | 'expense'>('expense');
    const [color, setColor] = useState('#2196F3');
    const [icon, setIcon] = useState('tag');

    const showAddDialog = () => {
        resetForm();
        setType(viewType); // Default to current view
        setVisible(true);
    };

    const showEditDialog = (cat: Category) => {
        setEditingId(cat.id);
        setName(cat.name);
        setType(cat.type);
        setColor(cat.color);
        setIcon(cat.icon || 'tag');
        setVisible(true);
    };
    
    const hideDialog = () => {
        setVisible(false);
        resetForm();
    };

    const resetForm = () => {
        setEditingId(null);
        setName('');
        setType('expense');
        setColor('#2196F3');
        setIcon('tag');
    };

    const handleSave = () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter a category name');
            return;
        }

        if (editingId) {
            updateCategory(editingId, name, type, color, icon);
        } else {
            addCategory(name, type, color, icon);
        }
        hideDialog();
    };

    const handleDelete = (id: number, catName: string) => {
        Alert.alert(
            'Delete Category',
            `Are you sure you want to delete "${catName}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteCategory(id) }
            ]
        );
    };

    const colors = [
        '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', 
        '#03A9F4', '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', 
        '#FFEB3B', '#FFC107', '#FF9800', '#FF5722', '#795548', '#607D8B'
    ];

    const icons = [
        'tag', 'food', 'cart', 'shopping', 'bus', 'car', 'train', 'airplane',
        'home', 'home-city', 'movie', 'gamepad-variant', 'hospital-box', 'pill',
        'school', 'book-open-variant', 'cash', 'bank', 'credit-card', 'gift',
        'briefcase', 'hammer-wrench', 'phone', 'wifi', 'lightning-bolt', 'water'
    ];

    const filteredCategories = categories.filter(c => c.type === viewType);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <SegmentedButtons
                    value={viewType}
                    onValueChange={value => setViewType(value as 'income' | 'expense')}
                    buttons={[
                        { value: 'expense', label: 'Expense', icon: 'cart-outline' },
                        { value: 'income', label: 'Income', icon: 'cash' },
                    ]}
                    style={styles.segmentedButton}
                />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {filteredCategories.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Avatar.Icon size={80} icon="playlist-remove" style={{ backgroundColor: theme.colors.surfaceVariant }} />
                        <Text variant="bodyLarge" style={{ marginTop: 16, color: theme.colors.secondary }}>
                            No {viewType} categories found.
                        </Text>
                    </View>
                ) : (
                    <View style={styles.grid}>
                        {filteredCategories.map(cat => (
                            <Surface key={cat.id} style={styles.card} elevation={1}>
                                <TouchableOpacity 
                                    style={styles.cardContent}
                                    onPress={() => showEditDialog(cat)}
                                >
                                    <Avatar.Icon 
                                        icon={cat.icon || 'tag'} 
                                        size={48} 
                                        style={{ backgroundColor: cat.color }} 
                                        color="white"
                                    />
                                    <Text variant="titleMedium" style={styles.cardTitle} numberOfLines={1}>
                                        {cat.name}
                                    </Text>
                                    <IconButton 
                                        icon="delete-outline" 
                                        size={20} 
                                        iconColor={theme.colors.error}
                                        style={styles.deleteBtn}
                                        onPress={() => handleDelete(cat.id, cat.name)}
                                    />
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
                Add New Category
            </Button>

            {/* Full Screen Modal for better UX and Keyboard Handling */}
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
                        <Appbar.Content title={editingId ? "Edit Category" : "New Category"} />
                        <Button onPress={handleSave} mode="text">Save</Button>
                    </Appbar.Header>

                    <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
                        <TextInput
                            label="Category Name"
                            value={name}
                            onChangeText={setName}
                            mode="outlined"
                            style={{ marginBottom: 20 }}
                            autoFocus={!editingId}
                        />

                        <Text variant="titleMedium" style={{ marginBottom: 10 }}>Type</Text>
                        <SegmentedButtons
                            value={type}
                            onValueChange={value => setType(value as 'income' | 'expense')}
                            buttons={[
                                { value: 'expense', label: 'Expense', icon: 'cart-outline' },
                                { value: 'income', label: 'Income', icon: 'cash' },
                            ]}
                            style={{ marginBottom: 20 }}
                        />

                        <Text variant="titleMedium" style={{ marginBottom: 10 }}>Select Color</Text>
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
                        
                        {/* Spacer for bottom safe area */}
                        <View style={{ height: 50 }} />
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    header: { padding: 16, backgroundColor: 'white', elevation: 2 },
    segmentedButton: { marginBottom: 0 },
    scrollContent: { padding: 16, paddingBottom: 100 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    card: { 
        width: '48%', 
        marginBottom: 16, 
        borderRadius: 12, 
        backgroundColor: 'white',
        overflow: 'hidden'
    },
    cardContent: { 
        padding: 16, 
        alignItems: 'center', 
        justifyContent: 'center',
        position: 'relative'
    },
    cardTitle: { marginTop: 12, fontWeight: 'bold', textAlign: 'center' },
    deleteBtn: { position: 'absolute', top: 0, right: 0, margin: 0 },
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
