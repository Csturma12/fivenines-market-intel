import { NextResponse } from "next/server";

const EIA_BASE = "https://api.eia.gov/v2";

export async function GET() {
  const apiKey = process.env.EIA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "EIA_API_KEY not configured" }, { status: 500 });
  }

  try {
    // Weekly retail diesel prices (US average)
    const dieselRes = await fetch(
      `${EIA_BASE}/petroleum/pri/wfr/data/?api_key=${apiKey}&frequency=weekly&data[0]=value&facets[product][]=EPD2DXL0&facets[duoarea][]=NUS&sort[0][column]=period&sort[0][direction]=desc&length=12`,
      { next: { revalidate: 3600 } }
    );

    if (!dieselRes.ok) {
      throw new Error(`EIA API error: ${dieselRes.status}`);
    }

    const dieselData = await dieselRes.json();
    const rows = dieselData?.response?.data ?? [];

    const prices = rows.map((r: Record<string, unknown>) => ({
      date: r.period,
      price: Number(r.value),
      unit: "$/gallon",
    }));

    const latest = prices[0] ?? null;
    const prev = prices[1] ?? null;
    const weekChange = latest && prev ? (latest.price - prev.price).toFixed(3) : null;

    return NextResponse.json({
      latest,
      weekChange: weekChange ? Number(weekChange) : null,
      history: prices,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Fuel API error:", err);
    return NextResponse.json({ error: "Failed to fetch fuel data" }, { status: 502 });
  }
}
