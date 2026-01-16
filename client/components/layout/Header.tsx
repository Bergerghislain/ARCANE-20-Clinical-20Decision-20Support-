import React from "react";
import { Link } from "react-router-dom";
import { LogOut, User, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  userName?: string;
  onMenuClick?: () => void;
}

export function Header({ userName = "Dr. Martin", onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card">
      <div className="flex h-16 items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">A</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary">ARCANE</h1>
            <p className="text-xs text-muted-foreground">
              Clinical Decision Support
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-2 sm:flex">
            <User className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              {userName}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
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
