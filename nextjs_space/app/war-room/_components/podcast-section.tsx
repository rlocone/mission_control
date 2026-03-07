"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Headphones,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Calendar,
  Hash,
  CheckCircle,
  Radio,
  Download,
} from "lucide-react";
import { format } from "date-fns";

interface PodcastEpisode {
  id: string;
  episodeNumber: number;
  title: string;
  airDate: string;
  audioUrl: string | null;
  showNotesUrl: string | null;
  showNotesPdfUrl: string | null;
  summary: string | null;
  twitVerified: boolean;
  grcVerified: boolean;
  processedAt: string;
}

export function PodcastSection() {
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchEpisodes = async () => {
      try {
        const res = await fetch("/api/podcasts?limit=5");
        if (res.ok) {
          const data = await res.json();
          setEpisodes(data);
        }
      } catch (error) {
        console.error("Error fetching podcast episodes:", error);
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
      transition={{ delay: 0.5 }}
      className="rounded-2xl bg-gradient-to-br from-purple-900/30 via-slate-800/60 to-indigo-900/20 border border-purple-500/30 overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-purple-500/20 bg-purple-500/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <Headphones className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-purple-400" />
              Security Now!
            </h3>
            <p className="text-xs text-gray-400">TWiT Network • Steve Gibson</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://twit.tv/shows/security-now"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
            >
              TWiT <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-gray-600">|</span>
            <a
              href="https://www.grc.com/securitynow.htm"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
            >
              GRC <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Sarah reviews every Wednesday morning after Tuesday&apos;s live show
        </p>
      </div>

      {/* Episodes List */}
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-2">
              <Headphones className="w-8 h-8 text-purple-500 animate-pulse" />
              <p className="text-sm text-gray-500">Loading episodes...</p>
            </div>
          </div>
        ) : episodes.length === 0 ? (
          <div className="text-center py-8">
            <Headphones className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No episodes processed yet</p>
            <p className="text-gray-600 text-xs mt-1">
              Sarah will fetch the latest on Wednesday
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
                    ? "bg-purple-500/10 border-purple-500/30"
                    : "bg-slate-800/50 border-white/5 hover:border-purple-500/20"
                }`}
              >
                {/* Episode Header */}
                <div
                  className="p-3 cursor-pointer"
                  onClick={() => toggleExpand(episode.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="flex items-center gap-1 text-xs font-mono text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded">
                          <Hash className="w-3 h-3" />
                          {episode.episodeNumber}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(episode.airDate), "MMM d, yyyy")}
                        </span>
                        {index === 0 && (
                          <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                            LATEST
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-medium text-white truncate">
                        {episode.title}
                      </h4>
                      {/* Verification badges */}
                      <div className="flex items-center gap-2 mt-1">
                        {episode.twitVerified && (
                          <span className="flex items-center gap-1 text-xs text-purple-400">
                            <CheckCircle className="w-3 h-3" /> TWiT
                          </span>
                        )}
                        {episode.grcVerified && (
                          <span className="flex items-center gap-1 text-xs text-cyan-400">
                            <CheckCircle className="w-3 h-3" /> GRC
                          </span>
                        )}
                      </div>
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
                            <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider font-semibold">
                              Sarah&apos;s Summary
                            </p>
                            <p className="text-sm text-gray-300 whitespace-pre-wrap">
                              {episode.summary}
                            </p>
                          </div>
                        )}

                        {/* Action Links */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {episode.audioUrl && (
                            <a
                              href={episode.audioUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 text-xs font-medium transition-colors"
                            >
                              <Headphones className="w-3.5 h-3.5" />
                              Listen
                            </a>
                          )}
                          {episode.showNotesUrl && (
                            <a
                              href={episode.showNotesUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 text-xs font-medium transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Show Notes
                            </a>
                          )}
                          {episode.showNotesPdfUrl && (
                            <a
                              href={episode.showNotesPdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 text-xs font-medium transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              PDF Notes
                            </a>
                          )}
                        </div>
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
      <div className="px-4 py-2 border-t border-purple-500/10 bg-purple-500/5">
        <p className="text-xs text-gray-500 text-center">
          Episodes air live Tuesdays • Sarah processes Wednesdays 08:00 ET
        </p>
      </div>
    </motion.div>
  );
}
