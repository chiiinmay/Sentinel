export default function ThreatLog({ threats = [] }) {
  if (threats.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">✅</div>
        <p>No threats detected — all clear!</p>
      </div>
    );
  }

  const sorted = [...threats].sort((a, b) => b.timestamp - a.timestamp);

  function formatTime(ts) {
    return new Date(ts).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }

  function truncateUrl(url, max = 30) {
    try {
      const u = new URL(url);
      const display = u.hostname + u.pathname;
      return display.length > max ? display.slice(0, max) + '…' : display;
    } catch {
      return url.length > max ? url.slice(0, max) + '…' : url;
    }
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="threat-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>URL</th>
            <th>Risk</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((t, i) => (
            <tr key={i}>
              <td style={{ whiteSpace: 'nowrap' }}>{formatTime(t.timestamp)}</td>
              <td title={t.url}>{truncateUrl(t.url)}</td>
              <td style={{ color: '#ff3b5c', fontWeight: 700 }}>{t.riskScore}</td>
              <td>
                <span className={`threat-badge ${t.action === 'BLOCK_LOCK' ? 'block-lock' : 'block-warn'}`}>
                  {t.action === 'BLOCK_LOCK' ? '🔒 Locked' : '⛔ Blocked'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
