import { View, Text, Button, StyleSheet } from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../types'

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
return (
          <View style={styles.container}>
              <Text style={styles.title}>Bookstore Inventory</Text>

              <Button title="Add Book" onPress={() => navigation.navigate('Scanner')} />
              <Button title="Sell Books" onPress={() => navigation.navigate('SellScanner')} />
          </View>
      );
  }

  const styles = StyleSheet.create({
      container: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
      },
      title: {
          fontSize: 24,
          fontWeight: 'bold',
          marginBottom: 24,
      },
  });