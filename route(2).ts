import { NextResponse } from "next/server";
import { getOrigin } from "@/lib/session";

export function GET(req: Request) {
  const origin = getOrigin(req);
  const p = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": `${origin}/api/auth/callback`,
    "openid.realm": origin,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });
  return NextResponse.redirect(`https://steamcommunity.com/openid/login?${p}`);
}
