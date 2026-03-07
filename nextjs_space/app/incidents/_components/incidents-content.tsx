"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Activity,
  Filter,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  TrendingUp,
  Users,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";

interface Incident {
  id: string;
  incidentType: string;
  triggeringAgentId: string;
  triggeringTaskId: string | null;
  triggeringTaskName: string | null;
  thresholdName: string;
  thresholdLimit: number;
  actualValue: number;
  tokensAtIncident: number;
  dailyUsageAtTime: number;
  burnRateAtTime: number;
  stopReason: string;
  workflowHalted: boolean;
  agentsAffected: string[];
  tasksSkipped: string[];
  resolution: string | null;
  resolvedAt: string | null;
  timestamp: string;
  thresholds: Record<string, number>;
  triggeringAgent: {
    id: string;
    name: string;
    role: string;
    appId: string;
  };
}

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

const incidentTypeLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  TASK_LIMIT_EXCEEDED: {
    label: "Task Limit Exceeded",
    color: "text-red-400 bg-red-500/10",
    icon: <Zap className="w-4 h-4" />,
  },
  RUN_LIMIT_EXCEEDED: {
    label: "Run Limit Exceeded",
    color: "text-orange-400 bg-orange-500/10",
    icon: <TrendingUp className="w-4 h-4" />,
  },
  DAILY_LIMIT_EXCEEDED: {
    label: "Daily Limit Exceeded",
    color: "text-amber-400 bg-amber-500/10",
    icon: <Clock className="w-4 h-4" />,
  },
  BURN_RATE_EXCEEDED: {
    label: "Burn Rate Exceeded",
    color: "text-pink-400 bg-pink-500/10",
    icon: <Activity className="w-4 h-4" />,
  },
};

