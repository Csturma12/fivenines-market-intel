import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "TAVILY_API_KEY not configured" }, { status: 500 });
  }

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: "freight rates diesel fuel surcharge trucking market 2025",
        search_depth: "basic",
        include_answer: false,
        max_results: 8,
        include_domains: ["freightwaves.com", "ttnews.com", "fleetowner.com", "truckinginfo.com", "overdriveonline.com"],
      }),
      next: { revalidate: 1800 },
    });

    if (!res.ok) {
      throw new Error(`Tavily error: ${res.status}`);
    }

    const data = await res.json();
    const articles = (data.results ?? []).map((r: Record<string, unknown>) => ({
      title: r.title,
      url: r.url,
      snippet: r.content,
      source: new URL(String(r.url)).hostname.replace("www.", ""),
      publishedDate: r.published_date ?? null,
    }));

    return NextResponse.json({ articles, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error("News API error:", err);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 502 });
  }
}
