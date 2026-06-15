import { LookupResult, Book, CartItem } from './types';

const BASE_URL = 'http://10.0.0.222:3000';

export async function lookupBook(isbn: string): Promise<LookupResult | null> {
    const response = await fetch(`${BASE_URL}/books/lookup/${isbn}`);
    if (!response.ok) return null;
    return response.json();
}

export async function createBook(data: {
    isbn: string;
    title: string;
    author: string;
    genre: string;
    asking_price: string;
}): Promise<Book | null> {
    const response = await fetch(`${BASE_URL}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (!response.ok) return null;
    return response.json();
}

export async function getInStockCopies(isbn: string): Promise<CartItem[]> {
    const response = await fetch(`${BASE_URL}/books/isbn/${isbn}`);
    if (!response.ok) return [];
    return response.json();
}

export async function sellBook(id: number): Promise<boolean> {
    const response = await fetch(`${BASE_URL}/books/${id}/sell`, { method: 'POST' });
    return response.ok;
}
