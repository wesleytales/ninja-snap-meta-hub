import { NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const clientId = (process.env.NINJA_CLIENT_ID || "").trim();
  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/auth/callback`;

  // 1. Gera um code_verifier de 64 caracteres alfanuméricos seguros
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const randomBytes = crypto.randomBytes(64);
  let codeVerifier = "";
  for (let i = 0; i < 64; i++) {
    codeVerifier += charset[randomBytes[i] % charset.length];
  }

  // 2. Gera o code_challenge (SHA-256 do verifier em Base64URL sem padding)
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier, "ascii")
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  // 3. Gera state anti-CSRF
  const state = crypto.randomBytes(16).toString("hex");

  // 4. Salva nos cookies do navegador
  const cookieStore = await cookies();
  cookieStore.set("oauth_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  // 5. Monta a URL de autorização oficial
  const authUrl = new URL("https://api.ninja-snap.com/oauth/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  return NextResponse.redirect(authUrl.toString());
}