interface DataPoint {
  date: string;
  value: number;
}

interface MiniChartProps {
  data: DataPoint[];
  height?: number;
  metric?: string;
}

export default function MiniChart({ data, height = 200, metric }: MiniChartProps) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-gray-400 border border-gray-200 rounded-lg bg-gray-50"
        style={{ height: `${height}px` }}
      >
        Geen data beschikbaar
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1; // Avoid division by zero

  // Calculate points for the line
  const points = data.map((item, index) => {
    const x = (index / (data.length - 1 || 1)) * 100;
    const y = 100 - ((item.value - min) / range) * 100;
    return { x, y, value: item.value, date: item.date };
  });

  const pathData = points.map((point, index) => {
    return index === 0 ? `M ${point.x},${point.y}` : `L ${point.x},${point.y}`;
  }).join(" ");

  return (
    <div
      className="border border-gray-200 rounded-lg bg-gray-50 p-4"
      style={{ height: `${height}px` }}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
        {/* Optional: Grid lines */}
        <defs>
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <path
          d={`${pathData} L 100,100 L 0,100 Z`}
          fill="url(#areaGradient)"
        />

        {/* Line */}
        <path
          d={pathData}
          fill="none"
          stroke="#2563eb"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="1.5"
            fill="#2563eb"
          />
        ))}
      </svg>

      {/* Optional: Min/Max labels */}
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>{data[0]?.date || ""}</span>
        <span>{data[data.length - 1]?.date || ""}</span>
      </div>
    </div>
  );
}