export function IncidentsPageContent() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolvedFilter, setResolvedFilter] = useState<string>("");
  const [resolutionText, setResolutionText] = useState<string>("");
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const fetchIncidents = async () => {
    try {
      const params = new URLSearchParams();
      params.set("limit", "50");
      if (resolvedFilter) params.set("resolved", resolvedFilter);

      const res = await fetch(`/api/incidents?${params.toString()}`);
      const data = await res?.json();
      setIncidents(data ?? []);
    } catch (error) {
      console.error("Error fetching incidents:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchIncidents();
  }, [resolvedFilter]);

  const handleResolve = async (incidentId: string) => {
    if (!resolutionText.trim()) return;

    try {
      const res = await fetch("/api/incidents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: incidentId, resolution: resolutionText }),
      });

      if (res.ok) {
        setResolutionText("");
        setResolvingId(null);
        fetchIncidents();
      }
    } catch (error) {
      console.error("Error resolving incident:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <AlertTriangle className="w-12 h-12 text-amber-400 animate-pulse" />
      </div>
    );
  }

  const unresolvedCount = incidents.filter((i) => !i.resolvedAt).length;

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2 md:gap-3">
            <AlertTriangle className="w-6 h-6 md:w-8 md:h-8 text-amber-400" />
            <span className="truncate">Rose&apos;s Incident Reports 🌹</span>
          </h1>
          <p className="text-gray-400 text-sm md:text-base mt-1">
            Token threshold violations detected and logged by Rose
          </p>
        </div>
        {unresolvedCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-red-500/10 rounded-xl border border-red-500/30 w-fit">
            <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
            <span className="text-red-400 font-medium text-sm sm:text-base">
              {unresolvedCount} Unresolved
            </span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-400 sm:hidden">Filter:</span>
        </div>
        <select
          value={resolvedFilter}
          onChange={(e) => setResolvedFilter(e.target.value)}
          className="px-3 py-2 sm:py-1.5 bg-slate-800 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50 w-full sm:w-auto"
        >
          <option value="">All Incidents</option>
          <option value="false">Unresolved Only</option>
          <option value="true">Resolved Only</option>
        </select>
      </div>

      {/* Incidents List */}
      <div className="space-y-4">
        {incidents.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-white/5">
            <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Incidents Found</h3>
            <p className="text-gray-400">All systems operating within thresholds</p>
          </div>
        ) : (
          incidents.map((incident, index) => {
            const typeInfo = incidentTypeLabels[incident.incidentType] ?? {
              label: incident.incidentType,
              color: "text-gray-400 bg-gray-500/10",
              icon: <AlertTriangle className="w-4 h-4" />,
            };
            const isExpanded = expandedId === incident.id;
            const isResolved = !!incident.resolvedAt;
            const isResolving = resolvingId === incident.id;

            return (
              <motion.div
                key={incident.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-slate-900/50 rounded-2xl border overflow-hidden ${
                  isResolved
                    ? "border-emerald-500/20"
                    : "border-red-500/30"
                }`}
              >
                {/* Incident Header */}
                <div
                  className="p-4 md:p-6 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : incident.id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex items-center gap-3 md:gap-4">
                      {/* Agent Avatar */}
                      <div className="relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg md:rounded-xl overflow-hidden ring-2 ring-white/10 flex-shrink-0">
                        <Image
                          src={
                            agentAvatars[incident.triggeringAgent?.name ?? ""] ??
                            "/avatars/rose.png"
                          }
                          alt={`${incident.triggeringAgent?.name ?? "Agent"} avatar`}
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span
                            className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 ${typeInfo.color}`}
                          >
                            {typeInfo.icon}
                            {typeInfo.label}
                          </span>
                          {isResolved ? (
                            <span className="px-2 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Resolved
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              Unresolved
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                          Triggered by {incident.triggeringAgent?.name ?? "Unknown"}
                          <span>{agentEmojis[incident.triggeringAgent?.name ?? ""] ?? ""}</span>
                        </h3>
                        <p className="text-sm text-gray-400">
                          {incident.triggeringTaskName ?? "Unknown Task"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(incident.timestamp), {
                          addSuffix: true,
                        })}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mt-4">
                    <div className="bg-slate-800/50 rounded-lg p-2 md:p-3 text-center">
                      <div className="text-xs text-gray-500 mb-1">Threshold</div>
                      <div className="text-xs md:text-sm font-mono text-amber-400 truncate">
                        {incident.thresholdName.replace("max_", "").replace(/_/g, " ")}
                      </div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-2 md:p-3 text-center">
                      <div className="text-xs text-gray-500 mb-1">Limit</div>
                      <div className="text-xs md:text-sm font-mono text-cyan-400">
                        {incident.thresholdLimit.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-2 md:p-3 text-center">
                      <div className="text-xs text-gray-500 mb-1">Actual</div>
                      <div className="text-xs md:text-sm font-mono text-red-400">
                        {Math.round(incident.actualValue).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-2 md:p-3 text-center">
                      <div className="text-xs text-gray-500 mb-1">Exceeded</div>
                      <div className="text-xs md:text-sm font-mono text-pink-400">
                        {Math.round(
                          ((incident.actualValue - incident.thresholdLimit) /
                            incident.thresholdLimit) *
                            100
                        )}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-t border-white/5"
                    >
                      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                        {/* Stop Reason */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-400 mb-2">
                            Stop Reason
                          </h4>
                          <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 md:p-4">
                            <p className="text-red-400 font-mono text-xs md:text-sm break-words">
                              {incident.stopReason}
                            </p>
                          </div>
                        </div>

                        {/* Context at Incident Time */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                          <div className="bg-slate-800/50 rounded-lg p-3 md:p-4">
                            <div className="text-xs text-gray-500 mb-1">
                              Tokens at Incident
                            </div>
                            <div className="text-lg md:text-xl font-mono text-white">
                              {incident.tokensAtIncident.toLocaleString()}
                            </div>
                          </div>
                          <div className="bg-slate-800/50 rounded-lg p-3 md:p-4">
                            <div className="text-xs text-gray-500 mb-1">
                              Daily Usage at Time
                            </div>
                            <div className="text-lg md:text-xl font-mono text-white">
                              {incident.dailyUsageAtTime.toLocaleString()}
                            </div>
                          </div>
                          <div className="bg-slate-800/50 rounded-lg p-3 md:p-4">
                            <div className="text-xs text-gray-500 mb-1">
                              Burn Rate at Time
                            </div>
                            <div className="text-lg md:text-xl font-mono text-white">
                              {Math.round(incident.burnRateAtTime).toLocaleString()}/min
                            </div>
                          </div>
                        </div>

                        {/* Tasks Skipped */}
                        {incident.tasksSkipped.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              Tasks Skipped Due to This Incident
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {incident.tasksSkipped.map((task, i) => (
                                <span
                                  key={i}
                                  className="px-3 py-1 bg-amber-500/10 text-amber-400 rounded-lg text-sm"
                                >
                                  {task}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Thresholds at Time */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-400 mb-2">
                            Thresholds at Incident Time
                          </h4>
                          <div className="bg-slate-800/50 rounded-lg p-4 font-mono text-xs text-gray-300">
                            <pre>{JSON.stringify(incident.thresholds, null, 2)}</pre>
                          </div>
                        </div>

                        {/* Resolution Section */}
                        <div className="border-t border-white/5 pt-6">
                          <h4 className="text-sm font-medium text-gray-400 mb-3">
                            Resolution
                          </h4>
                          {isResolved ? (
                            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4">
                              <p className="text-emerald-400">{incident.resolution}</p>
                              <p className="text-xs text-gray-500 mt-2">
                                Resolved{" "}
                                {formatDistanceToNow(new Date(incident.resolvedAt!), {
                                  addSuffix: true,
                                })}
                              </p>
                            </div>
                          ) : isResolving ? (
                            <div className="space-y-3">
                              <textarea
                                value={resolutionText}
                                onChange={(e) => setResolutionText(e.target.value)}
                                placeholder="Describe the root cause and how it was fixed..."
                                className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 resize-none"
                                rows={3}
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleResolve(incident.id)}
                                  className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors"
                                >
                                  Mark as Resolved
                                </button>
                                <button
                                  onClick={() => {
                                    setResolvingId(null);
                                    setResolutionText("");
                                  }}
                                  className="px-4 py-2 bg-slate-800 text-gray-400 rounded-lg hover:bg-slate-700 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setResolvingId(incident.id)}
                              className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors"
                            >
                              Add Resolution
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
