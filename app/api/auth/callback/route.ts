import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    const origin = new URL(request.url).origin;
    const redirectUri = `${origin}/api/auth/callback`;

    if (error || !code) {
      return NextResponse.redirect(`${origin}/?auth_error=negado`);
    }

    const cookieStore = await cookies();
    const savedVerifier = cookieStore.get("oauth_code_verifier")?.value;
    const savedState = cookieStore.get("oauth_state")?.value;

    // Valida o state para segurança
    if (!savedVerifier || state !== savedState) {
      return NextResponse.redirect(`${origin}/?auth_error=state_invalido`);
    }

    const clientId = (process.env.NINJA_CLIENT_ID || "").trim();
    const clientSecret = (process.env.NINJA_CLIENT_SECRET || "").trim();

    // Troca o código pelo Token do Jogador
    const tokenResponse = await fetch("https://api.ninja-snap.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
        code_verifier: savedVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      return NextResponse.redirect(`${origin}/?auth_error=falha_token`);
    }

    const tokenData = await tokenResponse.json();
    const playerToken = tokenData.access_token;

    // Salva o token do jogador nos cookies por 15 minutos
    cookieStore.set("player_access_token", playerToken, {
      httpOnly: true,
      maxAge: 900,
      path: "/",
    });

    cookieStore.delete("oauth_code_verifier");
    cookieStore.delete("oauth_state");

    return NextResponse.redirect(`${origin}/?auth=sucesso`);
  } catch (err) {
    return NextResponse.redirect(`https://ninja-snap-meta-hub.vercel.app/?auth_error=erro_interno`);
  }
}