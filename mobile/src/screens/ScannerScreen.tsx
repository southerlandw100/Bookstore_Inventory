import { useCameraPermissions, CameraView, BarcodeScanningResult } from "expo-camera";
import { useState, useEffect, useCallback } from "react";
import { StyleSheet, Button, View, Text } from "react-native"
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";

export default function Scanner() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Scanner'>>();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);

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
          const response = await fetch(`http://10.0.0.222:3000/books/lookup/${data}`);

          if (!response.ok) {
            console.log('Lookup failed: ', response.status);
            navigation.navigate('BookEntry', { isbn: data, lookupResult: null });
          } else {
              const bookInfo = await response.json();
              navigation.navigate('BookEntry', { isbn: data, lookupResult: bookInfo });
          }
      } catch (err) {
        console.log('Network error: ', err);
        setScanned(false);
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
                <View style={[styles.reticle, { borderColor: scanned ? 'lime' : 'white' }]} />
                <View style={styles.mask} />
            </View>

            <View style={[styles.mask, styles.bottom]}>
                <Text style={styles.instructions}>Frame barcode within the box</Text>
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
