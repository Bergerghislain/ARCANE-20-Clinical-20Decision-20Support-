import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Users, Bot, Settings, HelpCircle, Shield, RefreshCw, X } from "lucide-react";
import { getStoredUser } from "@/lib/auth";

interface NavItem {
  label: string;
  icon: React.ReactNode;
  href: string;
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const location = useLocation();
  const user = getStoredUser();
  const isAdmin = (user?.role || "").toLowerCase() === "admin";

  const navItems: NavItem[] = [
    {
      label: "Patients",
      icon: <Users className="h-5 w-5" />,
      href: "/dashboard",
    },
    { label: "ARGOS Space", icon: <Bot className="h-5 w-5" />, href: "/argos" },
    {
      label: "Settings",
      icon: <Settings className="h-5 w-5" />,
      href: "/settings",
    },
    { label: "Help", icon: <HelpCircle className="h-5 w-5" />, href: "/help" },
  ];

  if (isAdmin) {
    navItems.push({
      label: "Administration",
      icon: <Shield className="h-5 w-5" />,
      href: "/admin/users",
    });
    navItems.push({
      label: "Patient Handler",
      icon: <RefreshCw className="h-5 w-5" />,
      href: "/admin/patient-handler",
    });
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 sm:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 transform border-r border-border/50 bg-gradient-to-b from-white to-blue-50/50 transition-transform duration-300 sm:static sm:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="inline-flex sm:hidden absolute top-4 right-4 items-center justify-center h-8 w-8 rounded-md hover:bg-sidebar-accent/50"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Navigation */}
          <nav className="flex-1 space-y-2 p-4 pt-8 sm:pt-4">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-sidebar-border p-4">
            <p className="text-xs text-sidebar-foreground/60">
              ARCANE Phase 1 • Rare Cancer Support
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
