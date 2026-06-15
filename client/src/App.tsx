import { useState, useEffect } from 'react'
import type { Book } from './types'
import InventoryView from './components/InventoryView'
import ReportsView from './components/ReportsView'
import './App.css'

function App() {
  const [books, setBooks] = useState<Book[]>([])
  const [activeTab, setActiveTab] = useState<'inventory' | 'reports'>('inventory')

  useEffect(() => {
    fetch('http://localhost:3000/books')
      .then(res => res.json())
      .then(data => setBooks(data))
  }, [])

  return (
    <div>
      <h1>Inventory</h1>

      <nav className="tabs">
        <button
          className={activeTab === 'inventory' ? 'active' : ''}
          onClick={() => setActiveTab('inventory')}
        >
          Inventory
        </button>
        <button
          className={activeTab === 'reports' ? 'active' : ''}
          onClick={() => setActiveTab('reports')}
        >
          Reports
        </button>
      </nav>

      {activeTab === 'inventory'
        ? <InventoryView books={books} setBooks={setBooks} />
        : <ReportsView books={books} />
      }
    </div>
  )
}

export default App
