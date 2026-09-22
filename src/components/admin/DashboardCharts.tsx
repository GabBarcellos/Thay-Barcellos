import { memo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type RevenuePoint = { name: string; valor: number };
type ServiceStat = { name: string; value: number; color: string };

export const RevenueAreaChart = memo(function RevenueAreaChart({
  data,
}: {
  data: RevenuePoint[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f9a8d4" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#f9a8d4" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} dy={10} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} tickFormatter={(v) => `R$${v}`} />
        <Tooltip
          contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}
          formatter={(value) => [`R$ ${value}`, "Receita"]}
        />
        <Area type="monotone" dataKey="valor" stroke="#ec4899" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
      </AreaChart>
    </ResponsiveContainer>
  );
});

export const ServicesPieChart = memo(function ServicesPieChart({
  data,
}: {
  data: ServiceStat[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
});

export default { RevenueAreaChart, ServicesPieChart };