import { useMemo } from 'react';

const CIRCUMFERENCE = 2 * Math.PI * 80; // r=80

export default function ConfidenceGauge({ score = 0, linksScanned = 0, threatsBlocked = 0 }) {
  const { offset, color, statusText, statusClass } = useMemo(() => {
    const pct = score / 100;
    const offset = CIRCUMFERENCE * (1 - pct);
    let color, statusText, statusClass;

    if (score >= 90) {
      color = '#24e498';
      statusText = '✓ Identity Verified';
      statusClass = 'high';
    } else if (score >= 60) {
      color = '#f5a623';
      statusText = '⚠ Slight Anomaly';
      statusClass = 'medium';
    } else {
      color = '#ff3b5c';
      statusText = '✕ Possible Imposter';
      statusClass = 'low';
    }

    return { offset, color, statusText, statusClass };
  }, [score]);

  return (
    <div className="card gauge-card">
      <div className="card-title">Trust Score</div>

      <div className="gauge-container">
        <svg viewBox="0 0 180 180" className="gauge-svg">
          <circle className="gauge-track" cx="90" cy="90" r="80" />
          <circle
            className="gauge-bar"
            cx="90"
            cy="90"
            r="80"
            style={{
              strokeDashoffset: offset,
              stroke: color,
              filter: `drop-shadow(0 0 12px ${color}66)`,
            }}
          />
        </svg>
        <div className="gauge-center">
          <div className="gauge-score" style={{ color }}>{score}</div>
          <div className="gauge-label">Trust</div>
        </div>
      </div>

      <div className={`gauge-status-text ${statusClass}`}>
        {statusText}
      </div>

      <div className="stats-mini">
        <div className="stat-mini">
          <span className="stat-mini-label">Links Scanned</span>
          <span className="stat-mini-value">{linksScanned}</span>
        </div>
        <div className="stat-mini">
          <span className="stat-mini-label">Threats Blocked</span>
          <span className="stat-mini-value" style={{ color: threatsBlocked > 0 ? '#ff3b5c' : undefined }}>
            {threatsBlocked}
          </span>
        </div>
        <div className="stat-mini">
          <span className="stat-mini-label">Session</span>
          <span className="stat-mini-value" style={{ fontSize: 13 }}>Active</span>
        </div>
      </div>
    </div>
  );
}
