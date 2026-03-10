"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Activity, CheckCircle, Clock, Loader2 } from "lucide-react";
import Image from "next/image";

interface Agent {
  id: string;
  name: string;
  role: string;
  appId: string;
  status: string;
  createdAt: string;
  completedTasks: number;
  tasks: Array<{ id: string; taskName: string; status: string; assignedAt: string }>;
}

const agentColors: Record<string, { gradient: string; icon: string }> = {
  Rose: { gradient: "from-pink-500 to-rose-600", icon: "text-pink-400" },
  Cathy: { gradient: "from-cyan-500 to-blue-600", icon: "text-cyan-400" },
  Ruthie: { gradient: "from-emerald-500 to-green-600", icon: "text-emerald-400" },
  Sarah: { gradient: "from-red-500 to-orange-600", icon: "text-red-400" },
};

const agentAvatars: Record<string, string> = {
  Rose: "/avatars/rose.png",
  Cathy: "/avatars/cathy.png",
  Ruthie: "/avatars/ruthie.png",
  Sarah: "/avatars/sarah.png",
};

const agentEmojis: Record<string, string> = {
  Rose: "🌹",
  Cathy: "💻",
  Ruthie: "🌱",
  Sarah: "🔐",
};

export function AgentsPageContent() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch("/api/agents");
        const data = await res?.json();
        setAgents(data ?? []);
        if ((data ?? []).length > 0) setSelectedAgent(data[0]);
      } catch (error) {
        console.error("Error fetching agents:", error);
      }
      setLoading(false);
    };
    fetchAgents();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Activity className="w-12 h-12 text-cyan-400 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <Users className="w-6 h-6 md:w-8 md:h-8 text-cyan-400" />
          Agents
        </h1>
        <p className="text-gray-400 text-sm md:text-base mt-1">Manage and monitor all AI agents</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {(agents ?? []).map((agent, index) => {
          const colors = agentColors[agent?.name ?? ""] ?? { gradient: "from-gray-500 to-gray-600", icon: "text-gray-400" };
          const isSelected = selectedAgent?.id === agent?.id;

          return (
            <motion.div
              key={agent?.id ?? index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setSelectedAgent(agent)}
              className={`relative cursor-pointer rounded-xl md:rounded-2xl bg-slate-900/50 border-2 transition-all p-4 md:p-6 ${
                isSelected ? "border-cyan-500/50 shadow-lg shadow-cyan-500/10" : "border-white/5 hover:border-white/10"
              }`}
            >
              <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-xl md:rounded-t-2xl bg-gradient-to-r ${colors.gradient}`} />
              
              <div className="flex items-start gap-3 md:gap-4 mb-4">
                <div className="relative w-12 h-12 md:w-16 md:h-16 rounded-lg md:rounded-xl overflow-hidden ring-2 ring-white/20 shadow-lg flex-shrink-0">
                  <Image
                    src={agentAvatars[agent?.name ?? ""] ?? "/avatars/rose.png"}
                    alt={`${agent?.name ?? "Agent"} avatar`}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                    <span className="truncate">{agent?.name ?? "Unknown"}</span>
                    <span className="text-base md:text-lg flex-shrink-0">{agentEmojis[agent?.name ?? ""] ?? ""}</span>
                  </h3>
                  <p className="text-xs md:text-sm text-gray-400 truncate">{agent?.role ?? "No role"}</p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">App ID</span>
                  <span className="font-mono text-gray-300">{agent?.appId ?? "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    agent?.status === "ACTIVE" ? "bg-emerald-500/20 text-emerald-400" :
                    agent?.status === "BUSY" ? "bg-amber-500/20 text-amber-400" :
                    "bg-gray-500/20 text-gray-400"
                  }`}>{agent?.status ?? "UNKNOWN"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Completed Tasks</span>
                  <span className="text-emerald-400 font-medium">{agent?.completedTasks ?? 0}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {selectedAgent && (
        <motion.div
          key={selectedAgent.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/50 rounded-2xl border border-white/5 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="relative w-10 h-10 rounded-lg overflow-hidden ring-2 ring-white/10">
              <Image
                src={agentAvatars[selectedAgent?.name ?? ""] ?? "/avatars/rose.png"}
                alt={`${selectedAgent?.name ?? "Agent"} avatar`}
                fill
                className="object-cover"
                sizes="40px"
              />
            </div>
            <h3 className="text-xl font-semibold text-white">
              {selectedAgent?.name ?? "Unknown"} {agentEmojis[selectedAgent?.name ?? ""] ?? ""}'s Recent Tasks
            </h3>
          </div>
          <div className="space-y-3">
            {((selectedAgent?.tasks ?? []).length === 0) ? (
              <p className="text-gray-500 text-center py-8">No tasks assigned yet</p>
            ) : (
              (selectedAgent?.tasks ?? []).map((task, index) => (
                <div
                  key={task?.id ?? index}
                  className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-white/5"
                >
                  <div className="flex items-center gap-3">
                    {task?.status === "COMPLETED" ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : task?.status === "IN_PROGRESS" ? (
                      <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                    ) : (
                      <Clock className="w-5 h-5 text-blue-400" />
                    )}
                    <span className="text-white">{task?.taskName ?? "Untitled"}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {task?.assignedAt ? new Date(task.assignedAt).toLocaleDateString() : "N/A"}
                  </span>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
