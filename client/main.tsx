import "./global.css";
import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as DefaultToaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes"; // ← AJOUTEZ CET IMPORT
import App from "./App";

const queryClient = new QueryClient();

// #region agent log
fetch('http://127.0.0.1:7401/ingest/84886cf9-a143-47ed-b36f-9883ce1f0e4b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'e0cb1b'},body:JSON.stringify({sessionId:'e0cb1b',runId:'app-start',hypothesisId:'LOGPIPE',location:'client/main.tsx:bootstrap',message:'App bootstrap',data:{},timestamp:Date.now()})}).catch(()=>{});
// #endregion agent log

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem> {/* ← AJOUTEZ CE CI */}
        <TooltipProvider>
          <DefaultToaster />
          <Sonner />
          <App />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);