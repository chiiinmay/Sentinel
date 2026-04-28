import { useState, useEffect, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js';
import ConfidenceGauge from './components/ConfidenceGauge';
import TimelineChart from './components/TimelineChart';
import LinkHistory from './components/LinkHistory';
import ThreatLog from './components/ThreatLog';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

// Demo data generator for when the extension isn't connected
function generateDemoData() {
  const now = Date.now();
  const events = [];
  const sampleUrls = [
    { url: 'https://google.com/search?q=hello', risk: 0, action: 'ALLOW' },
    { url: 'https://github.com/raksha-ai', risk: 0, action: 'ALLOW' },
    { url: 'http://login-secure-bank.tk/verify', risk: 85, action: 'BLOCK_WARN' },
    { url: 'https://stackoverflow.com/questions', risk: 0, action: 'ALLOW' },
    { url: 'http://192.168.1.1/admin/login', risk: 45, action: 'CAUTION' },
    { url: 'https://docs.python.org/3/', risk: 0, action: 'ALLOW' },
    { url: 'http://xn--googl-fsa.com/signin', risk: 90, action: 'BLOCK_WARN' },
    { url: 'https://youtube.com/watch?v=abc', risk: 0, action: 'ALLOW' },
  ];

  for (let i = 0; i < 20; i++) {
    const sample = sampleUrls[i % sampleUrls.length];
    events.push({
      type: 'link_check',
      url: sample.url,
      riskScore: sample.risk,
      action: sample.action,
      typingConfidence: 85 + Math.floor(Math.random() * 15),
      reasons: sample.risk > 50 ? ['Suspicious TLD', 'Phishing keyword'] : [],
      timestamp: now - (20 - i) * 30000,
    });
  }

  // Confidence timeline
  const timeline = [];
  for (let i = 0; i < 30; i++) {
    timeline.push({
      confidence: Math.min(100, Math.max(50, 92 + Math.floor(Math.random() * 10) - 5 - (i > 20 ? (i - 20) * 3 : 0))),
      timestamp: now - (30 - i) * 10000,
    });
  }

  return { events, timeline, confidence: 94 };
}

export default function App() {
  const [data, setData] = useState(() => generateDemoData());
  const [isLive, setIsLive] = useState(false);

  // Try to connect to extension via chrome.storage polling
  const pollExtension = useCallback(async () => {
    try {
      // In a real setup, the dashboard would read from Firebase
      // For demo, we use the generated data and simulate updates
      setData((prev) => {
        const newConf = Math.min(100, Math.max(40, prev.confidence + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 3)));
        const newTimeline = [
          ...prev.timeline.slice(-29),
          { confidence: newConf, timestamp: Date.now() },
        ];
        return { ...prev, confidence: newConf, timeline: newTimeline };
      });
    } catch {
      // not connected
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(pollExtension, 3000);
    return () => clearInterval(interval);
  }, [pollExtension]);

  const linkEvents = data.events.filter((e) => e.type === 'link_check');
  const threats = data.events.filter(
    (e) => e.action === 'BLOCK_WARN' || e.action === 'BLOCK_LOCK'
  );

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <span className="logo-icon">🛡️</span>
          <span className="logo-text">Raksha AI</span>
        </div>
        <div className="header-status">
          <span className="status-dot"></span>
          <span>{isLive ? 'Live — Extension Connected' : 'Demo Mode'}</span>
        </div>
      </header>

      <main className="dashboard">
        <ConfidenceGauge
          score={data.confidence}
          linksScanned={linkEvents.length}
          threatsBlocked={threats.length}
        />

        <div className="card chart-card">
          <div className="card-title">Confidence Timeline</div>
          <TimelineChart data={data.timeline} />
        </div>

        <div className="card">
          <div className="card-title">Recent Links Scanned</div>
          <LinkHistory links={linkEvents} />
        </div>

        <div className="card">
          <div className="card-title">Threat Log</div>
          <ThreatLog threats={threats} />
        </div>
      </main>
    </div>
  );
}
