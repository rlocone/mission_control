"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { MarkdownRenderer } from "./markdown-renderer";
import Image from "next/image";
import { stripMarkdown } from "@/lib/utils";

interface Output {
  id: string;
  content: string;
  summary: string | null;
  createdAt: string;
  agent: { name: string; role: string };
  task: { taskName: string };
}

interface RecentOutputsProps {
  outputs: Output[];
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

export function RecentOutputs({ outputs }: RecentOutputsProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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

  return (
    <div className="space-y-3 sm:space-y-4">
      {(outputs ?? []).map((output, index) => {
        const borderColor = agentColors[output?.agent?.name ?? ""] ?? "border-l-gray-500";
        const isExpanded = expandedIds.has(output?.id ?? "");
        const hasContent = output?.content && output.content.length > 200;

        return (
          <motion.div
            key={output?.id ?? index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`bg-slate-800/50 rounded-lg sm:rounded-xl border border-white/5 border-l-4 ${borderColor} overflow-hidden`}
          >
            <div className="p-3 sm:p-4">
              {/* Mobile: Stack agent info and time */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2 sm:mb-3">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden ring-2 ring-white/10 flex-shrink-0">
                    <Image
                      src={agentAvatars[output?.agent?.name ?? ""] ?? "/avatars/rose.png"}
                      alt={`${output?.agent?.name ?? "Agent"} avatar`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 32px, 40px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="font-medium text-white text-sm sm:text-base">
                        {output?.agent?.name ?? "Unknown"}
                        <span className="ml-1">{agentEmojis[output?.agent?.name ?? ""] ?? ""}</span>
                      </span>
                      <span className="text-gray-500 hidden sm:inline mx-1">•</span>
                      <span className="text-xs sm:text-sm text-gray-400 truncate">{output?.task?.taskName ?? "Unknown Task"}</span>
                    </div>
                  </div>
                </div>
                <span className="text-[10px] sm:text-xs text-gray-500 flex-shrink-0">
                  {output?.createdAt
                    ? formatDistanceToNow(new Date(output.createdAt), { addSuffix: true })
                    : "Unknown"}
                </span>
              </div>

              {/* Summary/Preview */}
              {!isExpanded && (
                <div className="flex items-start gap-2 sm:gap-3">
                  <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 mt-0.5 sm:mt-1 flex-shrink-0" />
                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed line-clamp-2 sm:line-clamp-3">
                    {stripMarkdown(output?.summary ?? output?.content ?? "", 150) || "No content available"}
                  </p>
                </div>
              )}

              {/* Expanded Content with Markdown */}
              <AnimatePresence>
                {isExpanded && output?.content && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-2 sm:mt-3 bg-slate-900/50 rounded-md sm:rounded-lg p-3 sm:p-4 max-h-[400px] sm:max-h-[500px] overflow-y-auto"
                  >
                    <MarkdownRenderer content={output.content} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Expand/Collapse Button */}
              {hasContent && (
                <button
                  onClick={() => toggleExpand(output?.id ?? "")}
                  className="mt-2 sm:mt-3 flex items-center gap-1 text-xs sm:text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Read full report
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        );
      })}

      {(outputs ?? []).length === 0 && (
        <div className="text-center py-6 sm:py-8 text-gray-500 text-sm">No recent outputs</div>
      )}
    </div>
  );
}
