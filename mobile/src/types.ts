export type LookupResult = { title: string; author: string; genre: string }

export type RootStackParamList = {
    Scanner: undefined;
    BookEntry: { isbn: string; lookupResult: LookupResult | null };
};