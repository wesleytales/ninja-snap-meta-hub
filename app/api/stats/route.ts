export const dynamic = "force-dynamic";

// Cache das estatísticas por 15 minutos
let cachedStats: any[] | null = null;
let statsCacheExpiresAt = 0;

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getAccessToken(clientId: string, clientSecret: string) {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt) {
    return cachedToken;
  }

  const authHeader = "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch("https://api.ninja-snap.com/oauth/token", {
    method: "POST",
    headers: {
      "Authorization": authHeader,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!res.ok) return null;

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = now + (data.expires_in - 60) * 1000;
  return cachedToken;
}

export async function GET(request: Request) {
  try {
    const now = Date.now();
    if (cachedStats && now < statsCacheExpiresAt) {
      return Response.json({ cards: cachedStats });
    }

    const { searchParams } = new URL(request.url);
    const days = searchParams.get("days") || "30";

    const clientId = (process.env.NINJA_CLIENT_ID || "").trim();
    const clientSecret = (process.env.NINJA_CLIENT_SECRET || "").trim();

    const token = await getAccessToken(clientId, clientSecret);
    if (!token) {
      if (cachedStats) return Response.json({ cards: cachedStats });
      return Response.json({ cards: [] }, { status: 401 });
    }

    let allStatsCards: any[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const statsResponse = await fetch(
        `https://api.ninja-snap.com/v1/stats/cards?days=${days}&mode=ranked&opponents=humans&limit=${limit}&offset=${offset}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }
      );

      if (!statsResponse.ok) break;

      const statsData = await statsResponse.json();
      const list = statsData.cards || [];

      if (list.length > 0) {
        allStatsCards = allStatsCards.concat(list);
        offset += limit;
      } else {
        hasMore = false;
      }
    }

    if (allStatsCards.length > 0) {
      cachedStats = allStatsCards;
      statsCacheExpiresAt = now + 15 * 60 * 1000; // Guarda por 15 minutos
    }

    return Response.json({ cards: allStatsCards });
  } catch (error) {
    if (cachedStats) return Response.json({ cards: cachedStats });
    return Response.json({ cards: [] });
  }
}