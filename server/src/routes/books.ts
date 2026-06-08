import { Hono } from 'hono'
import { db } from '../db/index.js'
import { books } from '../db/schema.js'
import { eq } from 'drizzle-orm'

const router = new Hono()

router.get('/', async (c) => {
    const allBooks = await db.select().from(books);
    return c.json(allBooks);
})

router.get('/isbn/:isbn', async (c) => {
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

router.get('/lookup/:isbn', async (c) => {
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

router.post('/:id/sell', async (c) => {
    const id = Number(c.req.param("id"))
    
    //checking if this specific book has already been sold
    const existing = await db.select().from(books).where(eq(books.id, id))
    if (!existing[0]) return c.json({ error: 'Not Found' }, 404)
    if (existing[0].status === 'sold') return c.json({ error: 'Already Sold' }, 409)

    const soldBook = await db.update(books).set({ status: 'sold', date_sold: new Date() }).where(eq(books.id, id)).returning()
    if(!soldBook[0]) return c.json({ error: 'Not Found' }, 404)

    return c.json(soldBook[0], 200)
})

router.delete('/:id', async (c) => {
    const id = Number(c.req.param('id'))

    const deletedBook = await db.delete(books).where(eq(books.id, id)).returning()
    if(!deletedBook[0]) return c.json({ error: 'Not Found' }, 404)

    return c.json(deletedBook[0], 200)
})

export default router
