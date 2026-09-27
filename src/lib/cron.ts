import crypto from "crypto";

/** Constant-time comparison against Vercel Cron's own `Authorization: Bearer
 * $CRON_SECRET` header - shared by every /api/cron/* route so the check
 * can't drift between them. */
export function verifyCronSecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = req.headers.get("authorization");
  const expected = `Bearer ${secret}`;
  if (!header) return false;

  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
