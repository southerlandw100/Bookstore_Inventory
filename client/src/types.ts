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
    notes: string | null
}