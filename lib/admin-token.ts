import "server-only";
import { timingSafeEqual } from "node:crypto";

/**
 * Bearer auth for the admin API routes (bulk indexing, newsletter). Uses a
 * constant-time comparison; with ADMIN_API_TOKEN unset every request is
 * rejected, so the endpoints are disabled by default.
 */
export function isAdminRequest(request: Request): boolean {
  const token = process.env.ADMIN_API_TOKEN;
  if (!token) return false;
  const match = request.headers.get("authorization")?.match(/^Bearer (.+)$/i);
  if (!match) return false;
  const provided = Buffer.from(match[1]);
  const expected = Buffer.from(token);
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}
