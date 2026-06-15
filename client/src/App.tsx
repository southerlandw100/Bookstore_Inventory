import { useState, useEffect } from 'react'
import type { Book } from './types'
import './App.css'

function App() {
  const [books, setBooks] = useState<Book[]>([])
  const [editingId, setEditingID] = useState<number | null>(null)
  const [editValues, setEditValues] = useState({ title: '', author: '', genre: '', asking_price: '' })
  const [confirmAction, setConfirmAction] = useState<{ type: 'sell' | 'delete', id: number } | null>(null)

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
  
    async function sellBook(id: number) {
    try {

      const response = await fetch(`http://localhost:3000/books/${id}/sell`, {
        method: 'POST'
      })

      if (!response.ok) {
        console.error('Failed to sell book: ', response.status)
        return
      }

      const soldBook = await response.json()

      setBooks(books.map(book => book.id === id ? soldBook : book))
    } catch (err) {
      console.error('Network error in selling the book: ', err)
    }
  }

  async function deleteBook(id: number) {
    try {

      const response = await fetch(`http://localhost:3000/books/${id}`, {
        method: 'DELETE'
      })
    
    if(!response.ok) {
      console.error('Failed to delete book: ', response.status)
      return
    }    
    setBooks(books.filter(b => b.id !== id))
    } catch(err) { console.error('Network error in deleting book: ', err) }
  }

  function handleConfirm() {
    if (!confirmAction) return
    if (confirmAction.type === 'sell') sellBook(confirmAction.id)
    else deleteBook(confirmAction.id)
    setConfirmAction(null)
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
                    <button onClick={() => setConfirmAction({ type: 'sell', id: book.id })}>Sell</button>
                    <button onClick={() => setConfirmAction({ type: 'delete', id: book.id })}>Delete</button>
                  </td>
                </>
              )}
            </tr>
          ))}

        </tbody>
      </table>

      {confirmAction && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ background: 'white', color: 'black', padding: '1.5rem', borderRadius: '8px' }}>
            <p>
              Are you sure you want to {confirmAction.type === 'sell' ? 'mark this book as sold' : 'delete this book'}?
            </p>
            <button onClick={handleConfirm}>Yes</button>
            <button onClick={() => setConfirmAction(null)}>No</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
