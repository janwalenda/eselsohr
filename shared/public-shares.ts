export type PublicShareLink = {
  token: string;
  pageId?: number | null;
};

export function buildPublicShareUrl(siteUrl: string, share: PublicShareLink) {
  const base = siteUrl.replace(/\/$/, "");

  const token = encodeURIComponent(share.token);

  if (share.pageId && Number.isFinite(share.pageId)) {
    return `${base}/s/${token}/${share.pageId}`;
  }

  return `${base}/s/${token}`;
}
