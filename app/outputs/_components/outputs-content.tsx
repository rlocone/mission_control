"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Activity, Filter, ChevronDown, ChevronUp, Maximize2, X, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { MarkdownRenderer } from "@/components/dashboard/markdown-renderer";
import Image from "next/image";
import { stripMarkdown } from "@/lib/utils";

interface Output {
  id: string;
  content: string;
  summary: string | null;
  createdAt: string;
  agent: { id: string; name: string; role: string };
  task: { taskName: string };
}

interface Agent {
  id: string;
  name: string;
}

const agentColors: Record<string, string> = {
  Rose: "border-l-pink-500",
  Cathy: "border-l-cyan-500",
  Ruthie: "border-l-emerald-500",
  Sarah: "border-l-red-500",
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

export function OutputsPageContent() {
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentFilter, setAgentFilter] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [fullscreenOutput, setFullscreenOutput] = useState<Output | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams();
        params.set("limit", "50");
        if (agentFilter) params.set("agentId", agentFilter);

        const [outputsRes, agentsRes] = await Promise.all([
          fetch(`/api/outputs?${params.toString()}`),
          fetch("/api/agents"),
        ]);

        const [outputsData, agentsData] = await Promise.all([
          outputsRes?.json(),
          agentsRes?.json(),
        ]);

        setOutputs(outputsData ?? []);
        setAgents(agentsData ?? []);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
      setLoading(false);
    };
    fetchData();
  }, [agentFilter]);

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
          <FileText className="w-6 h-6 md:w-8 md:h-8 text-cyan-400" />
          Outputs
        </h1>
        <p className="text-gray-400 text-sm md:text-base mt-1">View all agent outputs and insights with source citations</p>
      </div>

      {/* Filter */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4 bg-slate-900/50 rounded-xl border border-white/5">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-400">Filter by agent:</span>
        </div>
        <select
          value={agentFilter}
          onChange={(e) => setAgentFilter(e?.target?.value ?? "")}
          className="px-3 py-2 sm:py-1.5 bg-slate-800 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50 w-full sm:w-auto"
        >
          <option value="">All Agents</option>
          {(agents ?? []).map((agent) => (
            <option key={agent?.id ?? ""} value={agent?.id ?? ""}>
              {agent?.name ?? "Unknown"}
            </option>
          ))}
        </select>
      </div>

      {/* Outputs List */}
      <div className="space-y-4 md:space-y-6">
        {(outputs ?? []).length === 0 ? (
          <div className="text-center py-12 text-gray-500">No outputs found</div>
        ) : (
          (outputs ?? []).map((output, index) => {
            const borderColor = agentColors[output?.agent?.name ?? ""] ?? "border-l-gray-500";
            const isExpanded = expandedIds.has(output?.id ?? "");
            const hasContent = output?.content && output.content.length > 300;

            return (
              <motion.div
                key={output?.id ?? index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-slate-900/50 rounded-xl border border-white/5 border-l-4 ${borderColor} overflow-hidden`}
              >
                <div className="p-4 md:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl overflow-hidden ring-2 ring-white/10 flex-shrink-0">
                        <Image
                          src={agentAvatars[output?.agent?.name ?? ""] ?? "/avatars/rose.png"}
                          alt={`${output?.agent?.name ?? "Agent"} avatar`}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-white text-sm md:text-base">
                          {output?.agent?.name ?? "Unknown"}
                          <span className="ml-1">{agentEmojis[output?.agent?.name ?? ""] ?? ""}</span>
                        </span>
                        <p className="text-xs text-gray-500 truncate">{output?.agent?.role ?? "No role"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-13 sm:ml-0">
                      <button
                        onClick={() => setFullscreenOutput(output)}
                        className="p-2 text-gray-500 hover:text-cyan-400 hover:bg-white/5 rounded-lg transition-colors"
                        title="View fullscreen"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                      <span className="text-xs text-gray-500">
                        {output?.createdAt
                          ? formatDistanceToNow(new Date(output.createdAt), { addSuffix: true })
                          : "Unknown"}
                      </span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <span className="text-xs text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded">
                      {output?.task?.taskName ?? "Unknown Task"}
                    </span>
                  </div>

                  {/* Content Preview or Full */}
                  <div className="bg-slate-800/50 rounded-lg p-3 md:p-4">
                    {!isExpanded ? (
                      <p className="text-gray-300 text-sm leading-relaxed line-clamp-4">
                        {stripMarkdown(output?.content ?? "", 300)}
                      </p>
                    ) : (
                      <div className="max-h-[600px] overflow-y-auto">
                        <MarkdownRenderer content={output?.content ?? ""} />
                      </div>
                    )}
                  </div>

                  {/* Expand/Collapse Button */}
                  {hasContent && (
                    <button
                      onClick={() => toggleExpand(output?.id ?? "")}
                      className="mt-4 flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Collapse report
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          Read full report with sources
                        </>
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {fullscreenOutput && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
            onClick={() => setFullscreenOutput(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 rounded-xl sm:rounded-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/10 gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl overflow-hidden ring-2 ring-white/10 flex-shrink-0">
                    <Image
                      src={agentAvatars[fullscreenOutput?.agent?.name ?? ""] ?? "/avatars/rose.png"}
                      alt={`${fullscreenOutput?.agent?.name ?? "Agent"} avatar`}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-white text-sm sm:text-base">
                      {fullscreenOutput?.agent?.name}
                      <span className="ml-1">{agentEmojis[fullscreenOutput?.agent?.name ?? ""] ?? ""}</span>
                    </span>
                    <p className="text-xs text-gray-500 truncate">{fullscreenOutput?.task?.taskName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setFullscreenOutput(null)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Modal Content */}
              <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(95vh-70px)] sm:max-h-[calc(90vh-80px)]">
                <MarkdownRenderer content={fullscreenOutput?.content ?? ""} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
