import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';

export default function TimelineChart({ data = [] }) {
  const chartData = useMemo(() => {
    const labels = data.map((d) => {
      const date = new Date(d.timestamp);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    });

    const values = data.map((d) => d.confidence);

    return {
      labels,
      datasets: [
        {
          label: 'Confidence',
          data: values,
          borderColor: '#24e498',
          backgroundColor: (ctx) => {
            const chart = ctx.chart;
            const { ctx: canvasCtx, chartArea } = chart;
            if (!chartArea) return 'rgba(36, 228, 152, 0.1)';
            const gradient = canvasCtx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, 'rgba(36, 228, 152, 0.25)');
            gradient.addColorStop(1, 'rgba(36, 228, 152, 0.0)');
            return gradient;
          },
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#24e498',
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
          borderWidth: 2,
        },
      ],
    };
  }, [data]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      tooltip: {
        backgroundColor: '#111',
        titleColor: '#fff',
        bodyColor: '#24e498',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        callbacks: {
          label: (ctx) => `Confidence: ${ctx.parsed.y}%`,
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: { color: 'rgba(255,255,255,0.03)' },
        ticks: { color: 'rgba(255,255,255,0.25)', maxTicksLimit: 8, font: { size: 10 } },
      },
      y: {
        display: true,
        min: 0,
        max: 100,
        grid: { color: 'rgba(255,255,255,0.03)' },
        ticks: { color: 'rgba(255,255,255,0.25)', stepSize: 25, font: { size: 10 } },
      },
    },
  };

  return (
    <div className="chart-wrapper">
      <Line data={chartData} options={options} />
    </div>
  );
}
