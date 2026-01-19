import React from "react";

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-white/80 backdrop-blur">
      <div className="flex items-center justify-between px-6 py-4">
        <p className="text-xs text-muted-foreground">
          © 2024 ARCANE - Clinical Decision Support System
        </p>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">Powered by</p>
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2F7cd1f0a31d4341f88052d23a9c109ccd%2F5695ec5fddb246fdb41b71f78ec4270c?format=webp&width=800"
            alt="IHU PRISM"
            className="h-6 object-contain"
          />
        </div>
      </div>
    </footer>
  );
}
