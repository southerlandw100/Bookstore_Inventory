import { useState, useEffect, useRef } from 'react'
import type { Book } from '../types'

type SortColumn = 'title' | 'author' | 'genre' | 'isbn' | 'asking_price' | 'status' | 'date_added' | 'date_sold'
type SortDirection = 'asc' | 'desc'
type ColKey = 'title' | 'author' | 'genre' | 'isbn' | 'price' | 'status' | 'date_added' | 'date_sold' | 'notes' | 'actions'

const DEFAULT_COL_WIDTHS: Record<ColKey, number> = {
  title: 200, author: 160, genre: 110, isbn: 130, price: 80,
  status: 84, date_added: 105, date_sold: 105, notes: 220, actions: 72,
}

const HIDEABLE_COLS: { key: ColKey; label: string }[] = [
  { key: 'title',      label: 'Title'      },
  { key: 'author',     label: 'Author'     },
  { key: 'genre',      label: 'Genre'      },
  { key: 'isbn',       label: 'ISBN'       },
  { key: 'price',      label: 'Price'      },
  { key: 'status',     label: 'Status'     },
  { key: 'date_added', label: 'Date Added' },
  { key: 'date_sold',  label: 'Date Sold'  },
  { key: 'notes',      label: 'Notes'      },
  { key: 'actions',    label: 'Actions'    },
]

type Props = {
  books: Book[]
  setBooks: React.Dispatch<React.SetStateAction<Book[]>>
}

type PendingConfirm = {
  id: number
  field: string
  label: string
  oldDisplay: string
  newDisplay: string
  newRaw: string
}

const CONFIRM_FIELDS = new Set(['isbn', 'asking_price', 'date_added'])

const FIELD_LABELS: Record<string, string> = {
  isbn: 'ISBN',
  asking_price: 'Price',
  date_added: 'Date Added',
}

function formatDate(dateStr: string | null) {
  return dateStr ? new Date(dateStr).toLocaleDateString() : '—'
}

function formatDateLocal(ymd: string) {
  return new Date(ymd + 'T12:00:00').toLocaleDateString()
}

