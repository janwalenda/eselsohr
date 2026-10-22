import { serializeIcon } from "~~/shared/icons";

type ApiFetch = ReturnType<typeof useApiFetch>;

/**
 * After a page is created, upload a deferred image icon (if any) and persist it.
 * Emoji/Lucide icons are already written by the create API when passed in the body.
 */
export async function finalizeCreatedPageIcon(
  apiFetch: ApiFetch,
  collectiveId: number,
  pageId: number,
  options: {
    icon?: string | null;
    pendingImage?: Blob | null;
  },
) {
  if (!options.pendingImage) {
    return options.icon ?? null;
  }

  const form = new FormData();

  form.append(
    "file",
    new File([options.pendingImage], `icon-${Date.now()}.webp`, { type: "image/webp" }),
  );

  const uploaded = await apiFetch<{ path: string }>(
    `/api/collectives/${collectiveId}/pages/${pageId}/attachments`,
    { method: "POST", body: form },
  );

  const icon = serializeIcon({ kind: "image", value: uploaded.path });

  await apiFetch(`/api/collectives/${collectiveId}/pages/${pageId}/icon`, {
    method: "PUT",
    body: { icon },
  });

  return icon;
}
