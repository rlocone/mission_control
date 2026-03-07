"use client";

import { CheckCircle, Clock, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

interface Agent {
  id: string;
  name: string;
  role: string;
  appId: string;
  status: string;
  completedTasks: number;
  tasks?: Array<{ id: string; status: string }>;
}

interface AgentCardProps {
  agent: Agent;
  index: number;
}

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  ACTIVE: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-500" },
  INACTIVE: { bg: "bg-gray-500/10", text: "text-gray-400", dot: "bg-gray-500" },
  BUSY: { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-500" },
};

const agentColors: Record<string, string> = {
  Rose: "from-pink-500/20 to-rose-600/20",
  Cathy: "from-cyan-500/20 to-blue-600/20",
  Ruthie: "from-emerald-500/20 to-green-600/20",
  Sarah: "from-red-500/20 to-orange-600/20",
};

// Agent avatars and emojis
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

export function AgentCard({ agent, index }: AgentCardProps) {
  const status = statusColors[agent?.status ?? "INACTIVE"] ?? statusColors.INACTIVE;
  const gradientClass = agentColors[agent?.name ?? ""] ?? "from-gray-500/20 to-gray-600/20";
  const avatar = agentAvatars[agent?.name ?? ""] ?? "/avatars/rose.png";
  const emoji = agentEmojis[agent?.name ?? ""] ?? "🤖";

  const inProgressTasks = (agent?.tasks ?? []).filter((t) => t?.status === "IN_PROGRESS")?.length ?? 0;
  const pendingTasks = (agent?.tasks ?? []).filter((t) => t?.status === "PENDING")?.length ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradientClass} backdrop-blur-sm border border-white/10 p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative w-14 h-14 rounded-xl overflow-hidden ring-2 ring-white/20 shadow-lg">
            <Image
              src={avatar}
              alt={`${agent?.name ?? "Agent"} avatar`}
              fill
              className="object-cover"
              sizes="56px"
            />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              {agent?.name ?? "Unknown"}
              <span className="text-lg">{emoji}</span>
            </h3>
            <p className="text-sm text-gray-400 max-w-[180px] truncate">{agent?.role ?? "No role"}</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${status.bg}`}>
          <span className={`w-2 h-2 rounded-full ${status.dot} animate-pulse`} />
          <span className={`text-xs font-medium ${status.text}`}>{agent?.status ?? "UNKNOWN"}</span>
        </div>
      </div>

      <div className="text-xs text-gray-500 mb-4 font-mono">App ID: {agent?.appId ?? "N/A"}</div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-emerald-400 mb-1">
            <CheckCircle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-white">{agent?.completedTasks ?? 0}</div>
          <div className="text-xs text-gray-500">Completed</div>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-amber-400 mb-1">
            <Loader2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-white">{inProgressTasks}</div>
          <div className="text-xs text-gray-500">In Progress</div>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-blue-400 mb-1">
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-white">{pendingTasks}</div>
          <div className="text-xs text-gray-500">Pending</div>
        </div>
      </div>
    </motion.div>
  );
}
