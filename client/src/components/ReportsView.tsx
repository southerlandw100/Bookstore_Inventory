import { useState } from 'react'
import type { Book } from '../types'

type Props = {
  books: Book[]
}

function daysInStock(dateAdded: string) {
  const added = new Date(dateAdded).getTime()
  return Math.floor((Date.now() - added) / (1000 * 60 * 60 * 24))
}

export default function ReportsView({ books }: Props) {
  const [threshold, setThreshold] = useState(90)

  const inStock = books
    .filter(b => b.status === 'in_stock')
    .map(b => ({ ...b, days: daysInStock(b.date_added) }))
    .sort((a, b) => b.days - a.days)

  const overThreshold = inStock.filter(b => b.days >= threshold).length

  return (
    <div>
      <h2>Aging Report</h2>

      <div className="aging-controls">
        <label>
          Highlight items in stock for
          <input
            type="number"
            min={0}
            value={threshold}
            onChange={e => setThreshold(Number(e.target.value))}
          />
          days or more
        </label>
        <span>{overThreshold} of {inStock.length} books in stock {threshold}+ days</span>
      </div>

      <div className="table-wrapper">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Author</th>
              <th>Genre</th>
              <th>ISBN</th>
              <th>Price</th>
              <th>Date Added</th>
              <th>Days in Stock</th>
            </tr>
          </thead>
          <tbody>
            {inStock.map(book => (
              <tr key={book.id} className={book.days >= threshold ? 'stale-row' : ''}>
                <td>{book.title}</td>
                <td>{book.author}</td>
                <td>{book.genre}</td>
                <td>{book.isbn}</td>
                <td>{book.asking_price}</td>
                <td>{new Date(book.date_added).toLocaleDateString()}</td>
                <td>{book.days}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
