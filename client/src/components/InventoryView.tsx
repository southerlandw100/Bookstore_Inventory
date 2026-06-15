import { useState, useEffect, useRef } from 'react'
import type { Book } from '../types'

type SortColumn = 'title' | 'author' | 'genre' | 'isbn' | 'asking_price' | 'status' | 'date_added' | 'date_sold'
type SortDirection = 'asc' | 'desc'

type Props = {
  books: Book[]
  setBooks: React.Dispatch<React.SetStateAction<Book[]>>
}

function formatDate(dateStr: string | null) {
  return dateStr ? new Date(dateStr).toLocaleDateString() : '—'
}

function escapeCsvField(field: string) {
  if (/[",\n]/.test(field)) {
    return `"${field.replace(/"/g, '""')}"`
  }
  return field
}

export default function InventoryView({ books, setBooks }: Props) {
  const [editingId, setEditingID] = useState<number | null>(null)
  const [editValues, setEditValues] = useState({ title: '', author: '', genre: '', asking_price: '', notes: '' })
  const [confirmAction, setConfirmAction] = useState<{ type: 'sell' | 'delete' | 'return', ids: number[] } | null>(null)

  const [sortColumn, setSortColumn] = useState<SortColumn>('title')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  const [searchQuery, setSearchQuery] = useState('')
  const [titleFilter, setTitleFilter] = useState('')
  const [authorFilter, setAuthorFilter] = useState('')
  const [genreFilter, setGenreFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [isbnFilter, setIsbnFilter] = useState<{ isbn: string, title: string, author: string } | null>(null)

  const [pageSize, setPageSize] = useState(25)
  const [currentPage, setCurrentPage] = useState(1)

  const editingRowRef = useRef<HTMLTableRowElement>(null)

  function startEdit(book: Book) {
    setEditingID(book.id)
    setEditValues({
      title: book.title,
      author: book.author,
      genre: book.genre,
      asking_price: book.asking_price,
      notes: book.notes ?? ''
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

      setBooks(prev => prev.map(book => book.id === id ? updatedBook : book))
      setEditingID(null)
    } catch (err) {
      console.error('Network error in saving book: ', err)
    }
  }

  async function sellBooks(ids: number[]) {
    for (const id of ids) {
      try {
        const response = await fetch(`http://localhost:3000/books/${id}/sell`, {
          method: 'POST'
        })

        if (!response.ok) {
          console.error('Failed to sell book: ', response.status)
          continue
        }

        const soldBook = await response.json()
        setBooks(prev => prev.map(book => book.id === id ? soldBook : book))
      } catch (err) {
        console.error('Network error in selling the book: ', err)
      }
    }
    setSelectedIds(new Set())
  }

  async function deleteBooks(ids: number[]) {
    for (const id of ids) {
      try {
        const response = await fetch(`http://localhost:3000/books/${id}`, {
          method: 'DELETE'
        })

        if (!response.ok) {
          console.error('Failed to delete book: ', response.status)
          continue
        }

        setBooks(prev => prev.filter(b => b.id !== id))
      } catch (err) {
        console.error('Network error in deleting book: ', err)
      }
    }
    setSelectedIds(new Set())
  }

  async function returnBooks(ids: number[]) {
    for (const id of ids) {
      try {
        const response = await fetch(`http://localhost:3000/books/${id}/return`, {
          method: 'POST'
        })

        if (!response.ok) {
          console.error('Failed to return book to stock: ', response.status)
          continue
        }

        const returnedBook = await response.json()
        setBooks(prev => prev.map(book => book.id === id ? returnedBook : book))
      } catch (err) {
        console.error('Network error in returning book to stock: ', err)
      }
    }
    setSelectedIds(new Set())
  }

  function handleConfirm() {
    if (!confirmAction) return
    if (confirmAction.type === 'sell') sellBooks(confirmAction.ids)
    else if (confirmAction.type === 'delete') deleteBooks(confirmAction.ids)
    else returnBooks(confirmAction.ids)
    setConfirmAction(null)
  }

  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  function sortIndicator(column: SortColumn) {
    if (sortColumn !== column) return null
    return sortDirection === 'asc' ? ' ▲' : ' ▼'
  }

  function toggleSelect(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll(pageIds: number[]) {
    const allSelected = pageIds.every(id => selectedIds.has(id))
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (allSelected) {
        pageIds.forEach(id => next.delete(id))
      } else {
        pageIds.forEach(id => next.add(id))
      }
      return next
    })
  }

  function clearFilters() {
    setTitleFilter('')
    setAuthorFilter('')
    setGenreFilter('')
    setDateFrom('')
    setDateTo('')
  }

  function exportCSV() {
    const headers = ['ISBN', 'Title', 'Author', 'Genre', 'Price', 'Status', 'Date Added', 'Date Sold', 'Notes']
    const rows = sortedBooks.map(b => [
      b.isbn,
      b.title,
      b.author,
      b.genre,
      b.asking_price,
      b.status,
      formatDate(b.date_added),
      formatDate(b.date_sold),
      b.notes ?? ''
    ])

    const csv = [headers, ...rows]
      .map(row => row.map(escapeCsvField).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'inventory.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const genres = Array.from(new Set(books.map(b => b.genre))).sort()

  let visibleBooks = books

  if (isbnFilter) {
    visibleBooks = visibleBooks.filter(b => b.isbn === isbnFilter.isbn)
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase()
    visibleBooks = visibleBooks.filter(b =>
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      b.isbn.toLowerCase().includes(q) ||
      b.genre.toLowerCase().includes(q) ||
      b.status.toLowerCase().includes(q) ||
      (b.notes ?? '').toLowerCase().includes(q)
    )
  }
  if (titleFilter) {
    visibleBooks = visibleBooks.filter(b => b.title.toLowerCase().includes(titleFilter.toLowerCase()))
  }
  if (authorFilter) {
    visibleBooks = visibleBooks.filter(b => b.author.toLowerCase().includes(authorFilter.toLowerCase()))
  }
  if (genreFilter) {
    visibleBooks = visibleBooks.filter(b => b.genre === genreFilter)
  }
  if (dateFrom) {
    visibleBooks = visibleBooks.filter(b => b.date_added >= dateFrom)
  }
  if (dateTo) {
    visibleBooks = visibleBooks.filter(b => b.date_added <= dateTo + 'T23:59:59.999Z')
  }

  const sortedBooks = [...visibleBooks].sort((a, b) => {
    let cmp = 0
    if (sortColumn === 'asking_price') {
      cmp = parseFloat(a.asking_price) - parseFloat(b.asking_price)
    } else if (sortColumn === 'date_added') {
      cmp = new Date(a.date_added).getTime() - new Date(b.date_added).getTime()
    } else if (sortColumn === 'date_sold') {
      const aTime = a.date_sold ? new Date(a.date_sold).getTime() : -Infinity
      const bTime = b.date_sold ? new Date(b.date_sold).getTime() : -Infinity
      cmp = aTime - bTime
    } else {
      cmp = a[sortColumn].localeCompare(b[sortColumn])
    }
    return sortDirection === 'asc' ? cmp : -cmp
  })

  const totalPages = Math.max(1, Math.ceil(sortedBooks.length / pageSize))
  const currentPageClamped = Math.min(currentPage, totalPages)
  const pageBooks = sortedBooks.slice((currentPageClamped - 1) * pageSize, currentPageClamped * pageSize)
  const pageIds = pageBooks.map(b => b.id)
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id))

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, titleFilter, authorFilter, genreFilter, dateFrom, dateTo, isbnFilter, pageSize])

  useEffect(() => {
    if (editingId === null) return

    function handleClickOutside(e: MouseEvent) {
      if (editingRowRef.current && !editingRowRef.current.contains(e.target as Node)) {
        cancelEdit()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [editingId])

  return (
    <div>
      <input
        className="search-box"
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        placeholder="Search title, author, ISBN, genre, notes..."
      />

      <div className="filter-bar">
        <label>
          Title
          <input
            value={titleFilter}
            onChange={e => setTitleFilter(e.target.value)}
            placeholder="Filter by title"
          />
        </label>
        <label>
          Author
          <input
            value={authorFilter}
            onChange={e => setAuthorFilter(e.target.value)}
            placeholder="Filter by author"
          />
        </label>
        <label>
          Genre
          <select value={genreFilter} onChange={e => setGenreFilter(e.target.value)}>
            <option value="">All</option>
            {genres.map(genre => (
              <option key={genre} value={genre}>{genre}</option>
            ))}
          </select>
        </label>
        <label>
          Added from
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </label>
        <label>
          Added to
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </label>
        <button onClick={clearFilters}>Clear Filters</button>
        <button onClick={exportCSV}>Export CSV</button>
      </div>

      {isbnFilter && (
        <div className="filter-banner">
          Showing copies of "{isbnFilter.title}" by {isbnFilter.author}
          <button onClick={() => setIsbnFilter(null)}>Clear</button>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="bulk-toolbar">
          <span>{selectedIds.size} selected</span>
          <button onClick={() => setConfirmAction({ type: 'sell', ids: Array.from(selectedIds) })}>
            Sell Selected
          </button>
          <button onClick={() => setConfirmAction({ type: 'delete', ids: Array.from(selectedIds) })}>
            Delete Selected
          </button>
        </div>
      )}

      <div className="table-wrapper">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={() => toggleSelectAll(pageIds)}
                  aria-label="Select all"
                />
              </th>
              <th className="sortable" onClick={() => handleSort('title')}>Title{sortIndicator('title')}</th>
              <th className="sortable" onClick={() => handleSort('author')}>Author{sortIndicator('author')}</th>
              <th className="sortable" onClick={() => handleSort('genre')}>Genre{sortIndicator('genre')}</th>
              <th className="sortable" onClick={() => handleSort('isbn')}>ISBN{sortIndicator('isbn')}</th>
              <th className="sortable" onClick={() => handleSort('asking_price')}>Price{sortIndicator('asking_price')}</th>
              <th className="sortable" onClick={() => handleSort('status')}>Status{sortIndicator('status')}</th>
              <th className="sortable" onClick={() => handleSort('date_added')}>Date Added{sortIndicator('date_added')}</th>
              <th className="sortable" onClick={() => handleSort('date_sold')}>Date Sold{sortIndicator('date_sold')}</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageBooks.map(book => (
              <tr
                key={book.id}
                ref={editingId === book.id ? editingRowRef : null}
                className={selectedIds.has(book.id) ? 'selected-row' : ''}
              >
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(book.id)}
                    onChange={() => toggleSelect(book.id)}
                    aria-label={`Select ${book.title}`}
                  />
                </td>
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
                    <td>{book.isbn}</td>
                    <td>
                      <input
                        value={editValues.asking_price}
                        onChange={e => setEditValues({ ...editValues, asking_price: e.target.value })}
                      />
                    </td>
                    <td>{book.status}</td>
                    <td>{formatDate(book.date_added)}</td>
                    <td>{formatDate(book.date_sold)}</td>
                    <td>
                      <input
                        value={editValues.notes}
                        onChange={e => setEditValues({ ...editValues, notes: e.target.value })}
                      />
                    </td>
                    <td>
                      <button onClick={() => saveEdit(book.id)}>Save</button>
                      <button onClick={cancelEdit}>Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td
                      className="title-cell"
                      onClick={() => setIsbnFilter({ isbn: book.isbn, title: book.title, author: book.author })}
                    >
                      {book.title}
                    </td>
                    <td>{book.author}</td>
                    <td>{book.genre}</td>
                    <td>{book.isbn}</td>
                    <td>{book.asking_price}</td>
                    <td>{book.status}</td>
                    <td>{formatDate(book.date_added)}</td>
                    <td>{formatDate(book.date_sold)}</td>
                    <td className="notes-cell" title={book.notes ?? ''}>{book.notes || '—'}</td>
                    <td>
                      <button onClick={() => startEdit(book)}>Edit</button>
                      {book.status === 'sold' && (
                        <button onClick={() => setConfirmAction({ type: 'return', ids: [book.id] })}>
                          Return to Stock
                        </button>
                      )}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPageClamped <= 1}>
          Prev
        </button>
        <span>Page {currentPageClamped} of {totalPages}</span>
        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPageClamped >= totalPages}>
          Next
        </button>
        <label>
          Rows per page
          <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>
      </div>

      {confirmAction && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ background: 'white', color: 'black', padding: '1.5rem', borderRadius: '8px' }}>
            <p>
              Are you sure you want to {confirmAction.type === 'sell'
                ? `mark ${confirmAction.ids.length} book${confirmAction.ids.length > 1 ? 's' : ''} as sold`
                : confirmAction.type === 'delete'
                ? `delete ${confirmAction.ids.length} book${confirmAction.ids.length > 1 ? 's' : ''}`
                : `return ${confirmAction.ids.length} book${confirmAction.ids.length > 1 ? 's' : ''} to stock`
              }?
            </p>
            <button onClick={handleConfirm}>Yes</button>
            <button onClick={() => setConfirmAction(null)}>No</button>
          </div>
        </div>
      )}
    </div>
  )
}
