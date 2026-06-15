import { useCameraPermissions, CameraView, BarcodeScanningResult } from "expo-camera";
import { useState, useEffect, useCallback } from "react";
import { StyleSheet, Button, View, Text } from "react-native"
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import { lookupBook } from "../api";

export default function Scanner() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Scanner'>>();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [feedback, setFeedback] = useState<{ message: string; color: string } | null>(null);

    useEffect(() => {
        if (permission === null) {
            requestPermission();
        }
    }, [permission, requestPermission]);

    useFocusEffect(
      useCallback(() => {
          setScanned(false);
      }, [])
    );


  const handleBarCodeScanned = async ({ data }: BarcodeScanningResult) => {
      setScanned(true);

      try {
          const bookInfo = await lookupBook(data);
          navigation.navigate('BookEntry', { isbn: data, lookupResult: bookInfo });
      } catch (err) {
        console.log('Network error: ', err);
        setFeedback({ message: 'Network error - try again', color: 'red'})
        setTimeout(() => { setScanned(false); setFeedback(null); }, 1500)
      }
  };


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
                <View style={[styles.reticle, { borderColor: feedback?.color ?? (scanned ? 'lime' : 'white') }]} />
                <View style={styles.mask} />
            </View>

            <View style={[styles.mask, styles.bottom]}>
                <Text style={styles.instructions}>{feedback?.message ?? 'Frame barcode within the box'}</Text>
            </View>
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
});
