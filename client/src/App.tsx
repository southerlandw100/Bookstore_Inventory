import { useState, useEffect } from 'react'
import type { Book } from './types'
import './App.css'

function App() {
  const [books, setBooks] = useState<Book[]>([])
  const [editingId, setEditingID] = useState<number | null>(null)
  const [editValues, setEditValues] = useState({ title: '', author: '', genre: '', asking_price: '' })

  useEffect(() => {
    fetch('http://localhost:3000/books')
      .then(res => res.json())
      .then(data => setBooks(data))
  }, [])

  function startEdit(book: Book) {
    setEditingID(book.id)
    setEditValues({
      title: book.title,
      author: book.author,
      genre: book.genre,
      asking_price: book.asking_price
    })
  }

  function cancelEdit() { setEditingID(null) };

  async function saveEdit(id: number) {
    try {
      const response = await fetch(`http://localhost:3000/books/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editValues)
      })

      if (!response.ok) {
        console.error('Failed to save book my bad: ', response.status)
        return
      }

      const updatedBook = await response.json()

      setBooks(books.map(book => book.id === id ? updatedBook : book))
      setEditingID(null)
    } catch (err) {
      console.error('Network error in saving book: ', err)
    }
  }

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
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {books.map(book => (
            <tr key={book.id}>
              {editingId === book.id ? (
                <>
                  <td>
                    <input
                      value={editValues.title}
                      onChange={e => setEditValues({ ...editValues, title: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      value={editValues.author}
                      onChange={e => setEditValues({ ...editValues, author: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      value={editValues.genre}
                      onChange={e => setEditValues({ ...editValues, genre: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      value={editValues.asking_price}
                      onChange={e => setEditValues({ ...editValues, asking_price: e.target.value })}
                    />
                  </td>
                  <td>{book.status}</td>
                  <td>
                    <button onClick={() => saveEdit(book.id)}>Save</button>
                    <button onClick={cancelEdit}>Cancel</button>
                  </td>
                </>
              ) : (
                <>
                  <td>{book.title}</td>
                  <td>{book.author}</td>
                  <td>{book.genre}</td>
                  <td>{book.asking_price}</td>
                  <td>{book.status}</td>
                  <td>
                    <button onClick={() => startEdit(book)}>Edit</button>
                  </td>
                </>
              )}
            </tr>
          ))}

        </tbody>
      </table>
    </div>
  )
}

export default App
