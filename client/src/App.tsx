import { useState, useEffect } from 'react'
import type { Book } from './types'
import './App.css'

function App() {
  const [books, setBooks] = useState<Book[]>([])
  
  useEffect(() => {
    fetch('http://localhost:3000/books')
      .then(res => res.json())
      .then(data => setBooks(data))
  }, [])

  return (
    <div>
      <h1>Inventory</h1>
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Author</th>
            <th>Genre</th>
            <th>Price</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {books.map(book => (
            <tr key={book.id}>
              <td>{book.title}</td>
              <td>{book.author}</td>
              <td>{book.genre}</td>
              <td>{book.asking_price}</td>
              <td>{book.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default App
