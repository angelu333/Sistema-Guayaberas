"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import type { TopProductChartItem } from "@/services/dashboard.service";

interface TopProductsChartProps {
  data: TopProductChartItem[];
}

const COLORS = ["#556B5D", "#8FA393", "#C49A5A", "#3F7D58", "#D89B2B"];

export function TopProductsChart({ data }: TopProductsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-xs text-[#6B7A71] border-2 border-dashed border-[#E7E3DA] rounded-xl p-4">
        <p>Aún no hay ventas suficientes para determinar los productos más vendidos.</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as TopProductChartItem;
      return (
        <div className="p-3 bg-[#26302B] text-white rounded-xl shadow-xl text-xs space-y-1">
          <p className="font-bold text-[#8FA393]">{item.name}</p>
          <p className="text-sm font-semibold">{item.quantitySold} guayabera(s) vendida(s)</p>
          <p className="text-[#DDD9D0]">Ingresos: ${item.revenue.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={data} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#6B7A71", fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="name"
            axisLine={false}
            tickLine={false}
            width={110}
            tick={{ fill: "#26302B", fontSize: 11, fontWeight: 600 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="quantitySold" radius={[0, 8, 8, 0]}>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
