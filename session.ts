import crypto from "crypto";
import { cookies } from "next/headers";

const secret = () => process.env.SESSION_SECRET || "dev-secret-change-me";
const sign = (v: string) => crypto.createHmac("sha256", secret()).update(v).digest("hex");

export function setSession(steamId: string) {
  cookies().set("sco", `${steamId}.${sign(steamId)}`, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 14, path: "/" });
}
export function clearSession() { cookies().delete("sco"); }
export function getSession(): string | null {
  const v = cookies().get("sco")?.value;
  if (!v) return null;
  const [id, sig] = v.split(".");
  if (!/^\d{17}$/.test(id || "") || !sig) return null;
  const good = sign(id);
  if (sig.length !== good.length) return null;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good)) ? id : null;
}
export const getOrigin = (req: Request) =>
  `${req.headers.get("x-forwarded-proto") || "http"}://${req.headers.get("x-forwarded-host") || req.headers.get("host")}`;
