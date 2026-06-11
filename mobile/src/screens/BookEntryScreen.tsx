import { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'BookEntry'>;

export default function BookEntryScreen({ route, navigation }: Props) {
    const { isbn, lookupResult } = route.params;
    const [title, setTitle] = useState(lookupResult?.title ?? '');
    const [author, setAuthor] = useState(lookupResult?.author ?? '');
    const [genre, setGenre] = useState(lookupResult?.genre ??  '');
    const [price, setPrice] = useState('');

    const handleSubmit = async () => {
        try {
            const response = await fetch('http://10.0.0.222:3000/books', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isbn, title, author, genre, asking_price: price }),
            });

            if (!response.ok) {
                console.log('Save failed: ', response.status);
            } else {
                const saved = await response.json();
                console.log('Saved: ', saved);
                navigation.navigate('Scanner');
            }
        }
        catch (err) { console.log('Network Error: ', err); }
    }

    return(
        <View style={styles.container}>
            <Text style={styles.label}>ISBN</Text>
            <Text style={styles.isbn}>{isbn}</Text>     

            <Text style={styles.label}>Title</Text> 
            <TextInput style={styles.input} value={title} onChangeText={setTitle} />               

            <Text style={styles.label}>Author</Text>                 
            <TextInput style={styles.input} value={author} onChangeText={setAuthor} />     

            <Text style={styles.label}>Genre</Text>                 
            <TextInput style={styles.input} value={genre} onChangeText={setGenre} /> 

            <Text style={styles.label}>Price</Text>                 
            <TextInput
                style={[styles.input, styles.priceInput]}
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
            />

            <Button title="Save Book" onPress={handleSubmit} />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        justifyContent: 'center',
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 12,
    },
    isbn: {
        fontSize: 16,
        marginBottom: 4,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 6,
        padding: 8,
        marginTop: 4,
        fontSize: 16,
    },
    priceInput: {
        marginBottom: 16,
    },
});