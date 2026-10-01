import { NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const clientId = (process.env.NINJA_CLIENT_ID || "").trim();
  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/auth/callback`;

  // 1. Gera o code_verifier (chave aleatória de 32 bytes em base64url)
  const codeVerifier = crypto.randomBytes(32).toString("base64url");

  // 2. Gera o code_challenge usando SHA-256 (Padrão PKCE S256 exigido pela API)
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  // 3. Gera um state anti-CSRF para segurança
  const state = crypto.randomBytes(16).toString("hex");

  // 4. Salva o verifier e o state nos cookies
  const cookieStore = await cookies();
  cookieStore.set("oauth_code_verifier", codeVerifier, { httpOnly: true, maxAge: 600, path: "/" });
  cookieStore.set("oauth_state", state, { httpOnly: true, maxAge: 600, path: "/" });

  // 5. Monta a URL de autorização oficial do Ninja Snap
  const authUrl = new URL("https://api.ninja-snap.com/oauth/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  return NextResponse.redirect(authUrl.toString());
}