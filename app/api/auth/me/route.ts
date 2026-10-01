import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const playerToken = cookieStore.get("player_access_token")?.value;

    if (!playerToken) {
      return NextResponse.json({ loggedIn: false }, { status: 200 });
    }

    // Consulta as últimas 10 partidas da sua conta real no jogo
    const matchesRes = await fetch("https://api.ninja-snap.com/v1/me/matches", {
      headers: {
        Authorization: `Bearer ${playerToken}`,
      },
    });

    if (!matchesRes.ok) {
      return NextResponse.json({ loggedIn: false }, { status: 200 });
    }

    const matchesData = await matchesRes.json();

    return NextResponse.json({
      loggedIn: true,
      matches: matchesData.data || [],
    });
  } catch (error) {
    return NextResponse.json({ loggedIn: false }, { status: 500 });
  }
}