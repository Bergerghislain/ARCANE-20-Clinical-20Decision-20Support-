import React, { useState, useMemo } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  Clock,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Conversation } from "@/hooks/useArgosHistory";

interface ArgosSidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  currentPatientId: string | null;
  onLoadConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
  onRenameConversation: (conversationId: string, newTitle: string) => void;
  onNewConversation: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function ArgosSidebar({
  conversations,
  currentConversationId,
  currentPatientId,
  onLoadConversation,
  onDeleteConversation,
  onRenameConversation,
  onNewConversation,
  isOpen = true,
  onClose,
}: ArgosSidebarProps) {
  const [activeTab, setActiveTab] = useState<"all" | "by-patient">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [expandedPatients, setExpandedPatients] = useState<Set<string>>(
    new Set([currentPatientId || ""]),
  );

  // Sort conversations by date (most recent first)
  const sortedConversations = useMemo(() => {
    return [...conversations].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    );
  }, [conversations]);

  // Group conversations by patient
  const groupedByPatient = useMemo(() => {
    const groups = new Map<string, Conversation[]>();

    sortedConversations.forEach((conv) => {
      if (!groups.has(conv.patientId)) {
        groups.set(conv.patientId, []);
      }
      groups.get(conv.patientId)!.push(conv);
    });

    // Sort groups by most recent conversation
    const sortedGroups = Array.from(groups.entries()).sort((a, b) => {
      const latestA = a[1][0].updatedAt;
      const latestB = b[1][0].updatedAt;
      return latestB.getTime() - latestA.getTime();
    });

    return sortedGroups;
  }, [sortedConversations]);

  const togglePatientExpanded = (patientId: string) => {
    const newExpanded = new Set(expandedPatients);
    if (newExpanded.has(patientId)) {
      newExpanded.delete(patientId);
    } else {
      newExpanded.add(patientId);
    }
    setExpandedPatients(newExpanded);
  };

  const handleStartEdit = (conversationId: string, currentTitle: string) => {
    setEditingId(conversationId);
    setEditingTitle(currentTitle);
  };

  const handleSaveEdit = (conversationId: string) => {
    if (editingTitle.trim()) {
      onRenameConversation(conversationId, editingTitle.trim());
    }
    setEditingId(null);
    setEditingTitle("");
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    const isToday = dateOnly.getTime() === new Date(today).setHours(0, 0, 0, 0);
    const isYesterday =
      dateOnly.getTime() === new Date(yesterday).setHours(0, 0, 0, 0);

    if (isToday) {
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (isYesterday) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const ConversationItem = ({
    conversation,
  }: {
    conversation: Conversation;
  }) => (
    <div
      key={conversation.id}
      onClick={() => onLoadConversation(conversation.id)}
      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
        currentConversationId === conversation.id
          ? "bg-primary/10 text-primary"
          : "hover:bg-muted text-foreground"
      }`}
    >
      <Clock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />

      <div className="flex-1 min-w-0">
        {editingId === conversation.id ? (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onBlur={() => handleSaveEdit(conversation.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSaveEdit(conversation.id);
                } else if (e.key === "Escape") {
                  setEditingId(null);
                }
              }}
              className="flex-1 text-sm px-2 py-1 rounded border border-border bg-background"
              autoFocus
            />
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium truncate">{conversation.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDate(conversation.updatedAt)}
            </p>
          </div>
        )}
      </div>

      {currentConversationId === conversation.id && (
        <div
          className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleStartEdit(conversation.id, conversation.title);
            }}
            className="p-1 hover:bg-primary/20 rounded transition-colors"
            title="Rename conversation"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (
                confirm("Are you sure you want to delete this conversation?")
              ) {
                onDeleteConversation(conversation.id);
              }
            }}
            className="p-1 hover:bg-destructive/20 rounded transition-colors text-destructive"
            title="Delete conversation"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );

  const sidebarContent = (
    <>
      {/* New Conversation Button */}
      <div className="p-3 border-b border-border">
        <Button
          onClick={onNewConversation}
          variant="default"
          size="sm"
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Conversation
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("all")}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === "all"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setActiveTab("by-patient")}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === "by-patient"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          By Patient
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {activeTab === "all" ? (
          // All Conversations (Chronological)
          <>
            {sortedConversations.length > 0 ? (
              sortedConversations.map((conv) => (
                <ConversationItem key={conv.id} conversation={conv} />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs mt-2">
                  Start a new conversation with a patient
                </p>
              </div>
            )}
          </>
        ) : (
          // By Patient (Grouped)
          <>
            {groupedByPatient.length > 0 ? (
              groupedByPatient.map(([patientId, patientConvs]) => (
                <div key={patientId}>
                  {/* Patient Header */}
                  <button
                    onClick={() => togglePatientExpanded(patientId)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left font-medium text-sm text-foreground mb-1"
                  >
                    <ChevronDown
                      className={`h-4 w-4 flex-shrink-0 transition-transform ${
                        expandedPatients.has(patientId)
                          ? "rotate-0"
                          : "-rotate-90"
                      }`}
                    />
                    <span className="truncate">
                      {patientConvs[0].patientName}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
                      ({patientConvs.length})
                    </span>
                  </button>

                  {/* Conversations for this Patient */}
                  {expandedPatients.has(patientId) && (
                    <div className="ml-3 space-y-1 mb-3">
                      {patientConvs.map((conv) => (
                        <ConversationItem key={conv.id} conversation={conv} />
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs mt-2">
                  Start a new conversation with a patient
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden sm:flex w-64 flex-col border-r border-border bg-card flex-shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile Sidebar */}
      <div
        className={`sm:hidden fixed inset-0 z-40 transition-all ${
          isOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />

        {/* Sidebar Panel */}
        <div className="absolute left-0 top-0 bottom-0 w-64 bg-card border-r border-border flex flex-col">
          {sidebarContent}

          {/* Close Button */}
          <div className="p-3 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
