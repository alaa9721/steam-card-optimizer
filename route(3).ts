import { NextResponse } from "next/server";
import { getOrigin, setSession } from "@/lib/session";

export async function GET(req: Request) {
  const origin = getOrigin(req);
  const q = new URL(req.url).searchParams;
  const m = (q.get("openid.claimed_id") || "").match(/^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/);
  if (!m || !(q.get("openid.return_to") || "").startsWith(origin)) return NextResponse.redirect(`${origin}/?login=failed`);

  // Ask Steam to confirm the signed response is genuine
  const body = new URLSearchParams(q);
  body.set("openid.mode", "check_authentication");
  const r = await fetch("https://steamcommunity.com/openid/login", { method: "POST", body, headers: { "Content-Type": "application/x-www-form-urlencoded" } });
  const text = await r.text();
  if (!/is_valid\s*:\s*true/.test(text)) return NextResponse.redirect(`${origin}/?login=failed`);

  setSession(m[1]);
  return NextResponse.redirect(`${origin}/`);
}
