import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, User, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearAuth, getStoredUser } from "@/lib/auth";

interface HeaderProps {
  userName?: string;
  onMenuClick?: () => void;
}

export function Header({ userName, onMenuClick }: HeaderProps) {
  const navigate = useNavigate();
  const storedUser = getStoredUser();
  const displayName =
    userName || storedUser?.full_name || storedUser?.username || "Clinician";

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-white/80 backdrop-blur shadow-sm">
      <div className="flex h-16 items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg shadow-md">
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2F7cd1f0a31d4341f88052d23a9c109ccd%2F8bdc503ce9cf4432ae8603c4be99f69b?format=webp&width=800"
              alt="ARCANE Logo"
              className="h-10 w-10 object-contain"
            />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              ARCANE
            </h1>
            <p className="text-xs text-muted-foreground">
              Clinical Decision Support
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          {storedUser?.role === "admin" && (
            <button
              type="button"
              onClick={() => navigate("/admin/users")}
              className="hidden md:inline-flex text-xs font-medium text-secondary hover:text-secondary/80"
            >
              Dashboard admin
            </button>
          )}
          <div className="hidden items-center gap-2 sm:flex">
            <User className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              {displayName}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => {
              clearAuth();
              navigate("/login");
            }}
          >
            <LogOut className="h-5 w-5" />
          </Button>
          <button
            onClick={onMenuClick}
            className="inline-flex sm:hidden items-center justify-center h-9 w-9 rounded-md hover:bg-secondary/10"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
