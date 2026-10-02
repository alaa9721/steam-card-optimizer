import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { UA } from "@/lib/steam";

export async function GET() {
  const id = getSession();
  if (!id) return NextResponse.json({ user: null });
  let name = "Steam user", avatar = "";
  try {
    const xml = await (await fetch(`https://steamcommunity.com/profiles/${id}/?xml=1`, { headers: UA })).text();
    name = xml.match(/<steamID><!\[CDATA\[(.*?)\]\]><\/steamID>/)?.[1] || name;
    avatar = xml.match(/<avatarIcon><!\[CDATA\[(.*?)\]\]><\/avatarIcon>/)?.[1] || "";
  } catch {}
  return NextResponse.json({ user: { id, name, avatar } });
}
