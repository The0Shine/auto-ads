import { Progress, Tooltip } from 'antd';

/**
 * AI performance score badge (0-100).
 * 0-40 = red, 40-70 = yellow, 70-100 = green.
 */
export default function ScoreBadge({ score, size = 48, showLabel = true }) {
  if (score == null) return <span style={{ color: '#94A3B8', fontSize: 12 }}>N/A</span>;

  const s = Number(score);
  const color = s >= 70 ? '#00CEC9' : s >= 40 ? '#FDCB6E' : '#E17055';
  const label = s >= 70 ? 'Tot' : s >= 40 ? 'TB' : 'Yeu';

  return (
    <Tooltip title={`Performance Score: ${s}/100 (${label})`}>
      <Progress
        type="circle"
        percent={s}
        size={size}
        strokeColor={color}
        trailColor="rgba(255,255,255,0.08)"
        format={() => <span style={{ color, fontSize: size * 0.28, fontWeight: 600 }}>{s}</span>}
      />
    </Tooltip>
  );
}
