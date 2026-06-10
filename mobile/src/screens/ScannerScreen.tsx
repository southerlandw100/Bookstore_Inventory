import { useCameraPermissions, CameraView, BarcodeScanningResult } from "expo-camera";
import { useState, useEffect } from "react";
import { StyleSheet, Button, View, Text } from "react-native"

export default function Scanner() {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);

    useEffect(() => {
        if (permission === null) {
            requestPermission();
        }
    }, [permission, requestPermission]);


  const handleBarCodeScanned = async ({ type, data }: BarcodeScanningResult) => {
      setScanned(true);

      try {
          const response = await fetch(`http://10.0.0.222:3000/books/lookup/${data}`);

          if (!response.ok) {
              console.log('Lookup failed: ', response.status);
          } else {
              const bookInfo = await response.json();                                                                                                                                                        
              console.log('Book info: ', bookInfo);
          }
      } catch (err) { 
          console.log('Network error: ', err);
      }

      setScanned(false);
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
        <CameraView
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
                barcodeTypes: ['ean13']
            }}
            style={StyleSheet.absoluteFillObject}
        />
    );
}