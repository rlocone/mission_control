"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  ListTodo,
  FileText,
  BarChart3,
  ScrollText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Cpu,
  AlertTriangle,
  Shield,
  Menu,
  X,
} from "lucide-react";

const menuItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/agents", icon: Users, label: "Agents" },
  { href: "/war-room", icon: Shield, label: "War Room", special: true },
  { href: "/tasks", icon: ListTodo, label: "Tasks" },
  { href: "/outputs", icon: FileText, label: "Outputs" },
  { href: "/tokens", icon: BarChart3, label: "Token Usage" },
  { href: "/incidents", icon: AlertTriangle, label: "Incidents" },
  { href: "/logs", icon: ScrollText, label: "Logs" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const NavContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          {(isMobile || !collapsed) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="overflow-hidden"
            >
              <h1 className="font-bold text-white text-lg whitespace-nowrap">Mission Control</h1>
              <p className="text-xs text-gray-500 whitespace-nowrap">Multi-Agent System</p>
            </motion.div>
          )}
          {isMobile && (
            <button
              onClick={() => setMobileOpen(false)}
              className="ml-auto p-2 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          const isWarRoom = (item as { special?: boolean }).special;

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all relative ${
                  isActive
                    ? isWarRoom
                      ? "bg-red-500/10 text-red-400"
                      : "bg-cyan-500/10 text-cyan-400"
                    : isWarRoom
                    ? "text-red-400/70 hover:bg-red-500/10 hover:text-red-400"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {(isMobile || !collapsed) && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
                {isActive && (
                  <motion.div
                    layoutId={isMobile ? "mobileActiveIndicator" : "activeIndicator"}
                    className={`absolute left-0 w-1 h-8 rounded-r-full ${isWarRoom ? "bg-red-500" : "bg-cyan-500"}`}
                  />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {!isMobile && (
        <div className="p-3 border-t border-white/5">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all"
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-50 p-2 rounded-lg bg-slate-800/95 backdrop-blur-sm border border-white/10 text-white shadow-lg md:hidden active:scale-95 transition-transform"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile drawer overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 h-screen w-[280px] bg-gradient-to-b from-slate-900 to-slate-950 border-r border-white/5 z-50 flex flex-col md:hidden"
          >
            <NavContent isMobile />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 80 : 256 }}
        className="hidden md:flex fixed left-0 top-0 h-screen bg-gradient-to-b from-slate-900 to-slate-950 border-r border-white/5 z-40 flex-col"
      >
        <NavContent />
      </motion.aside>
    </>
  );
}
