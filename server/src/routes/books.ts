import { Hono } from 'hono'
import { db } from '../db/index.js'
import { books } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'

const router = new Hono()

router.get('/', async (c) => {
    const allBooks = await db.select().from(books);
    return c.json(allBooks);
})

  router.get('/isbn/:isbn', async (c) => {
      const isbn = c.req.param("isbn")
      const inStockBooks = await db.select().from(books)
          .where(and(eq(books.isbn, isbn), eq(books.status, 'in_stock')))
      return c.json(inStockBooks)
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
    if (body.date_added) body.date_added = new Date(body.date_added)
    const updatedBook = await db.update(books).set({ ...body }).where(eq(books.id, id)).returning()
    if (!updatedBook[0]) return c.json({ error: 'Not Found' }, 404)
    
    return c.json(updatedBook[0], 200)
})

router.get('/lookup/:isbn', async (c) => {
    const isbn = c.req.param('isbn')
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${process.env.GOOGLE_BOOKS_API_KEY}`)
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

router.post('/:id/return', async (c) => {
    const id = Number(c.req.param("id"))

    //checking if this specific book is actually marked as sold
    const existing = await db.select().from(books).where(eq(books.id, id))
    if (!existing[0]) return c.json({ error: 'Not Found' }, 404)
    if (existing[0].status === 'in_stock') return c.json({ error: 'Not Sold' }, 409)

    const returnedBook = await db.update(books).set({ status: 'in_stock', date_sold: null }).where(eq(books.id, id)).returning()
    if(!returnedBook[0]) return c.json({ error: 'Not Found' }, 404)

    return c.json(returnedBook[0], 200)
})

router.delete('/:id', async (c) => {
    const id = Number(c.req.param('id'))

    const deletedBook = await db.delete(books).where(eq(books.id, id)).returning()
    if(!deletedBook[0]) return c.json({ error: 'Not Found' }, 404)

    return c.json(deletedBook[0], 200)
})

export default router
