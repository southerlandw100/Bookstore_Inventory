import { useState } from 'react'
import type { Book } from '../types'

type Props = { books: Book[] }
type Period = '7d' | '30d' | '12m' | 'all'

function formatCurrency(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function daysInStock(dateAdded: string) {
  return Math.floor((Date.now() - new Date(dateAdded).getTime()) / 86400000)
}

function calcAvgDays(items: Book[]): number | null {
  const withDates = items.filter(b => b.date_sold)
  if (!withDates.length) return null
  const total = withDates.reduce((sum, b) => {
    return sum + Math.floor((new Date(b.date_sold!).getTime() - new Date(b.date_added).getTime()) / 86400000)
  }, 0)
  return Math.round(total / withDates.length)
}

const PERIODS: { key: Period; label: string }[] = [
  { key: '7d',  label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '12m', label: 'Last 12 months' },
  { key: 'all', label: 'All time' },
]

export default function ReportsView({ books }: Props) {
  const [period, setPeriod] = useState<Period>('30d')
  const [threshold, setThreshold] = useState(90)

  // Base splits
  const inStock = books.filter(b => b.status === 'in_stock')
  const sold    = books.filter(b => b.status === 'sold')

  // All-time KPIs
  const stockValue   = inStock.reduce((s, b) => s + parseFloat(b.asking_price), 0)
  const totalRevenue = sold.reduce((s, b) => s + parseFloat(b.asking_price), 0)
  const allTimeAvg   = calcAvgDays(sold)

  // Period-filtered sales
  const periodStart: Date | null =
    period === '7d'  ? new Date(Date.now() - 7  * 86400000) :
    period === '30d' ? new Date(Date.now() - 30 * 86400000) :
    period === '12m' ? new Date(new Date().setFullYear(new Date().getFullYear() - 1)) :
    null

  const soldInPeriod    = sold.filter(b => !periodStart || (b.date_sold && new Date(b.date_sold) >= periodStart))
  const periodRevenue   = soldInPeriod.reduce((s, b) => s + parseFloat(b.asking_price), 0)
  const periodAvgPrice  = soldInPeriod.length ? periodRevenue / soldInPeriod.length : 0
  const periodAvgDays   = calcAvgDays(soldInPeriod)

  // Genre breakdown
  const genres = Array.from(new Set(books.map(b => b.genre))).sort()
  const genreRows = genres.map(genre => {
    const gi = inStock.filter(b => b.genre === genre)
    const gs = sold.filter(b => b.genre === genre)
    return {
      genre,
      inStockCount:    gi.length,
      stockValue:      gi.reduce((s, b) => s + parseFloat(b.asking_price), 0),
      soldCount:       gs.length,
      revenue:         gs.reduce((s, b) => s + parseFloat(b.asking_price), 0),
      avgDaysToSell:   calcAvgDays(gs),
    }
  }).sort((a, b) => b.revenue - a.revenue)

  // Aging
  const inStockWithDays = inStock
    .map(b => ({ ...b, days: daysInStock(b.date_added) }))
    .sort((a, b) => b.days - a.days)
  const overThreshold = inStockWithDays.filter(b => b.days >= threshold)
  const stuckValue    = overThreshold.reduce((s, b) => s + parseFloat(b.asking_price), 0)

  return (
    <div className="reports-page">

      {/* ── All-time KPIs ── */}
      <section className="report-section">
        <div className="kpi-row">
          <div className="kpi-card">
            <div className="kpi-value">{inStock.length}</div>
            <div className="kpi-label">Books in Stock</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-value">{formatCurrency(stockValue)}</div>
            <div className="kpi-label">Inventory Value</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-value">{sold.length}</div>
            <div className="kpi-label">Total Sold</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-value">{formatCurrency(totalRevenue)}</div>
            <div className="kpi-label">Total Revenue</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-value">{allTimeAvg !== null ? `${allTimeAvg}d` : '—'}</div>
            <div className="kpi-label">Avg Days to Sell</div>
          </div>
        </div>
      </section>

      {/* ── Sales Performance ── */}
      <section className="report-section">
        <div className="report-section-header">
          <h2>Sales Performance</h2>
          <div className="period-selector">
            {PERIODS.map(p => (
              <button
                key={p.key}
                className={period === p.key ? 'active' : ''}
                onClick={() => setPeriod(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="kpi-row">
          <div className="kpi-card">
            <div className="kpi-value">{soldInPeriod.length}</div>
            <div className="kpi-label">Books Sold</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-value">{formatCurrency(periodRevenue)}</div>
            <div className="kpi-label">Revenue</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-value">{soldInPeriod.length ? formatCurrency(periodAvgPrice) : '—'}</div>
            <div className="kpi-label">Avg Sale Price</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-value">{periodAvgDays !== null ? `${periodAvgDays}d` : '—'}</div>
            <div className="kpi-label">Avg Days to Sell</div>
          </div>
        </div>
      </section>

      {/* ── Genre Breakdown ── */}
      <section className="report-section">
        <h2>By Genre</h2>
        <div className="table-wrapper">
          <table className="inventory-table report-table">
            <thead>
              <tr>
                <th>Genre</th>
                <th>In Stock</th>
                <th>Stock Value</th>
                <th>Sold</th>
                <th>Revenue</th>
                <th>Avg Days to Sell</th>
              </tr>
            </thead>
            <tbody>
              {genreRows.map(row => (
                <tr key={row.genre}>
                  <td><span className="cell-text">{row.genre}</span></td>
                  <td><span className="cell-text">{row.inStockCount}</span></td>
                  <td><span className="cell-text">{formatCurrency(row.stockValue)}</span></td>
                  <td><span className="cell-text">{row.soldCount}</span></td>
                  <td><span className="cell-text">{formatCurrency(row.revenue)}</span></td>
                  <td><span className="cell-text">{row.avgDaysToSell !== null ? `${row.avgDaysToSell}d` : '—'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Aging Report ── */}
      <section className="report-section">
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
          <div className="aging-summary-stats">
            <span><strong>{overThreshold.length}</strong> of {inStockWithDays.length} books {threshold}+ days</span>
            <span>Stuck value: <strong>{formatCurrency(stuckValue)}</strong></span>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="inventory-table report-table">
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
              {inStockWithDays.map(book => (
                <tr key={book.id} className={book.days >= threshold ? 'stale-row' : ''}>
                  <td><span className="cell-text">{book.title}</span></td>
                  <td><span className="cell-text">{book.author}</span></td>
                  <td><span className="cell-text">{book.genre}</span></td>
                  <td><span className="cell-text">{book.isbn}</span></td>
                  <td><span className="cell-text">{formatCurrency(parseFloat(book.asking_price))}</span></td>
                  <td><span className="cell-text">{new Date(book.date_added).toLocaleDateString()}</span></td>
                  <td><span className="cell-text">{book.days}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  )
}
