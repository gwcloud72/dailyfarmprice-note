import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface HorizontalBarDatum {
  name: string;
  value: number;
  tone?: 'up' | 'down' | 'primary' | string;
}

interface HorizontalBarChartProps {
  data: HorizontalBarDatum[];
  height?: number;
}

export function HorizontalBarChart({ data, height = 220 }: HorizontalBarChartProps) {
  return (
    <div className="h-chart w-full">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart layout="vertical" data={data} margin={{ top: 8, right: 20, bottom: 8, left: 4 }}>
          <XAxis type="number" hide />
          <YAxis dataKey="name" type="category" width={82} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6B6B6B' }} />
          <Tooltip formatter={(value: number) => [value.toLocaleString(), '값']} />
          <Bar dataKey="value" radius={[0, 8, 8, 0]} fill="#0D7A4E" barSize={10} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
