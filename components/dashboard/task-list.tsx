"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Clock, Loader2, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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

interface TaskListProps {
  tasks: Task[];
}

const statusConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  COMPLETED: {
    icon: <CheckCircle className="w-4 h-4" />,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  IN_PROGRESS: {
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  PENDING: {
    icon: <Clock className="w-4 h-4" />,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  FAILED: {
    icon: <AlertTriangle className="w-4 h-4" />,
    color: "text-red-400",
    bg: "bg-red-500/10",
  },
};

export function TaskList({ tasks }: TaskListProps) {
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  return (
    <div className="space-y-2 sm:space-y-3">
      {(tasks ?? []).map((task, index) => {
        const config = statusConfig[task?.status ?? "PENDING"] ?? statusConfig.PENDING;
        const isExpanded = expandedTask === task?.id;

        return (
          <motion.div
            key={task?.id ?? index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-slate-800/50 rounded-lg sm:rounded-xl border border-white/5 overflow-hidden"
          >
            <div
              className="p-3 sm:p-4 cursor-pointer hover:bg-white/5 transition-colors"
              onClick={() => setExpandedTask(isExpanded ? null : (task?.id ?? null))}
            >
              <div className="flex items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div className={`p-1.5 sm:p-2 rounded-md sm:rounded-lg ${config.bg} ${config.color} flex-shrink-0`}>
                    {config.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-white text-sm sm:text-base truncate">{task?.taskName ?? "Untitled Task"}</h4>
                    <p className="text-xs sm:text-sm text-gray-500 truncate">{task?.agent?.name ?? "Unknown Agent"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <span className="text-[10px] sm:text-xs text-gray-500 hidden sm:inline">
                    {task?.assignedAt ? formatDistanceToNow(new Date(task.assignedAt), { addSuffix: true }) : "Unknown"}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </div>
              </div>
            </div>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-white/5"
                >
                  <div className="p-4 space-y-3">
                    {task?.description && (
                      <div>
                        <span className="text-xs text-gray-500 uppercase">Description</span>
                        <p className="text-sm text-gray-300 mt-1">{task.description}</p>
                      </div>
                    )}
                    {task?.output && (
                      <div>
                        <span className="text-xs text-gray-500 uppercase">Output</span>
                        <p className="text-sm text-gray-300 mt-1 bg-slate-900/50 rounded-lg p-3">
                          {task.output}
                        </p>
                      </div>
                    )}
                    {task?.completedAt && (
                      <div className="text-xs text-gray-500">
                        Completed: {new Date(task.completedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}

      {(tasks ?? []).length === 0 && (
        <div className="text-center py-8 text-gray-500">No tasks found</div>
      )}
    </div>
  );
}
