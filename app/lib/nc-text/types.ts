import type { TextOpenData } from "~~/shared/text-session";

export type { TextConnection, TextOpenData } from "~~/shared/text-session";

/** A sync protocol step as returned by the server (base64 messages + version). */
export interface Step {
  data: string[];
  version: number;
  sessionId: number;
}

/** Editing session participant as returned by `sync`. */
export interface CollabSession {
  id: number;
  userId?: string;
  guestName?: string;
  displayName?: string;
  color?: string;
  lastContact: number;
  lastAwarenessMessage?: string;
  documentId?: number;
}

export interface SyncDocument {
  id: number;
  lastSavedVersion: number;
  lastSavedVersionTime: number;
  baseVersionEtag: string;
  initialVersion?: number;
}

export type OpenData = TextOpenData;
