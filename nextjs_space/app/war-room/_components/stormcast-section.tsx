"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CloudLightning,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  AlertTriangle,
  Shield,
  Tag,
  Play,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { MarkdownRenderer } from "@/components/dashboard/markdown-renderer";

interface StormcastEpisode {
  id: string;
  episodeDate: string;
  title: string;
  audioUrl: string | null;
  duration: string | null;
  description: string | null;
  summary: string | null;
  topics: string[];
  processedAt: string;
}

export function StormcastSection() {
  const [episodes, setEpisodes] = useState<StormcastEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchEpisodes = async () => {
      try {
        const res = await fetch("/api/stormcast?limit=5");
        if (res.ok) {
          const data = await res.json();
          setEpisodes(data);
        }
      } catch (error) {
        console.error("Error fetching Stormcast episodes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEpisodes();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="rounded-2xl bg-gradient-to-br from-yellow-900/30 via-slate-800/60 to-orange-900/20 border border-yellow-500/30 overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-yellow-500/20 bg-yellow-500/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-yellow-500/20">
            <CloudLightning className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-yellow-400" />
              SANS ISC Stormcast
            </h3>
            <p className="text-xs text-gray-400">Internet Storm Center • Daily Threat Intel</p>
          </div>
          <a
            href="https://isc.sans.edu/podcast.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1 transition-colors"
          >
            SANS ISC <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Sarah summarizes each morning at 08:30 ET
        </p>
      </div>

      {/* Episodes List */}
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-2">
              <CloudLightning className="w-8 h-8 text-yellow-500 animate-pulse" />
              <p className="text-sm text-gray-500">Loading episodes...</p>
            </div>
          </div>
        ) : episodes.length === 0 ? (
          <div className="text-center py-8">
            <CloudLightning className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No episodes processed yet</p>
            <p className="text-gray-600 text-xs mt-1">
              Sarah will fetch the latest at 08:30 ET
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {episodes.map((episode, index) => (
              <motion.div
                key={episode.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`rounded-xl border transition-all ${
                  index === 0
                    ? "bg-yellow-500/10 border-yellow-500/30"
                    : "bg-slate-800/50 border-white/5 hover:border-yellow-500/20"
                }`}
              >
                {/* Episode Header */}
                <div
                  className="p-3 cursor-pointer"
                  onClick={() => toggleExpand(episode.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(episode.episodeDate), "MMM d, yyyy")}
                        </span>
                        {episode.duration && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            {episode.duration}
                          </span>
                        )}
                        {index === 0 && (
                          <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                            LATEST
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-medium text-white truncate">
                        {episode.title}
                      </h4>
                      {/* Topic tags */}
                      {episode.topics && episode.topics.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 flex-wrap">
                          {episode.topics.slice(0, 3).map((topic, i) => (
                            <span
                              key={i}
                              className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-500/20 px-2 py-0.5 rounded"
                            >
                              <Tag className="w-2.5 h-2.5" />
                              {topic.length > 25 ? topic.slice(0, 25) + "..." : topic}
                            </span>
                          ))}
                          {episode.topics.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{episode.topics.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <button className="p-1 text-gray-500 hover:text-gray-300">
                      {expandedId === episode.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Content */}
                <AnimatePresence>
                  {expandedId === episode.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 pt-0 border-t border-white/5">
                        {/* Summary */}
                        {episode.summary && (
                          <div className="mt-3 p-3 rounded-lg bg-slate-900/50 border border-white/5">
                            <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-yellow-400" />
                              Sarah&apos;s Summary
                            </p>
                            <div className="prose prose-sm prose-invert max-w-none">
                              <MarkdownRenderer content={episode.summary} />
                            </div>
                          </div>
                        )}

                        {/* Audio Link */}
                        {episode.audioUrl && (
                          <div className="mt-3 flex items-center gap-2">
                            <a
                              href={episode.audioUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-xs text-yellow-400 hover:text-yellow-300 bg-yellow-500/10 px-3 py-2 rounded-lg transition-colors"
                            >
                              <Play className="w-4 h-4" />
                              Listen to Episode
                            </a>
                          </div>
                        )}

                        {/* Processed time */}
                        <p className="text-xs text-gray-600 mt-3">
                          Processed {formatDistanceToNow(new Date(episode.processedAt))} ago
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-yellow-500/10 bg-yellow-500/5">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Daily threat intel from SANS Internet Storm Center
          </p>
          <a
            href="https://isc.sans.edu/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
          >
            isc.sans.edu <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </motion.div>
  );
}
