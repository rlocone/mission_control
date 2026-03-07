"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  ChevronDown,
  ChevronUp,
  Maximize2,
  X,
  ExternalLink,
  Zap,
  Server,
  Bug,
  Lock,
  Rss,
  Share2,
  Facebook,
  Twitter,
  Linkedin,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow, format, differenceInDays } from "date-fns";
import { MarkdownRenderer } from "@/components/dashboard/markdown-renderer";
import Image from "next/image";
import { PodcastSection } from "./podcast-section";
import { stripMarkdown } from "@/lib/utils";
import { StormcastSection } from "./stormcast-section";

/**
 * Calculate the next Microsoft Patch Tuesday (2nd Tuesday of month)
 */
function getNextPatchTuesday(): { date: Date; daysRemaining: number } {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  // Helper to get 2nd Tuesday of a given month
  const getSecondTuesday = (year: number, month: number): Date => {
    const firstDay = new Date(year, month, 1);
    const dayOfWeek = firstDay.getDay(); // 0 = Sunday, 2 = Tuesday
    // Calculate days until first Tuesday
    const daysUntilTuesday = (2 - dayOfWeek + 7) % 7;
    const firstTuesday = 1 + daysUntilTuesday;
    // Second Tuesday is 7 days after first Tuesday
    const secondTuesday = firstTuesday + 7;
    return new Date(year, month, secondTuesday);
  };
  
  // Check this month's Patch Tuesday
  let patchTuesday = getSecondTuesday(currentYear, currentMonth);
  
  // If today is past this month's Patch Tuesday, get next month's
  if (now > patchTuesday) {
    if (currentMonth === 11) {
      // December -> January next year
      patchTuesday = getSecondTuesday(currentYear + 1, 0);
    } else {
      patchTuesday = getSecondTuesday(currentYear, currentMonth + 1);
    }
  }
  
  // Calculate days remaining (use start of day for accurate count)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const patchDayStart = new Date(patchTuesday.getFullYear(), patchTuesday.getMonth(), patchTuesday.getDate());
  const daysRemaining = differenceInDays(patchDayStart, todayStart);
  
  return { date: patchTuesday, daysRemaining };
}

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
  role: string;
  appId: string;
  status: string;
  completedTasks: number;
  tasks?: Array<{ id: string; status: string }>;
}

