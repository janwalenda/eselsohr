import { describe, expect, it } from "vitest";
import {
  buildAttachmentProxyBase,
  buildPublicAttachmentProxyBase,
  rewriteCollectiveAttachmentsForDisplay,
} from "../shared/collective-attachments";
import { buildPublicShareUrl } from "../shared/public-shares";
import { buildDatabaseUrl } from "../server/utils/db";

describe("buildPublicShareUrl", () => {
  it("builds a root public share URL", () => {
    expect(buildPublicShareUrl("https://eselsohr.example/", { token: "abc123" })).toBe(
      "https://eselsohr.example/s/abc123",
    );
  });

  it("builds a page-specific public share URL", () => {
    expect(buildPublicShareUrl("https://eselsohr.example", { token: "abc123", pageId: 42 })).toBe(
      "https://eselsohr.example/s/abc123/42",
    );
  });
});

describe("buildDatabaseUrl", () => {
  it("prefers a direct database URL", () => {
    expect(buildDatabaseUrl({ databaseUrl: "postgresql://direct.example/db" })).toBe(
      "postgresql://direct.example/db",
    );
  });

  it("builds a Neon/Postgres URL from PG variables", () => {
    expect(
      buildDatabaseUrl({
        pgHost: "ep-example.eu-central-1.aws.neon.tech",
        pgDatabase: "neondb",
        pgUser: "neon",
        pgPassword: "secret",
        pgSslMode: "require",
        pgChannelBinding: "require",
      }),
    ).toBe(
      "postgresql://neon:secret@ep-example.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    );
  });
});

describe("public attachment proxy helpers", () => {
  it("builds the public attachment proxy base", () => {
    expect(buildPublicAttachmentProxyBase("abc123", 42)).toBe(
      "/api/public/s/abc123/pages/42/attachments",
    );
  });

  it("rewrites markdown attachments for the public proxy", () => {
    const markdown = "![Bild](.attachments.99/image.png)";

    expect(
      rewriteCollectiveAttachmentsForDisplay(
        markdown,
        buildPublicAttachmentProxyBase("abc123", 42),
      ),
    ).toBe("![Bild](/api/public/s/abc123/pages/42/attachments/.attachments.99/image.png)");
  });

  it("keeps the authenticated attachment proxy unchanged", () => {
    expect(buildAttachmentProxyBase(3, 7)).toBe("/api/collectives/3/pages/7/attachments");
  });
});