function escapeCsvField(field: string) {
  if (/[",\n]/.test(field)) return `"${field.replace(/"/g, '""')}"`
  return field
}

export default function InventoryView({ books, setBooks }: Props) {
  const [editingCell, setEditingCell] = useState<{ id: number; field: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ type: 'sell' | 'delete' | 'return'; ids: number[] } | null>(null)

  const [sortColumn, setSortColumn] = useState<SortColumn>('title')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  const [searchQuery, setSearchQuery] = useState('')
  const [titleFilter, setTitleFilter] = useState('')
  const [authorFilter, setAuthorFilter] = useState('')
  const [genreFilter, setGenreFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_stock' | 'sold'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [isbnFilter, setIsbnFilter] = useState<{ isbn: string; title: string; author: string } | null>(null)

  const [pageSize, setPageSize] = useState(25)
  const [currentPage, setCurrentPage] = useState(1)

  const [colWidths, setColWidths] = useState<Partial<Record<ColKey, number>>>({})
  const [hiddenCols, setHiddenCols] = useState<Set<ColKey>>(new Set())
  const [showColMenu, setShowColMenu] = useState(false)
  const colMenuRef = useRef<HTMLDivElement>(null)

  function show(col: ColKey) { return !hiddenCols.has(col) }

  function toggleCol(col: ColKey) {
    setHiddenCols(prev => {
      const next = new Set(prev)
      if (next.has(col)) next.delete(col)
      else next.add(col)
      return next
    })
  }

  function cw(col: ColKey) {
    return (colWidths[col] ?? DEFAULT_COL_WIDTHS[col]) + 'px'
  }

  function resizeHandle(col: ColKey) {
    return (
      <div
        className="resize-handle"
        onClick={e => e.stopPropagation()}
        onMouseDown={e => {
          e.preventDefault()
          const startX = e.clientX
          const startWidth = colWidths[col] ?? DEFAULT_COL_WIDTHS[col]
          const onMove = (e: MouseEvent) => {
            setColWidths(prev => ({ ...prev, [col]: Math.max(40, startWidth + e.clientX - startX) }))
          }
          const onUp = () => {
            document.removeEventListener('mousemove', onMove)
            document.removeEventListener('mouseup', onUp)
          }
          document.addEventListener('mousemove', onMove)
          document.addEventListener('mouseup', onUp)
        }}
      />
    )
  }

  function getEditStartValue(book: Book, field: string): string {
    if (field === 'date_added') return book.date_added.split('T')[0]
    return String(book[field as keyof Book] ?? '')
  }

  function getDisplayValue(book: Book, field: string): string {
    if (field === 'asking_price') return `$${book.asking_price}`
    if (field === 'date_added') return formatDate(book.date_added)
    return String(book[field as keyof Book] ?? '')
  }

  function startCellEdit(book: Book, field: string) {
    if (pendingConfirm) return
    setEditingCell({ id: book.id, field })
    setEditValue(getEditStartValue(book, field))
  }

  function commitEdit(book: Book) {
    if (!editingCell) return
    const { field } = editingCell
    const originalValue = getEditStartValue(book, field)

    // Empty string means the browser rejected invalid typed input (number/date field)
    // or the user cleared a required field — silently revert without saving.
    if (editValue.trim() === '' && field !== 'notes') {
      setEditingCell(null)
      return
    }

    if (editValue.trim() === originalValue.trim()) {
      setEditingCell(null)
      return
    }

    setEditingCell(null)

    if (CONFIRM_FIELDS.has(field)) {
      const oldDisplay = getDisplayValue(book, field)
      const newDisplay =
        field === 'asking_price' ? `$${editValue}` :
        field === 'date_added' ? formatDateLocal(editValue) :
        editValue
      setPendingConfirm({ id: book.id, field, label: FIELD_LABELS[field], oldDisplay, newDisplay, newRaw: editValue })
    } else {
      saveField(book, field, editValue)
    }
  }

  async function saveField(book: Book, field: string, rawValue: string) {
    let valueToSend: string = rawValue
    if (field === 'date_added') {
      valueToSend = new Date(rawValue + 'T12:00:00').toISOString()
    }

    try {
      const response = await fetch(`http://localhost:3000/books/${book.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: valueToSend }),
      })
      if (!response.ok) {
        console.error('Failed to save:', response.status)
        return
      }
      const updatedBook = await response.json()
      setBooks(prev => prev.map(b => b.id === book.id ? updatedBook : b))
    } catch (err) {
      console.error('Network error saving field:', err)
    }
  }

  function handleFieldConfirm() {
    if (!pendingConfirm) return
    const book = books.find(b => b.id === pendingConfirm.id)
    if (!book) { setPendingConfirm(null); return }
    saveField(book, pendingConfirm.field, pendingConfirm.newRaw)
    setPendingConfirm(null)
  }

  async function sellBooks(ids: number[]) {
    for (const id of ids) {
      try {
        const response = await fetch(`http://localhost:3000/books/${id}/sell`, { method: 'POST' })
        if (!response.ok) { console.error('Failed to sell book:', response.status); continue }
        const soldBook = await response.json()
        setBooks(prev => prev.map(b => b.id === id ? soldBook : b))
      } catch (err) {
        console.error('Network error selling book:', err)
      }
    }
    setSelectedIds(new Set())
  }

  async function deleteBooks(ids: number[]) {
    for (const id of ids) {
      try {
        const response = await fetch(`http://localhost:3000/books/${id}`, { method: 'DELETE' })
        if (!response.ok) { console.error('Failed to delete book:', response.status); continue }
        setBooks(prev => prev.filter(b => b.id !== id))
      } catch (err) {
        console.error('Network error deleting book:', err)
      }
    }
    setSelectedIds(new Set())
  }

  async function returnBooks(ids: number[]) {
    for (const id of ids) {
      try {
        const response = await fetch(`http://localhost:3000/books/${id}/return`, { method: 'POST' })
        if (!response.ok) { console.error('Failed to return book:', response.status); continue }
        const returnedBook = await response.json()
        setBooks(prev => prev.map(b => b.id === id ? returnedBook : b))
      } catch (err) {
        console.error('Network error returning book:', err)
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
    if (sortColumn === column) setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortColumn(column); setSortDirection('asc') }
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
      if (allSelected) pageIds.forEach(id => next.delete(id))
      else pageIds.forEach(id => next.add(id))
      return next
    })
  }

  function clearFilters() {
    setTitleFilter('')
    setAuthorFilter('')
    setGenreFilter('')
    setStatusFilter('all')
    setDateFrom('')
    setDateTo('')
  }

  function exportCSV() {
    const headers = ['ISBN', 'Title', 'Author', 'Genre', 'Price', 'Status', 'Date Added', 'Date Sold', 'Notes']
    const rows = sortedBooks.map(b => [
      b.isbn, b.title, b.author, b.genre, b.asking_price, b.status,
      formatDate(b.date_added), formatDate(b.date_sold), b.notes ?? ''
    ])
    const csv = [headers, ...rows].map(row => row.map(escapeCsvField).join(',')).join('\n')
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
  if (isbnFilter) visibleBooks = visibleBooks.filter(b => b.isbn === isbnFilter.isbn)
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
  if (titleFilter) visibleBooks = visibleBooks.filter(b => b.title.toLowerCase().includes(titleFilter.toLowerCase()))
  if (authorFilter) visibleBooks = visibleBooks.filter(b => b.author.toLowerCase().includes(authorFilter.toLowerCase()))
  if (genreFilter) visibleBooks = visibleBooks.filter(b => b.genre === genreFilter)
  if (statusFilter !== 'all') visibleBooks = visibleBooks.filter(b => b.status === statusFilter)
  if (dateFrom) visibleBooks = visibleBooks.filter(b => b.date_added >= dateFrom)
  if (dateTo) visibleBooks = visibleBooks.filter(b => b.date_added <= dateTo + 'T23:59:59.999Z')

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
  }, [searchQuery, titleFilter, authorFilter, genreFilter, statusFilter, dateFrom, dateTo, isbnFilter, pageSize])

  useEffect(() => {
    if (!showColMenu) return
    function onDown(e: MouseEvent) {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) {
        setShowColMenu(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [showColMenu])

  function cellInput(book: Book, type: string = 'text') {
    return (
      <input
        type={type}
        autoFocus
        value={editValue}
        min={type === 'number' ? '0' : undefined}
        step={type === 'number' ? '0.01' : undefined}
        onChange={e => setEditValue(e.target.value)}
        onBlur={() => commitEdit(book)}
        onKeyDown={e => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') setEditingCell(null)
        }}
      />
    )
  }

  function renderCell(book: Book, field: string, display: React.ReactNode, inputType: string = 'text') {
    const isEditing = editingCell?.id === book.id && editingCell?.field === field
    return (
      <td
        className={`editable-cell${isEditing ? ' editing' : ''}`}
        onClick={() => !isEditing && startCellEdit(book, field)}
      >
        {isEditing
          ? cellInput(book, inputType)
          : <span className="cell-text">{display}</span>
        }
      </td>
    )
  }

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
          <input value={titleFilter} onChange={e => setTitleFilter(e.target.value)} placeholder="Filter..." />
        </label>
        <label>
          Author
          <input value={authorFilter} onChange={e => setAuthorFilter(e.target.value)} placeholder="Filter..." />
        </label>
        <label>
          Genre
          <select value={genreFilter} onChange={e => setGenreFilter(e.target.value)}>
            <option value="">All</option>
            {genres.map(genre => <option key={genre} value={genre}>{genre}</option>)}
          </select>
        </label>
        <label>
          Status
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'all' | 'in_stock' | 'sold')}>
            <option value="all">All</option>
            <option value="in_stock">In Stock</option>
            <option value="sold">Sold</option>
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
        <div className="col-menu-wrapper" ref={colMenuRef}>
          <button onClick={() => setShowColMenu(p => !p)}>Columns ▾</button>
          {showColMenu && (
            <div className="col-menu-dropdown">
              {HIDEABLE_COLS.map(col => (
                <label key={col.key} className="col-menu-item">
                  <input
                    type="checkbox"
                    checked={show(col.key)}
                    onChange={() => toggleCol(col.key)}
                  />
                  {col.label}
                </label>
              ))}
            </div>
          )}
        </div>
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
          <colgroup>
            <col style={{ width: '34px' }} />
            {show('title')      && <col style={{ width: cw('title') }} />}
            {show('author')     && <col style={{ width: cw('author') }} />}
            {show('genre')      && <col style={{ width: cw('genre') }} />}
            {show('isbn')       && <col style={{ width: cw('isbn') }} />}
            {show('price')      && <col style={{ width: cw('price') }} />}
            {show('status')     && <col style={{ width: cw('status') }} />}
            {show('date_added') && <col style={{ width: cw('date_added') }} />}
            {show('date_sold')  && <col style={{ width: cw('date_sold') }} />}
            {show('notes')      && <col style={{ width: cw('notes') }} />}
            {show('actions')    && <col style={{ width: cw('actions') }} />}
          </colgroup>
          <thead>
            <tr>
              <th className="check-cell">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={() => toggleSelectAll(pageIds)}
                  aria-label="Select all"
                />
              </th>
              {show('title')      && <th className="sortable" onClick={() => handleSort('title')}>Title{sortIndicator('title')}{resizeHandle('title')}</th>}
              {show('author')     && <th className="sortable" onClick={() => handleSort('author')}>Author{sortIndicator('author')}{resizeHandle('author')}</th>}
              {show('genre')      && <th className="sortable" onClick={() => handleSort('genre')}>Genre{sortIndicator('genre')}{resizeHandle('genre')}</th>}
              {show('isbn')       && <th className="sortable" onClick={() => handleSort('isbn')}>ISBN{sortIndicator('isbn')}{resizeHandle('isbn')}</th>}
              {show('price')      && <th className="sortable" onClick={() => handleSort('asking_price')}>Price{sortIndicator('asking_price')}{resizeHandle('price')}</th>}
              {show('status')     && <th className="sortable" onClick={() => handleSort('status')}>Status{sortIndicator('status')}{resizeHandle('status')}</th>}
              {show('date_added') && <th className="sortable" onClick={() => handleSort('date_added')}>Date Added{sortIndicator('date_added')}{resizeHandle('date_added')}</th>}
              {show('date_sold')  && <th className="sortable" onClick={() => handleSort('date_sold')}>Date Sold{sortIndicator('date_sold')}{resizeHandle('date_sold')}</th>}
              {show('notes')      && <th>Notes{resizeHandle('notes')}</th>}
              {show('actions')    && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {pageBooks.map(book => {
              const isbnEditing = editingCell?.id === book.id && editingCell?.field === 'isbn'
              return (
                <tr
                  key={book.id}
                  className={selectedIds.has(book.id) ? 'selected-row' : ''}
                >
                  <td className="check-cell">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(book.id)}
                      onChange={() => toggleSelect(book.id)}
                      aria-label={`Select ${book.title}`}
                    />
                  </td>

                  {show('title')  && renderCell(book, 'title', book.title)}
                  {show('author') && renderCell(book, 'author', book.author)}
                  {show('genre')  && renderCell(book, 'genre', book.genre)}

                  {/* ISBN — editable + filter icon */}
                  {show('isbn') && (
                    <td
                      className={`editable-cell${isbnEditing ? ' editing' : ''}`}
                      onClick={() => !isbnEditing && startCellEdit(book, 'isbn')}
                    >
                      {isbnEditing
                        ? cellInput(book)
                        : (
                          <span className="isbn-cell">
                            <span>{book.isbn}</span>
                            <button
                              className="filter-icon-btn"
                              onClick={e => {
                                e.stopPropagation()
                                setIsbnFilter({ isbn: book.isbn, title: book.title, author: book.author })
                              }}
                              title="Filter by this ISBN"
                            >▼</button>
                          </span>
                        )
                      }
                    </td>
                  )}

                  {show('price') && renderCell(book, 'asking_price', `$${book.asking_price}`, 'number')}

                  {/* Status — display only */}
                  {show('status') && (
                    <td>
                      <span className="cell-text">
                        <span className={`status-badge ${book.status === 'in_stock' ? 'in-stock' : 'sold'}`}>
                          {book.status === 'in_stock' ? 'In Stock' : 'Sold'}
                        </span>
                      </span>
                    </td>
                  )}

                  {show('date_added') && renderCell(book, 'date_added', formatDate(book.date_added), 'date')}

                  {/* Date Sold — display only */}
                  {show('date_sold') && <td><span className="cell-text">{formatDate(book.date_sold)}</span></td>}

                  {show('notes') && renderCell(book, 'notes', book.notes || '—')}

                  {/* Actions */}
                  {show('actions') && (
                    <td className="actions-cell">
                      {book.status === 'sold' && (
                        <button
                          className="action-btn"
                          onClick={() => setConfirmAction({ type: 'return', ids: [book.id] })}
                        >
                          Return
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
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

      {/* Field-level confirm (price / isbn / date_added) */}
      {pendingConfirm && (
        <div className="field-confirm-backdrop" onClick={() => setPendingConfirm(null)}>
          <div className="field-confirm-card" onClick={e => e.stopPropagation()}>
            <p className="confirm-title">Confirm change</p>
            <div className="confirm-change">
              <span className="label">{pendingConfirm.label}</span>
              <span className="old-val">{pendingConfirm.oldDisplay}</span>
              <span className="arrow">→</span>
              <span className="new-val">{pendingConfirm.newDisplay}</span>
            </div>
            <div className="confirm-btns">
              <button className="btn-save" onClick={handleFieldConfirm}>Save</button>
              <button className="btn-cancel" onClick={() => setPendingConfirm(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Sell / delete / return confirm */}
      {confirmAction && (
        <div className="confirm-modal-backdrop">
          <div className="confirm-modal-card">
            <p>
              {confirmAction.type === 'sell'
                ? `Mark ${confirmAction.ids.length} book${confirmAction.ids.length > 1 ? 's' : ''} as sold?`
                : confirmAction.type === 'delete'
                ? `Delete ${confirmAction.ids.length} book${confirmAction.ids.length > 1 ? 's' : ''}?`
                : `Return ${confirmAction.ids.length} book${confirmAction.ids.length > 1 ? 's' : ''} to stock?`
              }
            </p>
            <div className="confirm-btns">
              <button className="btn-save" onClick={handleConfirm}>Yes</button>
              <button className="btn-cancel" onClick={() => setConfirmAction(null)}>No</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
