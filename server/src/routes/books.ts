import { Hono } from 'hono'
import { db } from '../db/index.js'
import { books } from '../db/schema.js'
import { eq } from 'drizzle-orm'

const router = new Hono()

router.get('/', async (c) => {
    const allBooks = await db.select().from(books);
    return c.json(allBooks);
});

router.get('/:id', async (c) => {
    const id = Number(c.req.param("id"))
    const book = await db.select().from(books).where(eq(books.id, id))
    return c.json(book[0])
})

export default router
