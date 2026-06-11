import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ChangeDirection } from '../common/types';

interface SparklineChartProps {
  values: number[];
  direction?: ChangeDirection;
  height?: number;
}

const strokeByDirection: Record<ChangeDirection, string> = {
  up: '#E03131',
  down: '#1971C2',
  flat: '#12996A'
};

export function SparklineChart({ values, direction = 'flat', height = 36 }: SparklineChartProps) {
  const data = values.map((value, index) => ({ index, value }));
  return (
    <div className="min-w-trend">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 2, left: 4 }}>
          <XAxis dataKey="index" hide />
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Tooltip cursor={false} formatter={(value: number) => [`${value.toLocaleString()}원`, '가격']} labelFormatter={() => ''} />
          <Line type="monotone" dataKey="value" stroke={strokeByDirection[direction]} strokeWidth={1.5} dot={{ r: 2 }} activeDot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