export function WarRoomContent() {
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [sarah, setSarah] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [fullscreenOutput, setFullscreenOutput] = useState<Output | null>(null);
  const [patchTuesday, setPatchTuesday] = useState<{ date: Date; daysRemaining: number } | null>(null);
  
  // Initialize Patch Tuesday on mount (client-side only to avoid hydration mismatch)
  useEffect(() => {
    setPatchTuesday(getNextPatchTuesday());
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Sarah's agent data
        const agentsRes = await fetch("/api/agents");
        const agentsData = await agentsRes?.json();
        const sarahAgent = (agentsData ?? []).find((a: Agent) => a?.name === "Sarah");
        setSarah(sarahAgent ?? null);

        // Fetch Sarah's outputs
        if (sarahAgent) {
          const outputsRes = await fetch(`/api/outputs?agentId=${sarahAgent.id}&limit=10`);
          const outputsData = await outputsRes?.json();
          setOutputs(outputsData ?? []);
        }
      } catch (error) {
        console.error("Error fetching War Room data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

  const inProgressTasks = (sarah?.tasks ?? []).filter((t) => t?.status === "IN_PROGRESS")?.length ?? 0;
  const pendingTasks = (sarah?.tasks ?? []).filter((t) => t?.status === "PENDING")?.length ?? 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Shield className="w-12 h-12 text-red-500 animate-pulse" />
          <p className="text-gray-400">Initializing War Room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* War Room Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-900/30 via-slate-900 to-orange-900/20 border border-red-500/20 p-4 sm:p-6"
      >
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl" />
          {/* Grid overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,0,0,0.03)_1px,transparent_1px)] bg-[size:20px_20px]" />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
          {/* Sarah's Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden ring-2 ring-red-500/50 shadow-lg shadow-red-500/20">
              <Image
                src="/avatars/sarah.png"
                alt="Sarah avatar"
                width={96}
                height={96}
                className="object-cover"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 p-1.5 rounded-lg bg-slate-900 border border-red-500/50">
              <Shield className="w-4 h-4 text-red-400" />
            </div>
          </div>

          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">🔐 The War Room</h1>
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                CYBERSECURITY OPS
              </span>
            </div>
            <p className="text-gray-400 text-sm sm:text-base mb-4 max-w-2xl">
              Dark-mode, high-signal threat intelligence command center. Sarah monitors global cyber threats,
              tracks vendor advisories, and surfaces zero-days with daily briefings.
            </p>

            {/* Status indicators */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-6">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${sarah?.status === "ACTIVE" ? "bg-emerald-500 animate-pulse" : "bg-gray-500"}`} />
                <span className={`text-sm ${sarah?.status === "ACTIVE" ? "text-emerald-400" : "text-gray-500"}`}>
                  {sarah?.status ?? "OFFLINE"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>{sarah?.completedTasks ?? 0} Briefings</span>
              </div>
              {inProgressTasks > 0 && (
                <div className="flex items-center gap-2 text-sm text-amber-400">
                  <Activity className="w-4 h-4" />
                  <span>{inProgressTasks} In Progress</span>
                </div>
              )}
              {pendingTasks > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>{pendingTasks} Pending</span>
                </div>
              )}
            </div>
            
            {/* Subscribe & Share */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-4 pt-4 border-t border-red-500/20">
              <span className="text-xs text-gray-500 mr-2">Subscribe:</span>
              <Link
                href="/api/feeds/war-room.xml"
                target="_blank"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-xs font-medium transition-colors"
                title="RSS Feed"
              >
                <Rss className="w-3.5 h-3.5" />
                RSS
              </Link>
              <Link
                href="/api/feeds/sarah.xml"
                target="_blank"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-medium transition-colors"
                title="Sarah&apos;s Feed"
              >
                <Rss className="w-3.5 h-3.5" />
                Sarah
              </Link>
              
              <span className="text-xs text-gray-600 mx-1">|</span>
              <span className="text-xs text-gray-500 mr-1">Share:</span>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://rose.abacusai.app/war-room')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-[#1877F2]/20 hover:bg-[#1877F2]/30 transition-colors"
                title="Share on Facebook"
              >
                <Facebook className="w-3.5 h-3.5 text-[#1877F2]" />
              </a>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('🔐 Mission Control War Room - Tactical Cyber Intelligence')}&url=${encodeURIComponent('https://rose.abacusai.app/war-room')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-[#1DA1F2]/20 hover:bg-[#1DA1F2]/30 transition-colors"
                title="Share on X (Twitter)"
              >
                <Twitter className="w-3.5 h-3.5 text-[#1DA1F2]" />
              </a>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://rose.abacusai.app/war-room')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-[#0A66C2]/20 hover:bg-[#0A66C2]/30 transition-colors"
                title="Share on LinkedIn"
              >
                <Linkedin className="w-3.5 h-3.5 text-[#0A66C2]" />
              </a>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats + Patch Tuesday Row */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,auto] gap-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[
            { icon: Bug, label: "CVEs Tracked", value: "24h", color: "text-red-400", bg: "bg-red-500/10", isLinks: false },
            { icon: AlertTriangle, label: "High Severity", value: "CVSS 8+", color: "text-amber-400", bg: "bg-amber-500/10", isLinks: false },
            { icon: Server, label: "Vendors Monitored", value: "4", color: "text-cyan-400", bg: "bg-cyan-500/10", isLinks: false },
            { icon: Lock, label: "Sources", value: "", color: "text-purple-400", bg: "bg-purple-500/10", isLinks: true },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-4 rounded-xl bg-slate-800/50 border border-white/5"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                  {stat.isLinks ? (
                    <div className="flex flex-wrap gap-1">
                      <a href="https://nvd.nist.gov/" target="_blank" rel="noopener noreferrer" 
                         className="text-sm font-semibold text-purple-400 hover:text-purple-300 underline underline-offset-2">
                        NVD
                      </a>
                      <span className="text-purple-400/50">,</span>
                      <a href="https://attack.mitre.org/" target="_blank" rel="noopener noreferrer"
                         className="text-sm font-semibold text-purple-400 hover:text-purple-300 underline underline-offset-2">
                        MITRE
                      </a>
                      <span className="text-purple-400/50">,</span>
                      <a href="https://www.cisa.gov/known-exploited-vulnerabilities-catalog" target="_blank" rel="noopener noreferrer"
                         className="text-sm font-semibold text-purple-400 hover:text-purple-300 underline underline-offset-2">
                        CISA
                      </a>
                    </div>
                  ) : (
                    <p className={`font-semibold ${stat.color}`}>{stat.value}</p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Microsoft Patch Tuesday Countdown */}
        {patchTuesday && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-stretch"
          >
            <div className="flex rounded-xl bg-gradient-to-br from-blue-900/40 via-slate-800/60 to-cyan-900/30 border border-blue-500/30 overflow-hidden min-w-[280px]">
              {/* Main Info */}
              <div className="flex-1 p-4 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
                  </svg>
                  <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Patch Tuesday</span>
                </div>
                <p className="text-white font-semibold text-lg">
                  {format(patchTuesday.date, "MMMM d, yyyy")}
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  {format(patchTuesday.date, "EEEE")}
                </p>
              </div>
              
              {/* Days Remaining */}
              <div className={`w-24 flex flex-col items-center justify-center border-l border-blue-500/20 ${
                patchTuesday.daysRemaining <= 3 
                  ? "bg-red-500/20" 
                  : patchTuesday.daysRemaining <= 7 
                    ? "bg-amber-500/20" 
                    : "bg-blue-500/10"
              }`}>
                <span className={`text-3xl font-bold ${
                  patchTuesday.daysRemaining <= 3 
                    ? "text-red-400" 
                    : patchTuesday.daysRemaining <= 7 
                      ? "text-amber-400" 
                      : "text-blue-400"
                }`}>
                  {patchTuesday.daysRemaining}
                </span>
                <span className="text-xs text-gray-400 uppercase tracking-wide">
                  {patchTuesday.daysRemaining === 1 ? "day" : "days"}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Zero-Day Tracker Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-2xl bg-slate-800/50 border border-white/5 overflow-hidden"
      >
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-white">Zero-Day Exploit Tracker</h2>
            <span className="ml-auto text-xs text-gray-500">Exploited in the wild | Multi-source verified</span>
          </div>
        </div>
        
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 2025 Card */}
            <div className="rounded-xl bg-gradient-to-br from-red-900/30 to-slate-800/80 border border-red-500/30 p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-bold text-white">2025</span>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                  COMPLETE
                </span>
              </div>
              
              <div className="space-y-3">
                {/* Microsoft */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
                    </svg>
                    <span className="text-sm text-gray-300">Microsoft</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-red-400">25</span>
                    <span className="text-xs text-gray-500 ml-1">Windows</span>
                  </div>
                </div>
                
                {/* Google */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span className="text-sm text-gray-300">Google</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-amber-400">8</span>
                    <span className="text-xs text-gray-500 ml-1">Chrome</span>
                    <span className="text-xs text-gray-600 mx-1">·</span>
                    <span className="text-sm font-semibold text-amber-400">3</span>
                    <span className="text-xs text-gray-500 ml-1">Android</span>
                  </div>
                </div>
                
                {/* Apple */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-300" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    <span className="text-sm text-gray-300">Apple</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-cyan-400">5</span>
                    <span className="text-xs text-gray-500 ml-1">iOS</span>
                    <span className="text-xs text-gray-600 mx-1">·</span>
                    <span className="text-sm font-semibold text-cyan-400">4</span>
                    <span className="text-xs text-gray-500 ml-1">macOS</span>
                  </div>
                </div>
                
                {/* Linux Kernel */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 00-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139zm.529 3.405h.013c.213 0 .396.062.584.198.19.135.33.332.438.533.105.259.158.459.166.724 0-.02.006-.04.006-.06v.105a.086.086 0 01-.004-.021l-.004-.024a1.807 1.807 0 01-.15.706.953.953 0 01-.213.335.71.71 0 00-.088-.042c-.104-.045-.198-.064-.284-.133a1.312 1.312 0 00-.22-.066c.05-.06.146-.133.183-.198.053-.128.082-.264.088-.402v-.02a1.21 1.21 0 00-.061-.4c-.045-.134-.101-.2-.183-.333-.084-.066-.167-.132-.267-.132h-.016c-.093 0-.176.03-.262.132a.8.8 0 00-.205.334 1.18 1.18 0 00-.09.4v.019c.002.089.008.179.02.267-.193-.067-.438-.135-.607-.202a1.635 1.635 0 01-.018-.2v-.02a1.772 1.772 0 01.15-.768c.082-.22.232-.406.43-.533a.985.985 0 01.594-.2zm-2.962.059h.036c.142 0 .27.048.399.135.146.129.264.288.344.465.09.199.14.4.153.667v.004c.007.134.006.2-.002.266v.08c-.03.007-.056.018-.083.024-.152.055-.274.135-.393.2.012-.09.013-.18.003-.267v-.015c-.012-.133-.04-.2-.082-.333a.613.613 0 00-.166-.267.248.248 0 00-.183-.064h-.021c-.071.006-.13.04-.186.132a.552.552 0 00-.12.27.944.944 0 00-.023.33v.015c.012.135.037.2.08.334.046.134.098.2.166.268.01.009.02.018.034.024-.07.057-.117.07-.176.136a.304.304 0 01-.131.068 2.62 2.62 0 01-.275-.402 1.772 1.772 0 01-.155-.667 1.759 1.759 0 01.08-.668 1.43 1.43 0 01.283-.535c.128-.133.26-.2.418-.2zm1.37 1.706c.332 0 .733.065 1.216.399.293.2.523.269 1.052.468h.003c.255.136.405.266.478.399v-.131a.571.571 0 01.016.47c-.123.31-.516.643-1.063.842v.002c-.268.135-.501.333-.775.465-.276.135-.588.292-1.012.267a1.139 1.139 0 01-.448-.067 3.566 3.566 0 01-.322-.198c-.195-.135-.363-.332-.612-.465v-.005h-.005c-.4-.246-.616-.512-.686-.71-.07-.268-.005-.47.193-.6.224-.135.38-.271.483-.336.104-.074.143-.102.176-.131h.002v-.003c.169-.202.436-.47.839-.601.139-.036.294-.065.466-.065zm2.8 2.142c.358 1.417 1.196 3.475 1.735 4.473.286.534.855 1.659 1.102 3.024.156-.005.33.018.513.064.646-1.671-.546-3.467-1.089-3.966-.22-.2-.232-.335-.123-.335.59.534 1.365 1.572 1.646 2.757.13.535.16 1.104.021 1.67.067.028.135.06.205.067 1.032.534 1.413.938 1.23 1.537v-.002c-.06-.135-.12-.2-.184-.268-.257-.135-.349-.203-.697-.268 0 0 .114-.07.247-.135.133-.066.267-.182.06-.332-.166-.134-.274-.135-.484-.198-.21-.062-.479-.198-.758-.468C20.597 15.7 19.693 14.6 18.9 14.133c-.072-.043-.14-.07-.206-.1-.183.467-.415.936-.713 1.336-.038.058-.08.1-.122.138a2.16 2.16 0 01-.15-.137 1.763 1.763 0 00-.571-.401c.166-.067.335-.135.465-.268.193-.198.328-.466.401-.8.073-.333.107-.667.107-.999v-.468c.166-.065.332-.2.166-.465-.093-.122-.26-.203-.526-.271zm-5.254 1.303a.218.218 0 01.067.005c.152.045.246.203.295.4.05.198.055.4.01.602-.04.199-.11.395-.2.536-.09.2-.2.336-.31.401a.264.264 0 01-.124.036.273.273 0 01-.141-.029c-.152-.045-.247-.2-.296-.4-.05-.198-.055-.4-.01-.601.04-.2.11-.395.197-.537.09-.2.2-.335.31-.4a.26.26 0 01.166-.011h.036z"/>
                    </svg>
                    <span className="text-sm text-gray-300">Linux Kernel</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-yellow-400">7</span>
                    <span className="text-xs text-gray-500 ml-1">KEV</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-red-500/20 text-center">
                <span className="text-2xl font-bold text-red-400">52</span>
                <span className="text-xs text-gray-500 ml-2">Total Exploited</span>
              </div>
            </div>

            {/* 2026 YTD Card */}
            <div className="rounded-xl bg-gradient-to-br from-amber-900/30 to-slate-800/80 border border-amber-500/30 p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-bold text-white">2026</span>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                  YTD
                </span>
              </div>
              
              <div className="space-y-3">
                {/* Microsoft */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
                    </svg>
                    <span className="text-sm text-gray-300">Microsoft</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-red-400">6</span>
                    <span className="text-xs text-gray-500 ml-1">Windows</span>
                  </div>
                </div>
                
                {/* Google */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span className="text-sm text-gray-300">Google</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-amber-400">2</span>
                    <span className="text-xs text-gray-500 ml-1">Chrome</span>
                    <span className="text-xs text-gray-600 mx-1">·</span>
                    <span className="text-sm font-semibold text-amber-400">1</span>
                    <span className="text-xs text-gray-500 ml-1">Android</span>
                  </div>
                </div>
                
                {/* Apple */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-300" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    <span className="text-sm text-gray-300">Apple</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-cyan-400">2</span>
                    <span className="text-xs text-gray-500 ml-1">iOS</span>
                    <span className="text-xs text-gray-600 mx-1">·</span>
                    <span className="text-sm font-semibold text-cyan-400">1</span>
                    <span className="text-xs text-gray-500 ml-1">macOS</span>
                  </div>
                </div>
                
                {/* Linux Kernel */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 00-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139zm.529 3.405h.013c.213 0 .396.062.584.198.19.135.33.332.438.533.105.259.158.459.166.724 0-.02.006-.04.006-.06v.105a.086.086 0 01-.004-.021l-.004-.024a1.807 1.807 0 01-.15.706.953.953 0 01-.213.335.71.71 0 00-.088-.042c-.104-.045-.198-.064-.284-.133a1.312 1.312 0 00-.22-.066c.05-.06.146-.133.183-.198.053-.128.082-.264.088-.402v-.02a1.21 1.21 0 00-.061-.4c-.045-.134-.101-.2-.183-.333-.084-.066-.167-.132-.267-.132h-.016c-.093 0-.176.03-.262.132a.8.8 0 00-.205.334 1.18 1.18 0 00-.09.4v.019c.002.089.008.179.02.267-.193-.067-.438-.135-.607-.202a1.635 1.635 0 01-.018-.2v-.02a1.772 1.772 0 01.15-.768c.082-.22.232-.406.43-.533a.985.985 0 01.594-.2zm-2.962.059h.036c.142 0 .27.048.399.135.146.129.264.288.344.465.09.199.14.4.153.667v.004c.007.134.006.2-.002.266v.08c-.03.007-.056.018-.083.024-.152.055-.274.135-.393.2.012-.09.013-.18.003-.267v-.015c-.012-.133-.04-.2-.082-.333a.613.613 0 00-.166-.267.248.248 0 00-.183-.064h-.021c-.071.006-.13.04-.186.132a.552.552 0 00-.12.27.944.944 0 00-.023.33v.015c.012.135.037.2.08.334.046.134.098.2.166.268.01.009.02.018.034.024-.07.057-.117.07-.176.136a.304.304 0 01-.131.068 2.62 2.62 0 01-.275-.402 1.772 1.772 0 01-.155-.667 1.759 1.759 0 01.08-.668 1.43 1.43 0 01.283-.535c.128-.133.26-.2.418-.2zm1.37 1.706c.332 0 .733.065 1.216.399.293.2.523.269 1.052.468h.003c.255.136.405.266.478.399v-.131a.571.571 0 01.016.47c-.123.31-.516.643-1.063.842v.002c-.268.135-.501.333-.775.465-.276.135-.588.292-1.012.267a1.139 1.139 0 01-.448-.067 3.566 3.566 0 01-.322-.198c-.195-.135-.363-.332-.612-.465v-.005h-.005c-.4-.246-.616-.512-.686-.71-.07-.268-.005-.47.193-.6.224-.135.38-.271.483-.336.104-.074.143-.102.176-.131h.002v-.003c.169-.202.436-.47.839-.601.139-.036.294-.065.466-.065zm2.8 2.142c.358 1.417 1.196 3.475 1.735 4.473.286.534.855 1.659 1.102 3.024.156-.005.33.018.513.064.646-1.671-.546-3.467-1.089-3.966-.22-.2-.232-.335-.123-.335.59.534 1.365 1.572 1.646 2.757.13.535.16 1.104.021 1.67.067.028.135.06.205.067 1.032.534 1.413.938 1.23 1.537v-.002c-.06-.135-.12-.2-.184-.268-.257-.135-.349-.203-.697-.268 0 0 .114-.07.247-.135.133-.066.267-.182.06-.332-.166-.134-.274-.135-.484-.198-.21-.062-.479-.198-.758-.468C20.597 15.7 19.693 14.6 18.9 14.133c-.072-.043-.14-.07-.206-.1-.183.467-.415.936-.713 1.336-.038.058-.08.1-.122.138a2.16 2.16 0 01-.15-.137 1.763 1.763 0 00-.571-.401c.166-.067.335-.135.465-.268.193-.198.328-.466.401-.8.073-.333.107-.667.107-.999v-.468c.166-.065.332-.2.166-.465-.093-.122-.26-.203-.526-.271zm-5.254 1.303a.218.218 0 01.067.005c.152.045.246.203.295.4.05.198.055.4.01.602-.04.199-.11.395-.2.536-.09.2-.2.336-.31.401a.264.264 0 01-.124.036.273.273 0 01-.141-.029c-.152-.045-.247-.2-.296-.4-.05-.198-.055-.4-.01-.601.04-.2.11-.395.197-.537.09-.2.2-.335.31-.4a.26.26 0 01.166-.011h.036z"/>
                    </svg>
                    <span className="text-sm text-gray-300">Linux Kernel</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-yellow-400">2</span>
                    <span className="text-xs text-gray-500 ml-1">KEV</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-amber-500/20 text-center">
                <span className="text-2xl font-bold text-amber-400">14</span>
                <span className="text-xs text-gray-500 ml-2">Total YTD</span>
              </div>
            </div>

            {/* 2027 Placeholder Card */}
            <div className="rounded-xl bg-gradient-to-br from-slate-800/80 to-slate-900/90 border border-white/10 p-4 opacity-60">
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-bold text-gray-400">2027</span>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-700/50 text-gray-500 border border-white/10">
                  PENDING
                </span>
              </div>
              
              <div className="space-y-3">
                {/* Microsoft */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
                    </svg>
                    <span className="text-sm text-gray-500">Microsoft</span>
                  </div>
                  <span className="text-lg font-bold text-gray-600">—</span>
                </div>
                
                {/* Google */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 opacity-40" viewBox="0 0 24 24">
                      <path fill="#666" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#666" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#666" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#666" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span className="text-sm text-gray-500">Google</span>
                  </div>
                  <span className="text-lg font-bold text-gray-600">—</span>
                </div>
                
                {/* Apple */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    <span className="text-sm text-gray-500">Apple</span>
                  </div>
                  <span className="text-lg font-bold text-gray-600">—</span>
                </div>
                
                {/* Linux Kernel */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 00-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139zm.529 3.405h.013c.213 0 .396.062.584.198.19.135.33.332.438.533.105.259.158.459.166.724 0-.02.006-.04.006-.06v.105a.086.086 0 01-.004-.021l-.004-.024a1.807 1.807 0 01-.15.706.953.953 0 01-.213.335.71.71 0 00-.088-.042c-.104-.045-.198-.064-.284-.133a1.312 1.312 0 00-.22-.066c.05-.06.146-.133.183-.198.053-.128.082-.264.088-.402v-.02a1.21 1.21 0 00-.061-.4c-.045-.134-.101-.2-.183-.333-.084-.066-.167-.132-.267-.132h-.016c-.093 0-.176.03-.262.132a.8.8 0 00-.205.334 1.18 1.18 0 00-.09.4v.019c.002.089.008.179.02.267-.193-.067-.438-.135-.607-.202a1.635 1.635 0 01-.018-.2v-.02a1.772 1.772 0 01.15-.768c.082-.22.232-.406.43-.533a.985.985 0 01.594-.2zm-2.962.059h.036c.142 0 .27.048.399.135.146.129.264.288.344.465.09.199.14.4.153.667v.004c.007.134.006.2-.002.266v.08c-.03.007-.056.018-.083.024-.152.055-.274.135-.393.2.012-.09.013-.18.003-.267v-.015c-.012-.133-.04-.2-.082-.333a.613.613 0 00-.166-.267.248.248 0 00-.183-.064h-.021c-.071.006-.13.04-.186.132a.552.552 0 00-.12.27.944.944 0 00-.023.33v.015c.012.135.037.2.08.334.046.134.098.2.166.268.01.009.02.018.034.024-.07.057-.117.07-.176.136a.304.304 0 01-.131.068 2.62 2.62 0 01-.275-.402 1.772 1.772 0 01-.155-.667 1.759 1.759 0 01.08-.668 1.43 1.43 0 01.283-.535c.128-.133.26-.2.418-.2zm1.37 1.706c.332 0 .733.065 1.216.399.293.2.523.269 1.052.468h.003c.255.136.405.266.478.399v-.131a.571.571 0 01.016.47c-.123.31-.516.643-1.063.842v.002c-.268.135-.501.333-.775.465-.276.135-.588.292-1.012.267a1.139 1.139 0 01-.448-.067 3.566 3.566 0 01-.322-.198c-.195-.135-.363-.332-.612-.465v-.005h-.005c-.4-.246-.616-.512-.686-.71-.07-.268-.005-.47.193-.6.224-.135.38-.271.483-.336.104-.074.143-.102.176-.131h.002v-.003c.169-.202.436-.47.839-.601.139-.036.294-.065.466-.065zm2.8 2.142c.358 1.417 1.196 3.475 1.735 4.473.286.534.855 1.659 1.102 3.024.156-.005.33.018.513.064.646-1.671-.546-3.467-1.089-3.966-.22-.2-.232-.335-.123-.335.59.534 1.365 1.572 1.646 2.757.13.535.16 1.104.021 1.67.067.028.135.06.205.067 1.032.534 1.413.938 1.23 1.537v-.002c-.06-.135-.12-.2-.184-.268-.257-.135-.349-.203-.697-.268 0 0 .114-.07.247-.135.133-.066.267-.182.06-.332-.166-.134-.274-.135-.484-.198-.21-.062-.479-.198-.758-.468C20.597 15.7 19.693 14.6 18.9 14.133c-.072-.043-.14-.07-.206-.1-.183.467-.415.936-.713 1.336-.038.058-.08.1-.122.138a2.16 2.16 0 01-.15-.137 1.763 1.763 0 00-.571-.401c.166-.067.335-.135.465-.268.193-.198.328-.466.401-.8.073-.333.107-.667.107-.999v-.468c.166-.065.332-.2.166-.465-.093-.122-.26-.203-.526-.271zm-5.254 1.303a.218.218 0 01.067.005c.152.045.246.203.295.4.05.198.055.4.01.602-.04.199-.11.395-.2.536-.09.2-.2.336-.31.401a.264.264 0 01-.124.036.273.273 0 01-.141-.029c-.152-.045-.247-.2-.296-.4-.05-.198-.055-.4-.01-.601.04-.2.11-.395.197-.537.09-.2.2-.335.31-.4a.26.26 0 01.166-.011h.036z"/>
                    </svg>
                    <span className="text-sm text-gray-500">Linux Kernel</span>
                  </div>
                  <span className="text-lg font-bold text-gray-600">—</span>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-white/10 text-center">
                <span className="text-2xl font-bold text-gray-600">—</span>
                <span className="text-xs text-gray-600 ml-2">Awaiting Data</span>
              </div>
            </div>
          </div>
          
          {/* Sources footnote */}
          <div className="mt-4 pt-3 border-t border-white/5 text-center">
            <p className="text-xs text-gray-500">
              Sources:{" "}
              <a href="https://www.cisa.gov/known-exploited-vulnerabilities-catalog" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white underline">CISA KEV</a>,{" "}
              <a href="https://nvd.nist.gov/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white underline">NVD</a>,{" "}
              <a href="https://googleprojectzero.blogspot.com/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white underline">Google Project Zero</a>,{" "}
              <a href="https://threatresearch.ext.hp.com/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white underline">HP ThreatResearch</a>,{" "}
              <a href="https://ciq.co/security/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white underline">CIQ</a>,{" "}
              <a href="https://vulncheck.com/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white underline">VulnCheck</a>,{" "}
              <a href="https://www.infosecurity-magazine.com/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white underline">Infosecurity Magazine</a>
            </p>
          </div>
        </div>
      </motion.div>

      {/* Two-column layout: Podcasts + Briefings */}
      <div className="grid grid-cols-1 xl:grid-cols-[380px,1fr] gap-4">
        {/* Podcast Cards Stack */}
        <div className="space-y-4">
          {/* Security Now Podcast Section */}
          <PodcastSection />
          
          {/* SANS ISC Stormcast Section */}
          <StormcastSection />
        </div>

        {/* Intelligence Briefings */}
        <div className="rounded-2xl bg-slate-800/50 border border-white/5 overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-red-400" />
              <h2 className="text-lg font-semibold text-white">Daily Cyber Briefings</h2>
              <span className="ml-auto text-sm text-gray-500">{outputs?.length ?? 0} reports</span>
            </div>
          </div>

        <div className="divide-y divide-white/5">
          {(outputs ?? []).length === 0 ? (
            <div className="p-8 text-center">
              <Shield className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500">No cyber briefings yet.</p>
              <p className="text-sm text-gray-600">Sarah&apos;s daily reports will appear here.</p>
            </div>
          ) : (
            (outputs ?? []).map((output, index) => (
              <motion.div
                key={output?.id ?? index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 hover:bg-white/5 transition-colors border-l-4 border-l-red-500"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="relative w-8 h-8 rounded-lg overflow-hidden ring-1 ring-red-500/30">
                        <Image
                          src="/avatars/sarah.png"
                          alt="Sarah avatar"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">🔐 Sarah</span>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-sm text-red-400">{output?.task?.taskName ?? "Cyber Briefing"}</span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {output?.createdAt ? formatDistanceToNow(new Date(output.createdAt), { addSuffix: true }) : "Unknown"}
                        </p>
                      </div>
                    </div>

                    {/* Summary or preview */}
                    <p className="text-sm text-gray-400 mb-3">
                      {output?.summary ?? stripMarkdown(output?.content ?? "", 200)}
                    </p>

                    {/* Expandable content */}
                    <AnimatePresence>
                      {expandedIds.has(output?.id ?? "") && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 p-4 rounded-xl bg-slate-900/50 border border-red-500/10"
                        >
                          <MarkdownRenderer content={output?.content ?? ""} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setFullscreenOutput(output)}
                      className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                      title="View fullscreen"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleExpand(output?.id ?? "")}
                      className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                      {expandedIds.has(output?.id ?? "") ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
        </div>
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
              className="w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto bg-slate-900 border border-red-500/20 rounded-xl sm:rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 p-3 sm:p-4 border-b border-white/5 bg-slate-900/95 backdrop-blur flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-lg overflow-hidden ring-2 ring-red-500/30 flex-shrink-0">
                    <Image
                      src="/avatars/sarah.png"
                      alt="Sarah avatar"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white text-sm sm:text-base">🔐 Sarah</span>
                      <span className="text-xs sm:text-sm text-red-400 truncate">{fullscreenOutput?.task?.taskName ?? "Cyber Briefing"}</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {fullscreenOutput?.createdAt
                        ? formatDistanceToNow(new Date(fullscreenOutput.createdAt), { addSuffix: true })
                        : "Unknown"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setFullscreenOutput(null)}
                  className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 sm:p-6">
                <MarkdownRenderer content={fullscreenOutput?.content ?? ""} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
