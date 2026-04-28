export default function LinkHistory({ links = [] }) {
  if (links.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🔗</div>
        <p>No links scanned yet</p>
      </div>
    );
  }

  const sorted = [...links].sort((a, b) => b.timestamp - a.timestamp);

  function getClass(action) {
    if (action === 'BLOCK_WARN' || action === 'BLOCK_LOCK') return 'blocked';
    if (action === 'CAUTION') return 'caution';
    return 'safe';
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }

  function truncateUrl(url, max = 40) {
    try {
      const u = new URL(url);
      const display = u.hostname + u.pathname;
      return display.length > max ? display.slice(0, max) + '…' : display;
    } catch {
      return url.length > max ? url.slice(0, max) + '…' : url;
    }
  }

  return (
    <div className="link-list">
      {sorted.map((link, i) => {
        const cls = getClass(link.action);
        return (
          <div className="link-item" key={i}>
            <span className={`link-action-dot ${cls}`} />
            <span className="link-url" title={link.url}>
              {truncateUrl(link.url)}
            </span>
            <span className={`link-score ${cls}`}>
              {link.riskScore}
            </span>
            <span className="link-time">{formatTime(link.timestamp)}</span>
          </div>
        );
      })}
    </div>
  );
}
