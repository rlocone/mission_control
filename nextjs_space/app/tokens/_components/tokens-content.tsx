"use client";

import { BarChart3 } from "lucide-react";
import { TokenUsageChart } from "@/components/dashboard/token-usage-chart";

export function TokensPageContent() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-cyan-400" />
          Token Usage
        </h1>
        <p className="text-gray-400 mt-1">Track token consumption and costs across all agents</p>
      </div>

      <div className="bg-slate-900/50 rounded-2xl border border-white/5 p-6">
        <TokenUsageChart />
      </div>
    </div>
  );
}
