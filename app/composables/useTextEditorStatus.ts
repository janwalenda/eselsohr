import type { Component } from "vue";
import {
  AlertCircleIcon,
  CircleCheckIcon,
  CircleDotIcon,
  Loader2Icon,
  LockIcon,
  WifiOffIcon,
} from "lucide-vue-next";
import type { useTextSession } from "@/composables/useTextSession";

type TextSession = ReturnType<typeof useTextSession>;

export type EditorStatus = {
  label: string;
  icon: Component;
  tone: "default" | "success" | "warning" | "error";
  spin?: boolean;
};

export function colorForName(name: string) {
  let hash = 0;

  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return `hsl(${Math.abs(hash) % 360}, 70%, 45%)`;
}

export function useTextEditorStatus(session: TextSession) {
  const lastCollaborator = computed(() => {
    const latestSession = session.collaborators.value.reduce(
      (latest, current) => {
        return !latest || current.lastContact > latest.lastContact ? current : latest;
      },
      null as (typeof session.collaborators.value)[number] | null,
    );

    return latestSession?.displayName || latestSession?.guestName || latestSession?.userId || "";
  });

  const editorStatus = computed((): EditorStatus => {
    if (session.status.value === "error") {
      return {
        label: session.expired.value ? "Sitzung abgelaufen" : "Verbindungsfehler",
        icon: AlertCircleIcon,
        tone: "error",
      };
    }

    if (session.connectionIssue.value) {
      return { label: "Verbindung unterbrochen …", icon: WifiOffIcon, tone: "warning" };
    }

    if (session.saving.value) {
      return { label: "Speichert …", icon: Loader2Icon, tone: "default", spin: true };
    }

    if (session.status.value === "readonly") {
      return { label: "Schreibgeschützt", icon: LockIcon, tone: "warning" };
    }

    if (session.status.value === "connecting") {
      return { label: "Verbindet …", icon: Loader2Icon, tone: "default", spin: true };
    }

    if (session.dirty.value) {
      return { label: "Ungespeichert", icon: CircleDotIcon, tone: "warning" };
    }

    return { label: "Synchronisiert", icon: CircleCheckIcon, tone: "success" };
  });

  const statusIconClass = computed(() => {
    switch (editorStatus.value.tone) {
      case "success":
        return "text-emerald-600 dark:text-emerald-400";
      case "warning":
        return "text-amber-600 dark:text-amber-400";
      case "error":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  });

  return { lastCollaborator, editorStatus, statusIconClass };
}
