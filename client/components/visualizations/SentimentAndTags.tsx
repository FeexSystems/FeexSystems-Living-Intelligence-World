import 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

const COLORS = ['#00C49F', '#FFBB28', '#FF8042'];

export function SentimentPieChart({ data }: { data: { sentiment: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="sentiment"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label
        >
          {data.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function SentimentTrendLine({ data }: { data: { date: string; positive: number; negative: number; neutral: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="positive" stroke="#00C49F" />
        <Line type="monotone" dataKey="neutral" stroke="#FFBB28" />
        <Line type="monotone" dataKey="negative" stroke="#FF8042" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function TagCloud({ tags }: { tags: { tag: string; count: number }[] }) {
  return (
    <div className="flex flex-wrap gap-2 p-4">
      {tags.map(({ tag, count }) => (
        <span
          key={tag}
          style={{
            fontSize: `${Math.min(2 + count, 5)}rem`,
            color: COLORS[count % COLORS.length],
            fontWeight: 600,
          }}
        >
          #{tag}
        </span>
      ))}
    </div>
  );
}
