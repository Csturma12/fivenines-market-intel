import { NextResponse } from "next/server";

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";

async function fetchSeries(apiKey: string, seriesId: string, limit = 2) {
  const url = `${FRED_BASE}?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=${limit}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`FRED ${seriesId} error: ${res.status}`);
  const data = await res.json();
  return data.observations as Array<{ date: string; value: string }>;
}

export async function GET() {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "FRED_API_KEY not configured" }, { status: 500 });
  }

  try {
    const [diesel, freight, industrial, cpi] = await Promise.all([
      fetchSeries(apiKey, "WPU1542"),    // Diesel fuel PPI
      fetchSeries(apiKey, "RAILFRTCARLOADSD11"),  // Rail freight carloads
      fetchSeries(apiKey, "INDPRO"),     // Industrial production index
      fetchSeries(apiKey, "CPIAUCSL"),   // CPI all items
    ]);

    const toMetric = (obs: Array<{ date: string; value: string }>, label: string) => {
      const latest = obs[0];
      const prev = obs[1];
      const val = parseFloat(latest?.value ?? ".");
      const prevVal = parseFloat(prev?.value ?? ".");
      const change = !isNaN(val) && !isNaN(prevVal) ? val - prevVal : null;
      return {
        label,
        value: isNaN(val) ? null : val,
        prevValue: isNaN(prevVal) ? null : prevVal,
        change,
        date: latest?.date ?? null,
      };
    };

    return NextResponse.json({
      metrics: [
        toMetric(diesel, "Diesel PPI"),
        toMetric(freight, "Rail Freight Carloads"),
        toMetric(industrial, "Industrial Production"),
        toMetric(cpi, "CPI (All Items)"),
      ],
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Macro API error:", err);
    return NextResponse.json({ error: "Failed to fetch macro data" }, { status: 502 });
  }
}
