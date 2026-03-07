"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Coins, TrendingUp, DollarSign } from "lucide-react";

interface TokenTotal {
  agentId: string;
  agentName: string;
  totalTokens: number;
  totalCost: number;
}

interface TokenUsageData {
  chartData: Array<Record<string, string | number>>;
  totalsByAgent: TokenTotal[];
}

export function TokenUsageChart() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [data, setData] = useState<TokenUsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/token-usage?period=${period}`);
        const json = await res?.json();
        setData(json ?? null);
      } catch (error) {
        console.error("Error fetching token usage:", error);
      }
      setLoading(false);
    };
    fetchData();
  }, [period]);

  const totalTokens = (data?.totalsByAgent ?? []).reduce(
    (sum, a) => sum + (a?.totalTokens ?? 0),
    0
  );
  const totalCost = (data?.totalsByAgent ?? []).reduce(
    (sum, a) => sum + (a?.totalCost ?? 0),
    0
  );

  const agentColors: Record<string, string> = {
    Rose: "#ec4899",
    Cathy: "#06b6d4",
    Ruthie: "#a855f7",
    Sarah: "#ef4444",
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          <h3 className="text-base md:text-lg font-semibold text-white">Token Usage Trends</h3>
        </div>
        <div className="flex gap-2">
          {(["daily", "weekly", "monthly"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                period === p
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {(data?.totalsByAgent ?? []).map((agent, index) => (
          <motion.div
            key={agent?.agentId ?? index}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="bg-slate-800/50 rounded-xl border border-white/5 p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">{agent?.agentName ?? "Unknown"}</span>
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: agentColors[agent?.agentName ?? ""] ?? "#6b7280" }}
              />
            </div>
            <div className="text-2xl font-bold text-white">
              {(agent?.totalTokens ?? 0).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">
              ${(agent?.totalCost ?? 0).toFixed(4)} total cost
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-slate-800/50 rounded-xl border border-white/5 p-6">
        {loading ? (
          <div className="h-[300px] flex items-center justify-center text-gray-500">
            Loading chart...
          </div>
        ) : (data?.chartData ?? []).length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-gray-500">
            No data available for the selected period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data?.chartData ?? []}>
              <defs>
                <linearGradient id="colorRose" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCathy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorRuthie" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fill: "#9ca3af", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "#374151" }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />
              <YAxis
                tick={{ fill: "#9ca3af", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "#374151" }}
                tickFormatter={(value) => `${(value / 1000).toFixed(1)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  fontSize: 11,
                }}
                labelStyle={{ color: "#fff" }}
              />
              <Legend
                verticalAlign="top"
                wrapperStyle={{ fontSize: 11, paddingBottom: 10 }}
              />
              <Area
                type="monotone"
                dataKey="Rose"
                stroke="#ec4899"
                fillOpacity={1}
                fill="url(#colorRose)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="Cathy"
                stroke="#06b6d4"
                fillOpacity={1}
                fill="url(#colorCathy)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="Ruthie"
                stroke="#a855f7"
                fillOpacity={1}
                fill="url(#colorRuthie)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-cyan-500/10 to-blue-600/10 rounded-xl border border-white/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-5 h-5 text-cyan-400" />
            <span className="text-sm text-gray-400">Total Tokens</span>
          </div>
          <div className="text-3xl font-bold text-white">
            {totalTokens.toLocaleString()}
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/10 to-green-600/10 rounded-xl border border-white/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <span className="text-sm text-gray-400">Total Cost</span>
          </div>
          <div className="text-3xl font-bold text-white">${totalCost.toFixed(4)}</div>
        </div>
      </div>
    </div>
  );
}
