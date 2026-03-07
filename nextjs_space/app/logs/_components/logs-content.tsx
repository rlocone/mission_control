"use client";

import { useState, useEffect } from "react";
import { ScrollText, Activity } from "lucide-react";
import { LogViewer } from "@/components/dashboard/log-viewer";

interface Agent {
  id: string;
  name: string;
}

export function LogsPageContent() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch("/api/agents");
        const data = await res?.json();
        setAgents(data ?? []);
      } catch (error) {
        console.error("Error fetching agents:", error);
      }
      setLoading(false);
    };
    fetchAgents();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Activity className="w-12 h-12 text-cyan-400 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <ScrollText className="w-8 h-8 text-cyan-400" />
          Audit Logs
        </h1>
        <p className="text-gray-400 mt-1">Searchable logs and audit trail for all agent activities</p>
      </div>

      <div className="bg-slate-900/50 rounded-2xl border border-white/5 p-6">
        <LogViewer agents={agents ?? []} />
      </div>
    </div>
  );
}
