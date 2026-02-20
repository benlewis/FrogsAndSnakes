export default function CalendarModal({ currentDate, onSelectDate, onClose, isAdmin }) {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  // Build list of dates: future (admin only) + today + past 14 days
  const dates = []

  if (isAdmin) {
    for (let i = 7; i >= 1; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() + i)
      dates.push(formatEntry(d, todayStr))
    }
  }

  // Today + 14 past days
  for (let i = 0; i <= 14; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    dates.push(formatEntry(d, todayStr))
  }

  function formatEntry(date, todayString) {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const label = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    return { dateStr, label, isToday: dateStr === todayString }
  }

  return (
    <div className="calendar-overlay" onClick={onClose}>
      <div className="calendar-modal" onClick={(e) => e.stopPropagation()}>
        <button className="calendar-close-btn" onClick={onClose}>&times;</button>
        <h2 className="calendar-title">Select a Day</h2>
        <div className="calendar-date-list">
          {dates.map(({ dateStr, label, isToday }) => (
            <button
              key={dateStr}
              className={`calendar-date-btn${dateStr === currentDate ? ' active' : ''}${isToday ? ' today' : ''}`}
              onClick={() => { onSelectDate(dateStr); onClose() }}
            >
              <span>{label}</span>
              {isToday && <span className="calendar-today-badge">(Today)</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
