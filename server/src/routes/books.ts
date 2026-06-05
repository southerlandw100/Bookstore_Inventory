import { Hono } from 'hono'
import { db } from '../db/index.js'
import { books } from '../db/schema.js'
import { eq } from 'drizzle-orm'

const router = new Hono()

router.get('/', async (c) => {
    const allBooks = await db.select().from(books);
    return c.json(allBooks);
})

router.get('/books/isbn/:isbn', async (c) => {
    const isbn = c.req.param("isbn")
    const bookByISBN = await db.select().from(books).where(eq(books.isbn, isbn))
    return c.json(bookByISBN[0])
})

router.get('/:id', async (c) => {
    const id = Number(c.req.param("id"))
    const book = await db.select().from(books).where(eq(books.id, id))
    return c.json(book[0])
})

router.post('/', async (c) => {
    const body = await c.req.json()
    const newBook = await db.insert(books).values({ ...body }).returning()
    return c.json(newBook[0], 201)
})

router.put('/:id', async (c) => {
    const id = Number(c.req.param("id"))
    const body = await c.req.json()
    const updatedBook = await db.update(books).set({ ...body }).where(eq(books.id, id)).returning()
    if (!updatedBook[0]) return c.json({ error: 'Not Found' }, 404)
    
    return c.json(updatedBook[0], 200)
})

router.get('/books/lookup/:isbn', async (c) => {
    const isbn = c.req.param('isbn')
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`)
    const data = await response.json()

    if(!data.items) return c.json({ error: 'Not Found' }, 404)

    const { title, authors, categories } = data.items[0].volumeInfo    
    return c.json({
        title,
        author: authors?.[0],
        genre: categories?.[0]
    })
})

export default router
