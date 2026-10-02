"use client";
import { useState, useEffect } from "react";
import { Search, ShieldCheck, TrendingUp, Loader2, ArrowRightLeft, Layers, LogOut, ExternalLink } from "lucide-react";

type Card = { hash: string; name: string; qty: number; icon: string };
type Priced = { hash: string; name: string; price: number; priceText: string; icon: string | null };
type Row = { appid: string; name: string; mine: Card; minePrice: number; minePriceText: string; top: Priced; gap: number; pct: number; ownsTop: boolean; setSize: number };

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function Home() {
  const [input, setInput] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<"idle" | "inv" | "prices" | "done">("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState("");
  const [skipped, setSkipped] = useState(0);
  const [sort, setSort] = useState<"gap" | "pct" | "top">("gap");
  const [user, setUser] = useState<{ id: string; name: string; avatar: string } | null>(null);
  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((j) => setUser(j.user));
    if (new URLSearchParams(location.search).get("login") === "failed") setError("Steam sign-in failed. Try again.");
  }, []);
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); setUser(null); setRows([]); setStatus("idle"); }

  async function run() {
    setError(""); setRows([]); setSkipped(0);
    if (!user && !input.trim()) return setError("Enter a Steam ID or profile URL first.");
    setStatus("inv");
    try {
      const res = await fetch(user ? "/api/inventory" : `/api/inventory?id=${encodeURIComponent(input)}`);
      const inv = await res.json();
      if (!res.ok) throw new Error(inv.error);
      if (!inv.games.length) { setStatus("done"); return setError("No regular trading cards found in this inventory."); }
      setStatus("prices"); setProgress({ done: 0, total: inv.games.length });
      let skip = 0;
      for (let i = 0; i < inv.games.length; i++) {
        const g = inv.games[i];
        try {
          const pr = await fetch(`/api/prices?appid=${g.appid}`);
          const pj = await pr.json();
          if (!pr.ok || !pj.cards?.length) throw new Error();
          const byHash = new Map<string, Priced>(pj.cards.map((c: Priced) => [c.hash, c]));
          const top: Priced = [...pj.cards].sort((a: Priced, b: Priced) => b.price - a.price)[0];
          const owned = g.cards.map((c: Card) => ({ c, p: byHash.get(c.hash) })).filter((x: any) => x.p);
          if (!owned.length) throw new Error();
          const cheapest = owned.sort((a: any, b: any) => a.p.price - b.p.price)[0];
          const gap = top.price - cheapest.p.price;
          const row: Row = {
            appid: g.appid, name: g.name, mine: cheapest.c, minePrice: cheapest.p.price, minePriceText: cheapest.p.priceText,
            top, gap, pct: cheapest.p.price ? (gap / cheapest.p.price) * 100 : 0,
            ownsTop: g.cards.some((c: Card) => c.hash === top.hash), setSize: pj.cards.length,
          };
          if (gap > 0) setRows((r) => [...r, row]);
        } catch { skip++; setSkipped(skip); }
        setProgress({ done: i + 1, total: inv.games.length });
        if (i < inv.games.length - 1) await sleep(1500); // stay under Steam's rate limits
      }
      setStatus("done");
    } catch (e: any) { setError(e.message || "Something went wrong."); setStatus("idle"); }
  }

  const sorted = [...rows].sort((a, b) => sort === "gap" ? b.gap - a.gap : sort === "pct" ? b.pct - a.pct : b.top.price - a.top.price);
  const busy = status === "inv" || status === "prices";

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24">
      <section className="py-14 sm:py-20">
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white max-w-3xl">Swap your cheap trading cards for the priciest one in the set.</h1>
        <p className="mt-5 max-w-xl text-lg text-steam-text/80">We read your public inventory, price every card in each set on the Steam Market, and show where a one-for-one trade gains the most value.</p>
        {user ? (
          <div className="mt-8 flex items-center gap-3 text-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {user.avatar && <img src={user.avatar} alt="" className="h-8 w-8 rounded" />}
            <span>Signed in as <b>{user.name}</b></span>
            <button onClick={logout} className="ml-2 flex items-center gap-1 text-sm text-steam-text/70 hover:text-white"><LogOut className="h-4 w-4" />Sign out</button>
          </div>
        ) : (
          <a href="/api/auth/steam" className="mt-8 inline-flex items-center gap-2 rounded bg-[#1b2838] border border-steam-blue px-5 py-3 font-semibold text-white hover:bg-steam-raised">
            Sign in through Steam
          </a>
        )}
        <div className="mt-4 flex flex-col sm:flex-row gap-3 max-w-2xl">
          <label className={`relative flex-1 ${user ? "hidden" : ""}`}>
            <span className="sr-only">Steam ID 64 or profile URL</span>
            <Search className="absolute left-3 top-3.5 h-5 w-5 text-steam-text/50" />
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !busy && run()}
              placeholder="Or paste a Steam ID 64 / profile URL"
              className="w-full rounded bg-steam-panel border border-steam-raised py-3 pl-10 pr-3 text-white placeholder:text-steam-text/40 focus:outline-none focus:ring-2 focus:ring-steam-blue" />
          </label>
          <button onClick={run} disabled={busy}
            className="rounded bg-gradient-to-r from-steam-blue to-[#417a9b] px-6 py-3 font-semibold text-white hover:brightness-110 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-white">
            {busy ? "Checking…" : "Check My Inventory"}
          </button>
        </div>
        <p className="mt-4 flex items-start gap-2 text-sm text-steam-text/70 max-w-2xl">
          <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-steam-green" />
          Set Inventory and Game Details to Public in Steam, under Profile → Edit Profile → Privacy Settings. We never ask for your password.
        </p>
        {error && <p role="alert" className="mt-4 rounded border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-300 max-w-2xl">{error}</p>}
      </section>

      {status !== "idle" && (
        <section aria-live="polite">
          {busy && (
            <div className="mb-6">
              <p className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />
                {status === "inv" ? "Reading your inventory…" : `Pricing sets: ${progress.done} of ${progress.total} (paced to avoid Steam rate limits)`}</p>
              <div className="mt-2 h-1.5 rounded bg-steam-panel overflow-hidden"><div className="h-full bg-steam-blue transition-all" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 5}%` }} /></div>
            </div>
          )}
          {status === "inv" && <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-28 rounded bg-steam-panel animate-pulse" />)}</div>}

          {rows.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-xl font-semibold text-white"><TrendingUp className="h-5 w-5 text-steam-green" />{rows.length} sets with a gain</h2>
              <label className="text-sm flex items-center gap-2">Sort by
                <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="rounded bg-steam-panel border border-steam-raised px-2 py-1.5 text-white">
                  <option value="gap">Largest price gap</option><option value="pct">Largest % gain</option><option value="top">Priciest target card</option>
                </select>
              </label>
            </div>
          )}

          <ul className="space-y-3">
            {sorted.map((r) => (
              <li key={r.appid} className="rounded border border-steam-raised/60 bg-steam-panel p-4">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${r.appid}/capsule_184x69.jpg`} alt="" className="h-10 rounded" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                  <h3 className="font-semibold text-white flex-1">{r.name}</h3>
                  <span className="rounded bg-steam-green/15 px-2 py-1 text-sm font-semibold text-steam-green">+{usd(r.gap)} ({r.pct.toFixed(0)}%)</span>
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <CardBox label={`You own${r.mine.qty > 1 ? ` ×${r.mine.qty}` : ""}`} name={r.mine.name} icon={r.mine.icon} price={r.minePriceText} />
                  <ArrowRightLeft className="hidden sm:block h-5 w-5 text-steam-blue" />
                  <CardBox label={`Top of ${r.setSize}-card set`} name={r.top.name} icon={r.top.icon} price={r.top.priceText} />
                </div>
                <p className="mt-3 text-sm text-steam-text">
                  Trade <b className="text-white">{r.mine.name} ({r.minePriceText})</b> for <b className="text-white">{r.top.name} ({r.top.priceText})</b> to gain {usd(r.gap)}.
                  {r.ownsTop && <span className="text-steam-text/60"> You already own the top card.</span>}
                </p>
                <a href={`https://www.steamcardexchange.net/index.php?gamepage-appid-${r.appid}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-steam-blue hover:underline"><ExternalLink className="h-3.5 w-3.5" />See this set on Steam Card Exchange</a>
              </li>
            ))}
          </ul>

          {status === "done" && (
            <p className="mt-6 flex items-center gap-2 text-sm text-steam-text/70"><Layers className="h-4 w-4" />
              {rows.length ? "Prices are the lowest listing in USD; Steam's ~15% market fee and your trade partner's willingness aren't included." : "No sets with a price gap found."}
              {skipped > 0 && ` ${skipped} sets couldn't be priced (unlisted or rate limited).`}</p>
          )}
        </section>
      )}
    </main>
  );
}

function CardBox({ label, name, icon, price }: { label: string; name: string; icon: string | null; price: string }) {
  return (
    <div className="flex items-center gap-3 rounded bg-steam-bg/60 p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {icon ? <img src={icon} alt="" className="h-14 w-14 rounded object-cover" /> : <div className="h-14 w-14 rounded bg-steam-raised" />}
      <div className="min-w-0"><p className="text-xs text-steam-text/60">{label}</p><p className="truncate text-white">{name}</p><p className="font-semibold text-steam-blue">{price}</p></div>
    </div>
  );
}
