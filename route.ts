import { NextRequest, NextResponse } from "next/server";
import { UA, sleep, getCache, setCache } from "@/lib/steam";

// Returns every regular card in a game's set with its lowest market price (USD cents).
// One search call per game is far cheaper on rate limits than one priceoverview call per card.
export async function GET(req: NextRequest) {
  const appid = req.nextUrl.searchParams.get("appid") || "";
  if (!/^\d+$/.test(appid)) return NextResponse.json({ error: "Bad appid" }, { status: 400 });
  const hit = getCache(appid);
  if (hit) return NextResponse.json({ cards: hit, cached: true });

  const url =
    `https://steamcommunity.com/market/search/render/?query=&start=0&count=30&norender=1&currency=1&appid=753` +
    `&category_753_Game%5B%5D=tag_app_${appid}&category_753_item_class%5B%5D=tag_item_class_2&category_753_cardborder%5B%5D=tag_cardborder_0`;

  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(url, { headers: UA, cache: "no-store" });
    if (r.status === 429) { await sleep(4000 * (attempt + 1)); continue; }
    if (!r.ok) return NextResponse.json({ error: `Steam returned ${r.status}` }, { status: 502 });
    const j = await r.json();
    const cards = (j.results || []).map((x: any) => ({
      hash: x.hash_name, name: x.name, price: x.sell_price, priceText: x.sell_price_text,
      icon: x.asset_description?.icon_url ? `https://community.cloudflare.steamstatic.com/economy/image/${x.asset_description.icon_url}/96fx96f` : null,
    }));
    setCache(appid, cards);
    return NextResponse.json({ cards });
  }
  return NextResponse.json({ error: "Rate limited by Steam" }, { status: 429 });
}
