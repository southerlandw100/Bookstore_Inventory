import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useCart } from '../context/CartContext';

export default function CartReviewScreen() {
    const { cart, removeFromCart } = useCart();
    const [confirming, setConfirming] = useState(false);

    async function handleConfirmSale() {
        setConfirming(true);

        for (const item of cart) {
            try {
                const response = await fetch(`http://10.0.0.222:3000/books/${item.id}/sell`, {
                    method: 'POST',
                });

                if (response.ok) {
                    removeFromCart(item.id);
                } else {
                    console.log(`Failed to sell "${item.title}": `, response.status);
                }
            } catch (err) {
                console.log(`Network error selling "${item.title}": `, err);
            }
        }

        setConfirming(false);
    }

    if (cart.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.empty}>Cart is empty</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={cart}
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => (
                    <View style={styles.row}>
                        <View style={styles.rowText}>
                            <Text style={styles.title}>{item.title}</Text>
                            <Text style={styles.author}>{item.author}</Text>
                            <Text style={styles.price}>${item.asking_price}</Text>
                        </View>
                        <TouchableOpacity onPress={() => removeFromCart(item.id)}>
                            <Text style={styles.remove}>Remove</Text>
                        </TouchableOpacity>
                    </View>
                )}
            />

            <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirmSale}
                disabled={confirming}
            >
                {confirming
                    ? <ActivityIndicator color="white" />
                    : <Text style={styles.confirmText}>Confirm Sale</Text>
                }
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    empty: {
        fontSize: 18,
        color: '#888',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    rowText: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    author: {
        fontSize: 14,
        color: '#555',
    },
    price: {
        fontSize: 14,
        marginTop: 2,
    },
    remove: {
        color: 'red',
        fontWeight: 'bold',
        marginLeft: 12,
    },
    confirmButton: {
        backgroundColor: '#2e7d32',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 12,
    },
    confirmText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
