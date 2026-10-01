import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// Caminho do arquivo onde as URLs das artes ficarão salvas permanentemente no seu disco
const cacheFilePath = path.join(process.cwd(), "art-cache.json");

function lerCacheDisco(): Record<string, string> {
  try {
    if (fs.existsSync(cacheFilePath)) {
      return JSON.parse(fs.readFileSync(cacheFilePath, "utf-8"));
    }
  } catch (e) {}
  return {};
}

function salvarCacheDisco(id: string, url: string) {
  try {
    const cache = lerCacheDisco();
    cache[id] = url;
    fs.writeFileSync(cacheFilePath, JSON.stringify(cache, null, 2), "utf-8");
  } catch (e) {}
}

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

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const id = params.id;

    // 1. Busca primeiro no arquivo do seu computador (0 milissegundos!)
    const cacheDisco = lerCacheDisco();
    if (cacheDisco[id]) {
      return new Response(null, {
        status: 307,
        headers: {
          Location: cacheDisco[id],
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    const clientId = (process.env.NINJA_CLIENT_ID || "").trim();
    const clientSecret = (process.env.NINJA_CLIENT_SECRET || "").trim();

    const token = await getAccessToken(clientId, clientSecret);
    if (!token) {
      return Response.json({ error: "Sem token" }, { status: 401 });
    }

    // 2. Se não estiver no disco, busca na API oficial uma única vez
    const artResponse = await fetch(
      `https://api.ninja-snap.com/v1/cards/${id}/art?variant=original&rarity=common`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );

    if (!artResponse.ok) {
      return Response.json({ error: "Arte indisponível" }, { status: 404 });
    }

    const artData = await artResponse.json();

    if (artData?.url) {
      // Salva no arquivo local para nunca mais precisar buscar essa carta
      salvarCacheDisco(id, artData.url);

      return new Response(null, {
        status: 307,
        headers: {
          Location: artData.url,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    return Response.json({ error: "URL inválida" }, { status: 404 });
  } catch (error) {
    return Response.json({ error: "Erro interno" }, { status: 500 });
  }
}