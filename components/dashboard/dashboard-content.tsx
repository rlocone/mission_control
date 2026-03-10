"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Activity } from "lucide-react";
import { AgentCard } from "./agent-card";
import { TaskList } from "./task-list";
import { RecentOutputs } from "./recent-outputs";
import { TokenUsageChart } from "./token-usage-chart";
import { LogViewer } from "./log-viewer";
import { SystemClock } from "./system-clock";

interface Agent {
  id: string;
  name: string;
  role: string;
  appId: string;
  status: string;
  completedTasks: number;
  tasks?: Array<{ id: string; status: string }>;
}

interface Task {
  id: string;
  taskName: string;
  description: string | null;
  status: string;
  assignedAt: string;
  completedAt: string | null;
  output: string | null;
  agent: { name: string };
}

interface Output {
  id: string;
  content: string;
  summary: string | null;
  createdAt: string;
  agent: { name: string; role: string };
  task: { taskName: string };
}

export function DashboardContent() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [agentsRes, tasksRes, outputsRes] = await Promise.all([
        fetch("/api/agents"),
        fetch("/api/tasks"),
        fetch("/api/outputs?limit=5"),
      ]);

      const [agentsData, tasksData, outputsData] = await Promise.all([
        agentsRes?.json(),
        tasksRes?.json(),
        outputsRes?.json(),
      ]);

      setAgents(agentsData ?? []);
      setTasks(tasksData ?? []);
      setOutputs(outputsData ?? []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Activity className="w-12 h-12 text-cyan-400 animate-pulse mx-auto mb-4" />
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:gap-3 md:gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Mission Control</h1>
            <p className="text-gray-400 text-xs sm:text-sm md:text-base mt-0.5 sm:mt-1">Multi-Agent Orchestration Dashboard</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-cyan-500/20 text-cyan-400 rounded-lg sm:rounded-xl hover:bg-cyan-500/30 transition-all disabled:opacity-50 w-full sm:w-auto text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <SystemClock />
        </div>
      </div>

      {/* Agent Cards */}
      <section>
        <h2 className="text-base sm:text-lg md:text-xl font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
          Agent Overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {(agents ?? []).map((agent, index) => (
            <AgentCard key={agent?.id ?? index} agent={agent} index={index} />
          ))}
        </div>
      </section>

      {/* Tasks and Outputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <section className="bg-slate-900/50 rounded-xl sm:rounded-2xl border border-white/5 p-3 sm:p-4 md:p-6">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-white mb-3 sm:mb-4">Recent Tasks</h2>
          <TaskList tasks={(tasks ?? []).slice(0, 6)} />
        </section>

        <section className="bg-slate-900/50 rounded-xl sm:rounded-2xl border border-white/5 p-3 sm:p-4 md:p-6">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-white mb-3 sm:mb-4">Recent Outputs</h2>
          <RecentOutputs outputs={outputs ?? []} />
        </section>
      </div>

      {/* Token Usage */}
      <section className="bg-slate-900/50 rounded-xl sm:rounded-2xl border border-white/5 p-3 sm:p-4 md:p-6">
        <TokenUsageChart />
      </section>

      {/* Logs */}
      <section className="bg-slate-900/50 rounded-xl sm:rounded-2xl border border-white/5 p-3 sm:p-4 md:p-6">
        <h2 className="text-base sm:text-lg md:text-xl font-semibold text-white mb-3 sm:mb-4">Audit Logs</h2>
        <LogViewer agents={agents ?? []} />
      </section>
    </div>
  );
}
