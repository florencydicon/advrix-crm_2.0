import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

/**
 * JSON response with a content-derived ETag. When the caller sends
 * `If-None-Match` matching the current payload hash we return a 304 so heavy
 * pollers stop re-transferring unchanged bodies (bandwidth win; the DB still
 * runs, but polls stay wire-cheap).
 */
export function etagJsonResponse(req: NextRequest, body: unknown) {
  const etag = `"${createHash("sha1").update(JSON.stringify(body)).digest("hex").slice(0, 20)}"`;
  const inm = req.headers.get("if-none-match");
  if (inm && (inm === etag || inm === `W/${etag}` || inm.includes(etag))) {
    return new NextResponse(null, {
      status: 304,
      headers: { ETag: etag, "Cache-Control": "no-store" },
    });
  }
  return NextResponse.json(body, {
    headers: { ETag: etag, "Cache-Control": "no-store" },
  });
}