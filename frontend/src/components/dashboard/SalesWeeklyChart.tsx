"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { DaySalesChartItem } from "@/services/dashboard.service";

interface SalesWeeklyChartProps {
  data: DaySalesChartItem[];
}

export function SalesWeeklyChart({ data }: SalesWeeklyChartProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as DaySalesChartItem;
      return (
        <div className="p-3 bg-[#26302B] text-white rounded-xl shadow-xl text-xs space-y-1">
          <p className="font-bold text-[#8FA393]">{item.dayName} ({item.date})</p>
          <p className="text-base font-bold">${item.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
          <p className="text-[#DDD9D0]">{item.count} venta(s) realizada(s)</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#556B5D" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#556B5D" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#DDD9D0" />
          <XAxis
            dataKey="dayName"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6B7A71", fontSize: 12, fontWeight: 500 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6B7A71", fontSize: 11 }}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#556B5D"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#salesGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
