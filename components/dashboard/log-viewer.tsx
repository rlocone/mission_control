"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Info,
  AlertTriangle,
  Bug,
  ArrowUpDown,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Log {
  id: string;
  message: string;
  logLevel: string;
  timestamp: string;
  agent: { name: string } | null;
  task: { taskName: string } | null;
}

interface Agent {
  id: string;
  name: string;
}

interface LogViewerProps {
  agents: Agent[];
}

const logLevelConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  DEBUG: { icon: <Bug className="w-4 h-4" />, color: "text-gray-400", bg: "bg-gray-500/10" },
  INFO: { icon: <Info className="w-4 h-4" />, color: "text-blue-400", bg: "bg-blue-500/10" },
  WARN: { icon: <AlertTriangle className="w-4 h-4" />, color: "text-amber-400", bg: "bg-amber-500/10" },
  ERROR: { icon: <AlertCircle className="w-4 h-4" />, color: "text-red-400", bg: "bg-red-500/10" },
};

export function LogViewer({ agents }: LogViewerProps) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortField, setSortField] = useState("timestamp");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (agentFilter) params.set("agentId", agentFilter);
      if (levelFilter) params.set("logLevel", levelFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      params.set("page", page.toString());
      params.set("sortField", sortField);
      params.set("sortOrder", sortOrder);

      const res = await fetch(`/api/logs?${params.toString()}`);
      const data = await res?.json();
      setLogs(data?.logs ?? []);
      setTotalPages(data?.totalPages ?? 1);
    } catch (error) {
      console.error("Error fetching logs:", error);
    }
    setLoading(false);
  }, [search, agentFilter, levelFilter, startDate, endDate, page, sortField, sortOrder]);

  useEffect(() => {
    const timer = setTimeout(fetchLogs, 300);
    return () => clearTimeout(timer);
  }, [fetchLogs]);

  const handleExport = async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (agentFilter) params.set("agentId", agentFilter);
    if (levelFilter) params.set("logLevel", levelFilter);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    window.open(`/api/logs/export?${params.toString()}`, "_blank");
  };

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => {
              setSearch(e?.target?.value ?? "");
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            showFilters
              ? "bg-cyan-500/20 text-cyan-400"
              : "bg-slate-800/50 text-gray-400 hover:bg-white/10"
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/30 transition-all"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-slate-800/30 rounded-xl border border-white/5"
        >
          <div>
            <label className="text-xs text-gray-500 block mb-1">Agent</label>
            <select
              value={agentFilter}
              onChange={(e) => {
                setAgentFilter(e?.target?.value ?? "");
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500/50"
            >
              <option value="">All Agents</option>
              {(agents ?? []).map((agent) => (
                <option key={agent?.id ?? ""} value={agent?.id ?? ""}>
                  {agent?.name ?? "Unknown"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Log Level</label>
            <select
              value={levelFilter}
              onChange={(e) => {
                setLevelFilter(e?.target?.value ?? "");
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500/50"
            >
              <option value="">All Levels</option>
              <option value="DEBUG">Debug</option>
              <option value="INFO">Info</option>
              <option value="WARN">Warning</option>
              <option value="ERROR">Error</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e?.target?.value ?? "");
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e?.target?.value ?? "");
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </motion.div>
      )}

      <div className="bg-slate-800/50 rounded-xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-4 py-3">
                  <button
                    onClick={() => toggleSort("timestamp")}
                    className="flex items-center gap-1 text-xs text-gray-500 uppercase hover:text-gray-300"
                  >
                    Timestamp
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Agent</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Level</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Message</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500">
                    Loading logs...
                  </td>
                </tr>
              ) : (logs ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500">
                    No logs found
                  </td>
                </tr>
              ) : (
                (logs ?? []).map((log, index) => {
                  const config = logLevelConfig[log?.logLevel ?? "INFO"] ?? logLevelConfig.INFO;
                  return (
                    <motion.tr
                      key={log?.id ?? index}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b border-white/5 hover:bg-white/5"
                    >
                      <td className="px-4 py-3">
                        <div className="text-sm text-white">
                          {log?.timestamp
                            ? new Date(log.timestamp).toLocaleString()
                            : "Unknown"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {log?.timestamp
                            ? formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })
                            : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-300">{log?.agent?.name ?? "System"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs ${config.bg} ${config.color}`}
                        >
                          {config.icon}
                          {log?.logLevel ?? "INFO"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-300 max-w-md truncate">
                          {log?.message ?? "No message"}
                        </p>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
