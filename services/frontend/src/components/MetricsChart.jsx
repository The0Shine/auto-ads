import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const COLORS = ['#6C5CE7', '#00CEC9', '#FD79A8', '#FDCB6E', '#55EFC4', '#74B9FF'];

const darkTooltipStyle = {
  backgroundColor: '#1E1E3F',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  color: '#E2E8F0',
};

/**
 * Reusable metrics chart component.
 * @param {Array}  data     - Array of data points, e.g. [{ name: 'Campaign 1', impressions: 1234, clicks: 56 }]
 * @param {Array}  metrics  - Array of metric keys to render, e.g. ['impressions', 'clicks']
 * @param {number} height   - Chart height (default 300)
 * @param {'area'|'bar'} type - Chart type (default 'area')
 * @param {string} xKey     - Key for X axis (default 'name')
 */
export default function MetricsChart({ data = [], metrics = [], height = 300, type = 'area', xKey = 'name' }) {
  if (!data.length || !metrics.length) return null;

  const Chart = type === 'bar' ? BarChart : AreaChart;
  const DataElement = type === 'bar' ? Bar : Area;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <Chart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis dataKey={xKey} tick={{ fill: '#94A3B8', fontSize: 12 }} />
        <YAxis tick={{ fill: '#94A3B8', fontSize: 12 }} />
        <Tooltip contentStyle={darkTooltipStyle} />
        {metrics.map((key, i) => (
          <DataElement
            key={key}
            type="monotone"
            dataKey={key}
            fill={COLORS[i % COLORS.length]}
            stroke={COLORS[i % COLORS.length]}
            fillOpacity={type === 'bar' ? 0.8 : 0.15}
            strokeWidth={type === 'bar' ? 0 : 2}
          />
        ))}
      </Chart>
    </ResponsiveContainer>
  );
}
