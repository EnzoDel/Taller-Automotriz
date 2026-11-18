const formatCompact = (value) => Number(value).toLocaleString('es-EC', {
  notation: 'compact',
  maximumFractionDigits: 1
});

const formatMoney = (value) => Number(value).toLocaleString('es-EC', { style: 'currency', currency: 'USD' });

const CHART_WIDTH = 720;
const CHART_HEIGHT = 280;
const PADDING = { top: 16, right: 12, bottom: 32, left: 52 };

// Gráfico de barras agrupadas. series: [{ name, color, values: number[] }]
export default function BarChart({ labels, series, title }) {
  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const maxValue = Math.max(1, ...series.flatMap((item) => item.values));
  const groupWidth = plotWidth / Math.max(labels.length, 1);
  const barWidth = Math.min(28, (groupWidth * 0.8) / series.length);
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <figure>
      <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-slate-600">
        {series.map((item) => (
          <span key={item.name} className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: item.color }} />
            {item.name}
          </span>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={title}
      >
        {ticks.map((tick) => {
          const y = PADDING.top + plotHeight * (1 - tick);
          return (
            <g key={tick}>
              <line x1={PADDING.left} x2={CHART_WIDTH - PADDING.right} y1={y} y2={y} stroke="#e2e8f0" />
              <text x={PADDING.left - 6} y={y + 4} textAnchor="end" fontSize="11" fill="#64748b">
                {formatCompact(maxValue * tick)}
              </text>
            </g>
          );
        })}
        {labels.map((label, groupIndex) => {
          const groupX = PADDING.left + groupIndex * groupWidth;
          const groupInnerWidth = barWidth * series.length;
          const startX = groupX + (groupWidth - groupInnerWidth) / 2;
          return (
            <g key={label}>
              {series.map((item, seriesIndex) => {
                const value = item.values[groupIndex] ?? 0;
                const height = (value / maxValue) * plotHeight;
                return (
                  <rect
                    key={item.name}
                    x={startX + seriesIndex * barWidth}
                    y={PADDING.top + plotHeight - height}
                    width={barWidth - 2}
                    height={height}
                    rx="2"
                    fill={item.color}
                  >
                    <title>{`${label} · ${item.name}: ${formatMoney(value)}`}</title>
                  </rect>
                );
              })}
              <text
                x={groupX + groupWidth / 2}
                y={CHART_HEIGHT - 10}
                textAnchor="middle"
                fontSize="11"
                fill="#475569"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
