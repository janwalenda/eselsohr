import { computed, ref, shallowRef } from "vue";
import { Awareness } from "y-protocols/awareness";
import * as Y from "yjs";
import { createTextApi } from "@/lib/nc-text/apis";
import { HttpProvider } from "@/lib/nc-text/HttpProvider";
import { ERROR_TYPE, SyncService } from "@/lib/nc-text/SyncService";
import { getDocumentState } from "@/lib/nc-text/yjs";
import type { CollabSession, OpenData, TextConnection } from "@/lib/nc-text/types";

/** Ensures a new page session opens only after the previous one has closed. */
let pendingSessionClose: Promise<void> | null = null;

export interface TextSessionUser {
  name: string;
  color: string;
}

export interface ConnectCallbacks {
  /** Serialize the current editor document to markdown (for autosave/save). */
  serialize: () => string;
  /** Seed the empty Yjs doc from markdown when the server has no saved state yet. */
  seedInitialContent: (doc: Y.Doc, content: string) => void;
  /** Apply disk content after an outside-change conflict (body + properties). */
  applyOutsideChange?: (fullMarkdown: string) => void;
}

export type TextSessionStatus = "idle" | "connecting" | "ready" | "readonly" | "error";

/**
 * Drive a collaborative Nextcloud Text editing session for one collective page.
 * Creates the shared Yjs document and awareness eagerly so the editor can bind to
 * them, then `connect()` opens the server session and starts syncing.
 */
