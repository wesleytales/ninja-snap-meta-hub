export const dynamic = "force-dynamic";

// Cache do catálogo completo em memória por 15 minutos
let cachedCards: any[] | null = null;
let cardsCacheExpiresAt = 0;

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

export async function GET() {
  try {
    const now = Date.now();
    // Se o catálogo estiver no cache, responde instantaneamente (0 milissegundos)
    if (cachedCards && now < cardsCacheExpiresAt) {
      return Response.json({
        total: cachedCards.length,
        data: cachedCards,
      });
    }

    const clientId = (process.env.NINJA_CLIENT_ID || "").trim();
    const clientSecret = (process.env.NINJA_CLIENT_SECRET || "").trim();

    const token = await getAccessToken(clientId, clientSecret);
    if (!token) {
      // Se a API falhar momentaneamente mas tivermos cache antigo, entrega o antigo
      if (cachedCards) return Response.json({ total: cachedCards.length, data: cachedCards });
      return Response.json({ error: "Falha na autenticação" }, { status: 401 });
    }

    let allCards: any[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const cardsResponse = await fetch(
        `https://api.ninja-snap.com/v1/cards?lang=pt-BR&limit=${limit}&offset=${offset}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }
      );

      if (!cardsResponse.ok) break;

      const pageData = await cardsResponse.json();
      const cardsList = pageData.data || [];

      if (cardsList.length > 0) {
        allCards = allCards.concat(cardsList);
        offset += limit;
      } else {
        hasMore = false;
      }
    }

    if (allCards.length > 0) {
      cachedCards = allCards;
      cardsCacheExpiresAt = now + 15 * 60 * 1000; // Guarda por 15 minutos
    }

    return Response.json({
      total: allCards.length,
      data: allCards,
    });
  } catch (error) {
    if (cachedCards) return Response.json({ total: cachedCards.length, data: cachedCards });
    return Response.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}