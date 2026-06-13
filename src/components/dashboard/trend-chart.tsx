'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface Point {
  period: string;
  completed: number;
  points: number;
}

export function TrendChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="pts" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(243 75% 59%)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="hsl(243 75% 59%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="period" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid hsl(214 32% 91%)', fontSize: 12 }}
        />
        <Area type="monotone" dataKey="points" stroke="hsl(243 75% 59%)" fill="url(#pts)" name="Points" />
        <Area type="monotone" dataKey="completed" stroke="hsl(142 71% 45%)" fillOpacity={0} name="Completed" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
