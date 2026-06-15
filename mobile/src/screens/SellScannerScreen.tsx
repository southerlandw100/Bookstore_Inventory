import { useCameraPermissions, CameraView, BarcodeScanningResult } from "expo-camera";
import { useState, useEffect, useCallback } from "react";
import { StyleSheet, Button, View, Text, TouchableOpacity, FlatList } from "react-native"
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList, CartItem } from "../types";
import { useCart } from "../context/CartContext";
import { getInStockCopies } from "../api";

export default function SellScannerScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'SellScanner'>>();
    const { cart, addToCart } = useCart();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [feedback, setFeedback] = useState<{ message: string; color: string } | null>(null);
    const [multiCopyOptions, setMultiCopyOptions] = useState<CartItem[] | null>(null);

    useEffect(() => {
        if (permission === null) {
            requestPermission();
        }
    }, [permission, requestPermission]);

    useFocusEffect(
        useCallback(() => {
            setScanned(false);
            setFeedback(null);
        }, [])
    );

    const handleBarCodeScanned = async ({ data }: BarcodeScanningResult) => {
        setScanned(true);

        try {
            const matches = await getInStockCopies(data);

            if (matches.length === 0) {
                setFeedback({ message: 'Not in stock', color: 'red' });
            } else if (matches.length === 1) {
                addToCart(matches[0]);
                setFeedback({ message: `Added: ${matches[0].title}`, color: 'lime' });
            } else {
                setFeedback({ message: 'Multiple copies found', color: 'orange' });
                setMultiCopyOptions(matches);
                return;
            }
        } catch (err) {
            console.log('Network error: ', err);
            setFeedback({ message: 'Network error', color: 'red' });
        }

        setTimeout(() => {
            setScanned(false);
            setFeedback(null);
        }, 1500);
    };

    function handleSelectCopy(item: CartItem) {
        addToCart(item);
        setMultiCopyOptions(null);
        setFeedback({ message: `Added: ${item.title}`, color: 'lime' });

        setTimeout(() => {
            setScanned(false);
            setFeedback(null);
        }, 1500);
    }

    function handleCancelCopyPicker() {
        setMultiCopyOptions(null);
        setFeedback(null);
        setScanned(false);
    }

    if (!permission?.granted) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text>Camera Access Required For ISBN Scanning</Text>
                <Button title="Grant permission" onPress={requestPermission} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            <CameraView
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ['ean13']
                }}
                style={StyleSheet.absoluteFillObject}
            />

            <View style={styles.mask} />

            <View style={styles.middleRow}>
                <View style={styles.mask} />
                <View style={[styles.reticle, { borderColor: feedback?.color ?? 'white' }]} />
                <View style={styles.mask} />
            </View>

            <View style={[styles.mask, styles.bottom]}>
                <Text style={styles.instructions}>
                    {feedback?.message ?? 'Scan a book to sell'}
                </Text>
            </View>

            <TouchableOpacity
                style={styles.cartBadge}
                onPress={() => navigation.navigate('CartReview')}
            >
                <Text style={styles.cartBadgeText}>Cart ({cart.length})</Text>
            </TouchableOpacity>

            {multiCopyOptions && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Multiple copies in stock — pick one</Text>
                        <FlatList
                            data={multiCopyOptions}
                            keyExtractor={item => item.id.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.modalItem} onPress={() => handleSelectCopy(item)}>
                                    <Text style={styles.modalItemText}>
                                        ${item.asking_price} — added {new Date(item.date_added).toLocaleDateString()}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />
                        <TouchableOpacity style={styles.modalCancel} onPress={handleCancelCopyPicker}>
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    mask: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    middleRow: {
        flexDirection: 'row',
        height: 150,
    },
    reticle: {
        width: 250,
        height: 150,
        borderWidth: 4,
        borderRadius: 12,
    },
    bottom: {
        alignItems: 'center',
        paddingTop: 24,
    },
    instructions: {
        color: 'white',
        fontSize: 16,
    },
    cartBadge: {
        position: 'absolute',
        top: 50,
        right: 20,
        backgroundColor: 'white',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    cartBadgeText: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    modalOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
        width: '80%',
        maxHeight: '60%',
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    modalItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalItemText: {
        fontSize: 16,
    },
    modalCancel: {
        marginTop: 12,
        alignItems: 'center',
        paddingVertical: 8,
    },
    modalCancelText: {
        color: 'red',
        fontWeight: 'bold',
    },
});
