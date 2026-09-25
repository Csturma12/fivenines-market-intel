"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface FuelData {
  latest: { date: string; price: number; unit: string } | null;
  weekChange: number | null;
  history: Array<{ date: string; price: number }>;
  updatedAt: string;
  error?: string;
}

interface MacroMetric {
  label: string;
  value: number | null;
  prevValue: number | null;
  change: number | null;
  date: string | null;
}

interface MacroData {
  metrics: MacroMetric[];
  updatedAt: string;
  error?: string;
}

interface Article {
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedDate: string | null;
}

interface NewsData {
  articles: Article[];
  updatedAt: string;
  error?: string;
}

function Badge({
  value,
  prefix = "",
  neutral = false,
}: {
  value: number | null;
  prefix?: string;
  neutral?: boolean;
}) {
  if (value === null) return <span className="text-gray-400 text-sm">—</span>;
  const up = value >= 0;
  const colorClass = neutral
    ? up
      ? "text-blue-600"
      : "text-slate-500"
    : up
    ? "text-red-600"
    : "text-green-600";
  return (
    <span className={`inline-flex items-center text-sm font-medium ${colorClass}`}>
      {up ? "▲" : "▼"} {prefix}
      {Math.abs(value).toFixed(3)}
    </span>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center h-20">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function Dashboard() {
  const [fuel, setFuel] = useState<FuelData | null>(null);
  const [macro, setMacro] = useState<MacroData | null>(null);
  const [news, setNews] = useState<NewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const fetchGenRef = useRef(0);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const gen = ++fetchGenRef.current;

    const [fuelRes, macroRes, newsRes] = await Promise.allSettled([
      fetch("/api/fuel").then((r) => r.json()),
      fetch("/api/macro").then((r) => r.json()),
      fetch("/api/news").then((r) => r.json()),
    ]);

    if (gen !== fetchGenRef.current) return;

    let anySuccess = false;
    if (fuelRes.status === "fulfilled") {
      setFuel(fuelRes.value);
      if (!fuelRes.value.error) anySuccess = true;
    }
    if (macroRes.status === "fulfilled") {
      setMacro(macroRes.value);
      if (!macroRes.value.error) anySuccess = true;
    }
    if (newsRes.status === "fulfilled") {
      setNews(newsRes.value);
      if (!newsRes.value.error) anySuccess = true;
    }

    if (anySuccess) setLastRefresh(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const sortedHistory = fuel?.history
    ? [...fuel.history].slice(0, 12).sort((a, b) => a.date.localeCompare(b.date))
    : [];

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#0f2444] text-white px-6 py-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Five Nines Market Intelligence</h1>
            <p className="text-blue-200 text-sm mt-0.5">Live freight market data · Updated every 5 min</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-blue-200 text-xs hidden sm:block">
              {lastRefresh ? `Last refresh: ${lastRefresh.toLocaleTimeString()}` : "Loading…"}
            </span>
            <button
              onClick={fetchAll}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Fuel Section */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">⛽ Diesel Fuel Prices</h2>
          {loading && !fuel ? (
            <Spinner />
          ) : fuel?.error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
              {fuel.error}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">US Avg Retail Diesel</div>
                <div className="text-3xl font-bold text-gray-900">
                  ${fuel?.latest?.price?.toFixed(3) ?? "—"}
                  <span className="text-base font-normal text-gray-400 ml-1">/gal</span>
                </div>
                <div className="mt-1 text-xs text-gray-500">as of {fuel?.latest?.date ?? "—"}</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Week-over-Week Change
                </div>
                <div className="text-2xl font-bold mt-2">
                  <Badge value={fuel?.weekChange ?? null} prefix="$" />
                </div>
                <div className="mt-1 text-xs text-gray-500">vs prior week</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">12-Week Trend</div>
                <div className="flex items-end gap-0.5 h-10">
                  {sortedHistory.map((p, i) => {
                    const prices = sortedHistory.map((x) => x.price);
                    const min = Math.min(...prices);
                    const max = Math.max(...prices);
                    const pct = max === min ? 50 : ((p.price - min) / (max - min)) * 100;
                    return (
                      <div
                        key={i}
                        className="flex-1 bg-blue-500 rounded-sm opacity-80"
                        style={{ height: `${Math.max(10, pct)}%` }}
                        title={`${p.date}: $${p.price}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Macro Section */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">📊 Freight Macro Indicators</h2>
          {loading && !macro ? (
            <Spinner />
          ) : macro?.error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
              {macro.error}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {(macro?.metrics ?? []).map((m) => (
                <div key={m.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">{m.label}</div>
                  <div className="text-xl font-bold text-gray-900">
                    {m.value != null ? m.value.toFixed(1) : "—"}
                  </div>
                  <div className="mt-1">
                    <Badge value={m.change} neutral />
                  </div>
                  <div className="mt-1 text-xs text-gray-400">{m.date ?? ""}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* News Section */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">📰 Freight Industry News</h2>
          {loading && !news ? (
            <Spinner />
          ) : news?.error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
              {news.error}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(news?.articles ?? []).map((a, i) => (
                <a
                  key={i}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:border-blue-300 hover:shadow-md transition-all block"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      {a.source}
                    </span>
                    {a.publishedDate && (
                      <span className="text-xs text-gray-400">{a.publishedDate}</span>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-gray-900 leading-snug">{a.title}</div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{a.snippet}</p>
                </a>
              ))}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-gray-400 pt-4 pb-8 border-t border-gray-200">
          Data: EIA.gov · FRED / St. Louis Fed · Tavily News Search &nbsp;·&nbsp; Five Nines Logistics ©{" "}
          {new Date().getFullYear()}
        </footer>
      </div>
    </main>
  );
}
