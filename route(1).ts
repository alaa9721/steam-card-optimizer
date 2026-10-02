import { NextRequest, NextResponse } from "next/server";
import { resolveSteamId, UA, sleep } from "@/lib/steam";
import { getSession } from "@/lib/session";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const input = req.nextUrl.searchParams.get("id") || "";
    const steamId = getSession() || (await resolveSteamId(input));
    const assets: any[] = [];
    const descs: any[] = [];
    let last: string | undefined;

    for (let page = 0; page < 20; page++) {
      const url = `https://steamcommunity.com/inventory/${steamId}/753/2?l=english&count=75${last ? `&start_assetid=${last}` : ""}`;
      const r = await fetch(url, { headers: UA, cache: "no-store" });
      if (r.status === 429) return NextResponse.json({ error: "Steam is rate limiting requests. Wait a minute and try again." }, { status: 429 });
      if (r.status === 403 || r.status === 500 || r.status === 401)
        return NextResponse.json({ error: "Inventory is private or unavailable. Set Inventory to Public in Steam privacy settings." }, { status: 403 });
      if (!r.ok) return NextResponse.json({ error: `Steam returned ${r.status}.` }, { status: 502 });
      const j = await r.json();
      if (!j || !j.assets) break;
      assets.push(...j.assets);
      descs.push(...(j.descriptions || []));
      if (!j.more_items) break;
      last = j.last_assetid;
      await sleep(1000);
    }

    const dmap = new Map<string, any>();
    descs.forEach((d) => dmap.set(`${d.classid}_${d.instanceid}`, d));
    const counts = new Map<string, number>();
    assets.forEach((a) => {
      const k = `${a.classid}_${a.instanceid}`;
      counts.set(k, (counts.get(k) || 0) + parseInt(a.amount || "1", 10));
    });

    const games = new Map<string, any>();
    counts.forEach((qty, k) => {
      const d = dmap.get(k);
      if (!d) return;
      const tags: any[] = d.tags || [];
      const isCard = tags.some((t) => t.category === "item_class" && t.internal_name === "item_class_2");
      const isFoil = tags.some((t) => t.category === "cardborder" && t.internal_name !== "cardborder_0");
      if (!isCard || isFoil) return; // regular trading cards only
      const gameTag = tags.find((t) => t.category === "Game");
      const appid = (gameTag?.internal_name || "").replace("app_", "") || String(d.market_fee_app || "");
      if (!appid) return;
      if (!games.has(appid)) games.set(appid, { appid, name: gameTag?.localized_tag_name || d.type || appid, cards: [] });
      games.get(appid).cards.push({
        hash: d.market_hash_name, name: d.name, qty, marketable: d.marketable === 1,
        icon: `https://community.cloudflare.steamstatic.com/economy/image/${d.icon_url}/96fx96f`,
      });
    });

    return NextResponse.json({ steamId, games: [...games.values()] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Unexpected error." }, { status: 400 });
  }
}
