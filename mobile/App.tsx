  import BookEntryScreen from './src/screens/BookEntryScreen';

  export default function App() {
    return (
      <BookEntryScreen
        isbn="9780099428797"
        lookupResult={{ title: 'Crash', author: 'J.G. Ballard', genre: 'Fiction' }}
      />
    );
  }