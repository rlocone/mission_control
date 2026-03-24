"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ListTodo, Activity, CheckCircle, Clock, Loader2, AlertTriangle, Filter } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { MarkdownRenderer } from "@/components/dashboard/markdown-renderer";
import { stripMarkdown } from "@/lib/utils";

interface Task {
  id: string;
  taskName: string;
  description: string | null;
  status: string;
  assignedAt: string;
  completedAt: string | null;
  output: string | null;
  agent: { id: string; name: string };
}

interface Agent {
  id: string;
  name: string;
}

const statusConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  COMPLETED: { icon: <CheckCircle className="w-5 h-5" />, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  IN_PROGRESS: { icon: <Loader2 className="w-5 h-5 animate-spin" />, color: "text-amber-400", bg: "bg-amber-500/10" },
  PENDING: { icon: <Clock className="w-5 h-5" />, color: "text-blue-400", bg: "bg-blue-500/10" },
  FAILED: { icon: <AlertTriangle className="w-5 h-5" />, color: "text-red-400", bg: "bg-red-500/10" },
};

export function TasksPageContent() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentFilter, setAgentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams();
        if (agentFilter) params.set("agentId", agentFilter);
        if (statusFilter) params.set("status", statusFilter);

        const [tasksRes, agentsRes] = await Promise.all([
          fetch(`/api/tasks?${params.toString()}`),
          fetch("/api/agents"),
        ]);

        const [tasksData, agentsData] = await Promise.all([
          tasksRes?.json(),
          agentsRes?.json(),
        ]);

        setTasks(tasksData ?? []);
        setAgents(agentsData ?? []);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
      setLoading(false);
    };
    fetchData();
  }, [agentFilter, statusFilter]);

  const tasksByStatus = {
    PENDING: (tasks ?? []).filter((t) => t?.status === "PENDING").length,
    IN_PROGRESS: (tasks ?? []).filter((t) => t?.status === "IN_PROGRESS").length,
    COMPLETED: (tasks ?? []).filter((t) => t?.status === "COMPLETED").length,
    FAILED: (tasks ?? []).filter((t) => t?.status === "FAILED").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Activity className="w-12 h-12 text-cyan-400 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <ListTodo className="w-8 h-8 text-cyan-400" />
          Tasks
        </h1>
        <p className="text-gray-400 mt-1">Track and manage all agent tasks</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(tasksByStatus).map(([status, count]) => {
          const config = statusConfig[status] ?? statusConfig.PENDING;
          return (
            <div key={status} className={`${config.bg} rounded-xl p-4 border border-white/5`}>
              <div className={`flex items-center gap-2 ${config.color} mb-2`}>
                {config.icon}
                <span className="text-sm capitalize">{status.toLowerCase().replace("_", " ")}</span>
              </div>
              <div className="text-3xl font-bold text-white">{count}</div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-4 p-4 bg-slate-900/50 rounded-xl border border-white/5">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-400">Filters:</span>
        </div>
        <select
          value={agentFilter}
          onChange={(e) => setAgentFilter(e?.target?.value ?? "")}
          className="px-3 py-1.5 bg-slate-800 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50"
        >
          <option value="">All Agents</option>
          {(agents ?? []).map((agent) => (
            <option key={agent?.id ?? ""} value={agent?.id ?? ""}>
              {agent?.name ?? "Unknown"}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e?.target?.value ?? "")}
          className="px-3 py-1.5 bg-slate-800 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      {/* Task List */}
      <div className="space-y-4">
        {(tasks ?? []).length === 0 ? (
          <div className="text-center py-12 text-gray-500">No tasks found</div>
        ) : (
          (tasks ?? []).map((task, index) => {
            const config = statusConfig[task?.status ?? "PENDING"] ?? statusConfig.PENDING;
            return (
              <motion.div
                key={task?.id ?? index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-slate-900/50 rounded-xl border border-white/5 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${config.bg} ${config.color}`}>
                      {config.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{task?.taskName ?? "Untitled"}</h3>
                      <p className="text-sm text-gray-400">Assigned to {task?.agent?.name ?? "Unknown"}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs ${config.bg} ${config.color}`}>
                    {(task?.status ?? "PENDING").replace("_", " ")}
                  </span>
                </div>

                {task?.description && (
                  <p className="text-gray-400 text-sm mb-4">{stripMarkdown(task.description, 500)}</p>
                )}

                {task?.output && (
                  <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
                    <span className="text-xs text-gray-500 uppercase block mb-2">Output</span>
                    <div className="text-gray-300 text-sm max-h-[400px] overflow-y-auto">
                      <MarkdownRenderer content={task.output} />
                    </div>
                  </div>
                )}

                <div className="flex gap-6 text-xs text-gray-500">
                  <span>Assigned: {task?.assignedAt ? formatDistanceToNow(new Date(task.assignedAt), { addSuffix: true }) : "N/A"}</span>
                  {task?.completedAt && (
                    <span>Completed: {formatDistanceToNow(new Date(task.completedAt), { addSuffix: true })}</span>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
