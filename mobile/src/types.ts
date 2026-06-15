export type LookupResult = { title: string; author: string; genre: string }

type BookStatus = 'in_stock' | 'sold'

export type Book = {
    id: number
    isbn: string
    title: string
    author: string
    genre: string
    asking_price: string
    status: BookStatus
    date_added: string
    date_sold: string | null
}

export type CartItem = Book

export type RootStackParamList = {
    Scanner: undefined;
    BookEntry: { isbn: string; lookupResult: LookupResult | null };
    Home: undefined;
    SellScanner: undefined;
    CartReview: undefined;
};
