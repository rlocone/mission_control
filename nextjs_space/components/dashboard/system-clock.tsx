"use client";

import { useState, useEffect } from "react";
import { Clock, Calendar } from "lucide-react";

export function SystemClock() {
  const [time, setTime] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTime(new Date());
    
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!mounted || !time) {
    return (
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-4">
          <div className="h-4 w-32 bg-slate-700/50 rounded animate-pulse" />
          <div className="h-4 w-24 bg-slate-700/50 rounded animate-pulse" />
        </div>
        <div className="h-4 w-28 bg-slate-700/50 rounded animate-pulse" />
      </div>
    );
  }

  // Format time
  const timeStr = time.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  // Format date
  const dateStr = time.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Calculate week number (ISO week)
  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };
  const weekNum = getWeekNumber(time);

  // Calculate day of year
  const startOfYear = new Date(time.getFullYear(), 0, 0);
  const diff = time.getTime() - startOfYear.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  // Calculate quarter with year (Q1/26 format)
  const quarter = Math.floor(time.getMonth() / 3) + 1;
  const yearShort = String(time.getFullYear()).slice(-2);
  const quarterStr = `Q${quarter}/${yearShort}`;

  // Get timezone info
  const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tzOffset = time.getTimezoneOffset();
  const offsetHours = Math.abs(Math.floor(tzOffset / 60));
  const offsetMinutes = Math.abs(tzOffset % 60);
  const offsetSign = tzOffset <= 0 ? "+" : "-";
  const offsetStr = `UTC${offsetSign}${String(offsetHours).padStart(2, "0")}:${String(offsetMinutes).padStart(2, "0")}`;

  // Unix timestamp
  const unixTime = Math.floor(time.getTime() / 1000);

  // Short date for mobile
  const shortDateStr = time.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  // Short time for mobile (no seconds)
  const shortTimeStr = time.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="flex flex-wrap items-center gap-2 lg:gap-4 xl:gap-6 text-sm">
      {/* Mobile: Compact date/time badge */}
      <div className="flex md:hidden items-center gap-2 bg-slate-800/60 px-2 py-1 rounded-lg border border-white/5">
        <Calendar className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-gray-300 text-xs">{shortDateStr}</span>
        <span className="text-gray-500">|</span>
        <span className="text-white font-mono text-xs">{shortTimeStr}</span>
      </div>

      {/* Tablet+: Date with week/day/quarter */}
      <div className="hidden md:flex items-center gap-2 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-white/5">
        <Calendar className="w-4 h-4 text-cyan-400" />
        <span className="text-gray-300 whitespace-nowrap">{dateStr}</span>
        <span className="text-gray-500 hidden lg:inline">|</span>
        <span className="text-cyan-300 font-mono text-xs hidden lg:inline">Week {weekNum}</span>
        <span className="text-gray-500 hidden lg:inline">|</span>
        <span className="text-cyan-300 font-mono text-xs hidden lg:inline">Day {dayOfYear}</span>
        <span className="text-gray-500 hidden lg:inline">|</span>
        <span className="text-cyan-300 font-mono text-xs hidden lg:inline">{quarterStr}</span>
      </div>

      {/* Tablet+: Time */}
      <div className="hidden md:flex items-center gap-2 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-white/5">
        <Clock className="w-4 h-4 text-emerald-400" />
        <span className="text-white font-mono font-medium">{timeStr}</span>
      </div>

      {/* Desktop only: Timezone */}
      <div className="hidden xl:flex items-center gap-2 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-white/5">
        <span className="text-gray-400">TZ:</span>
        <span className="text-amber-400 font-mono text-xs">{tzName}</span>
        <span className="text-gray-500">|</span>
        <span className="text-amber-300 font-mono">{offsetStr}</span>
      </div>

      {/* Desktop only: Unix Time */}
      <div className="hidden xl:flex items-center gap-2 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-white/5">
        <span className="text-gray-400">UNIX:</span>
        <span className="text-pink-400 font-mono font-medium">{unixTime}</span>
      </div>
    </div>
  );
}