export function useTextSession(collectiveId: number, pageId: number, user: TextSessionUser) {
  const ydoc = new Y.Doc();

  const awareness = new Awareness(ydoc);

  awareness.setLocalStateField("user", {
    name: user.name,
    color: user.color,
    clientId: ydoc.clientID,
  });

  const api = createTextApi(collectiveId, pageId);

  const connection = shallowRef<TextConnection | undefined>(undefined);

  const status = ref<TextSessionStatus>("idle");

  const readOnly = ref(true);

  const dirty = ref(false);

  const saving = ref(false);

  const collaborators = ref<CollabSession[]>([]);

  const conflictContent = ref<string | null>(null);

  const expired = ref(false);

  const connectionIssue = ref(false);

  const lastError = ref<unknown>(null);

  let callbacks: ConnectCallbacks | null = null;

  let provider: HttpProvider | null = null;

  let autosaveTimer: ReturnType<typeof setTimeout> | undefined;

  let openData: OpenData | null = null;

  let reconcilingOutsideChange = false;

  const openConnection = async (): Promise<OpenData> => {
    const data = await api.open();

    openData = data;
    connection.value = {
      documentId: data.document.id,
      sessionId: data.session.id,
      sessionToken: data.session.token,
      baseVersionEtag: data.document.baseVersionEtag,
      filePath: data.filePath ?? "",
    };
    return data;
  };

  const syncService = new SyncService({ api, connection, openConnection });

  async function reconcileOutsideChange(outsideChange: string) {
    if (reconcilingOutsideChange || !connection.value || readOnly.value || dirty.value) {
      return;
    }

    reconcilingOutsideChange = true;

    try {
      callbacks?.applyOutsideChange?.(outsideChange);

      const result = await api.save(connection.value, {
        version: syncService.version,
        autosaveContent: outsideChange,
        documentState: getDocumentState(ydoc),
        force: true,
        manualSave: false,
      });

      if (!result.data.outsideChange) {
        conflictContent.value = null;
        dirty.value = false;
      }

      if (result.data.document) {
        connection.value = {
          ...connection.value,
          baseVersionEtag: result.data.document.baseVersionEtag,
        };
      }
    } finally {
      reconcilingOutsideChange = false;
    }
  }

  function bindBus() {
    const bus = syncService.bus;

    bus.on("opened", (data) => {
      readOnly.value = data.readOnly;
      status.value = data.readOnly ? "readonly" : "connecting";
      syncService.startSync();

      if (!data.documentState && typeof data.content === "string") {
        callbacks?.seedInitialContent(ydoc, data.content);
      }
    });

    bus.on("change", ({ sessions, document }) => {
      collaborators.value = sessions ?? [];
      connectionIssue.value = false;

      if (document?.baseVersionEtag && connection.value) {
        connection.value = {
          ...connection.value,
          baseVersionEtag: document.baseVersionEtag,
        };
      }
    });

    bus.on("sync", () => {
      if (syncService.pushError > 0 && syncService.pushEnabled) {
        void syncService.sendStepsNow().catch(() => {});
      }
    });

    bus.on("stateChange", (state) => {
      if (state.initialLoading && status.value === "connecting") {
        status.value = readOnly.value ? "readonly" : "ready";
        syncService.pushEnabled = !readOnly.value;
      }

      if (Object.prototype.hasOwnProperty.call(state, "dirty") && state.dirty) {
        dirty.value = true;
        scheduleAutosave();
      }
    });

    bus.on("error", ({ type, data }) => {
      lastError.value = { type, data };

      if (type === ERROR_TYPE.LOAD_ERROR && (data as { status?: number })?.status === 412) {
        expired.value = true;
        status.value = "error";
      }

      if (type === ERROR_TYPE.SAVE_COLLISION) {
        const outsideChange = (data as { outsideChange?: string })?.outsideChange;

        if (outsideChange) {
          conflictContent.value = outsideChange;

          if (!dirty.value) {
            void reconcileOutsideChange(outsideChange);
          }
        } else {
          conflictContent.value = null;
        }
      }

      if (type === ERROR_TYPE.CONNECTION_FAILED || type === ERROR_TYPE.SOURCE_NOT_FOUND) {
        connectionIssue.value = true;
      }

      if (type === ERROR_TYPE.PUSH_FORBIDDEN) {
        readOnly.value = true;
        status.value = "readonly";
        syncService.pushEnabled = false;
      }
    });

    bus.on("idle", () => {
      status.value = "idle";
    });
  }

  function scheduleAutosave() {
    if (status.value !== "ready" || conflictContent.value) {
      return;
    }

    if (autosaveTimer) {
      clearTimeout(autosaveTimer);
    }

    autosaveTimer = setTimeout(() => {
      void save(false).catch(() => {});
    }, 2000);
  }

  function scheduleSave() {
    if (!connection.value || readOnly.value || !callbacks || status.value !== "ready") {
      return;
    }

    dirty.value = true;
    scheduleAutosave();
  }

  async function save(manualSave = true): Promise<void> {
    if (!connection.value || !callbacks || readOnly.value) {
      return;
    }

    saving.value = true;

    try {
      await syncService.sendRemainingSteps();

      const result = await api.save(connection.value, {
        version: syncService.version,
        autosaveContent: callbacks.serialize(),
        documentState: getDocumentState(ydoc),
        manualSave,
      });

      if (result.data.outsideChange) {
        conflictContent.value = result.data.outsideChange;
      } else {
        dirty.value = false;
      }

      if (result.data.document) {
        connection.value = {
          ...connection.value,
          baseVersionEtag: result.data.document.baseVersionEtag,
        };
      }
    } finally {
      saving.value = false;
    }
  }

  async function connect(cb: ConnectCallbacks) {
    if (pendingSessionClose) {
      await pendingSessionClose.catch(() => {});
    }

    callbacks = cb;
    provider = new HttpProvider({ doc: ydoc, awareness, syncService });
    status.value = "connecting";
    await syncService.open();
  }

  let closed = false;

  async function close() {
    if (closed) {
      return;
    }

    closed = true;

    const closeWork = (async () => {
      if (autosaveTimer) {
        clearTimeout(autosaveTimer);
      }

      syncService.pushEnabled = false;

      if (dirty.value && !expired.value && !conflictContent.value) {
        await save(true).catch(() => {});
      }

      await syncService.close().catch(() => {});
      provider?.destroy();
      provider = null;
      awareness.destroy();
      ydoc.destroy();
      status.value = "idle";
    })();

    pendingSessionClose = closeWork;

    try {
      await closeWork;
    } finally {
      if (pendingSessionClose === closeWork) {
        pendingSessionClose = null;
      }
    }
  }

  bindBus();

  return {
    ydoc,
    awareness,
    status,
    readOnly,
    dirty,
    saving,
    collaborators: computed(() => collaborators.value),
    conflictContent,
    expired,
    connectionIssue,
    lastError,
    documentInfo: computed(() => openData?.document ?? null),
    connect,
    save,
    scheduleSave,
    close,
  };
}

export type TextSession = ReturnType<typeof useTextSession>;
