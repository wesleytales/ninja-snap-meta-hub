"use client";

import { useEffect, useState, useMemo } from "react";

interface Card {
  id: string;
  name: string;
  chakra: number;
  power: number;
  type?: string;
  ability?: {
    text: string;
  };
  winRate?: number | null;
  averageCubes?: number | null;
  deckPlayersPercent?: number | null;
}

interface MetaDeck {
  id: string;
  title: string;
  archetype: string;
  author: string;
  minElo: number;
  maxElo: number;
  rankTierName: string;
  totalGames: number;
  winRate: number;
  avgCubes: number;
  upvotes: number;
  downvotes: number;
  cards: Card[];
  isPremium?: boolean;
}

export default function Home() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Abas: "deckstier", "tierlist", "builder", "catalog"
  const [abaAtiva, setAbaAtiva] = useState<"deckstier" | "tierlist" | "builder" | "catalog">("deckstier");

  // Minha Coleção
  const [minhaColecao, setMinhaColecao] = useState<string[]>([]);
  const [modalColecaoAberto, setModalColecaoAberto] = useState(false);

  // Decks e Votos
  const [decksLista, setDecksLista] = useState<MetaDeck[]>([]);
  const [meusVotos, setMeusVotos] = useState<Record<string, "up" | "down">>({});

  // Filtros de Decks (Untapped.gg style)
  const [deckFiltroElo, setDeckFiltroElo] = useState<"all" | "0-29" | "30-59" | "60-89" | "90+">("all");
  const [deckFiltroColecao, setDeckFiltroColecao] = useState<"all" | "craftable" | "missing-1" | "missing-2">("all");
  const [deckOrdenacao, setDeckOrdenacao] = useState<"untapped" | "winrate" | "games" | "cubes">("untapped");
  const [deckBusca, setDeckBusca] = useState("");

  // Filtros Tier List
  const [tierBusca, setTierBusca] = useState("");
  const [tierChakra, setTierChakra] = useState<number | "all">("all");
  const [tierOrdenacao, setTierOrdenacao] = useState<"winrate" | "cubes" | "popularity">("winrate");
  const [limiteExibicao, setLimiteExibicao] = useState(24);

  // Deck Builder
  const [deck, setDeck] = useState<Card[]>([]);
  const [nomeDeck, setNomeDeck] = useState("Meu Deck Ninja");
  const [builderBusca, setBuilderBusca] = useState("");
  const [builderChakra, setBuilderChakra] = useState<number | "all">("all");
  const [builderHabilidade, setBuilderHabilidade] = useState<string>("all");
  const [copiado, setCopiado] = useState(false);

  // Filtros Catálogo
  const [catalogBusca, setCatalogBusca] = useState("");
  const [catalogChakra, setCatalogChakra] = useState<number | "all">("all");

  const tiposHabilidades = [
    { id: "all", label: "Todas" },
    { id: "revelar", label: "⚡ Ao Revelar", match: ["ao revelar", "ao ser jogada", "ao entrar"] },
    { id: "constante", label: "🛡️ Constante", match: ["constante", "passiva"] },
    { id: "clone", label: "👥 Clones", match: ["clone", "clones"] },
    { id: "mover", label: "🌪️ Mover", match: ["mover", "move", "moviment"] },
    { id: "destruir", label: "💥 Destruição", match: ["destru", "destrói", "destrua", "destruído"] },
    { id: "buff", label: "💪 Ganha Poder", match: ["ganha +", "+ de poder", "+ poder", "concede +"] },
    { id: "debuff", label: "📉 Reduz Poder", match: ["reduz", "- de poder", "- poder", "reduzindo"] },
  ];

  // Carrega coleção salva
  useEffect(() => {
    const salva = localStorage.getItem("ninja_snap_collection");
    if (salva) {
      try {
        setMinhaColecao(JSON.parse(salva));
      } catch (e) {}
    }
  }, []);

  const salvarColecao = (nova: string[]) => {
    setMinhaColecao(nova);
    localStorage.setItem("ninja_snap_collection", JSON.stringify(nova));
  };

  const toggleCartaNaColecao = (id: string) => {
    if (minhaColecao.includes(id)) {
      salvarColecao(minhaColecao.filter((c) => c !== id));
    } else {
      salvarColecao([...minhaColecao, id]);
    }
  };

  // Carrega catálogo e estatísticas
  useEffect(() => {
    async function carregarTudo() {
      try {
        setLoading(true);
        const resCards = await fetch("/api/cards");
        const dataCards = await resCards.json();

        const resStats = await fetch("/api/stats?days=30");
        const dataStats = await resStats.json();

        const listaCartas: Card[] = dataCards.data || [];
        const listaStats = dataStats.cards || [];

        const cartasCompletas = listaCartas.map((card) => {
          const stat = listaStats.find((s: any) => s.id === card.id);
          const rawWr = stat?.winRate ?? null;
          return {
            ...card,
            winRate: rawWr !== null && rawWr !== undefined ? (rawWr > 1 ? rawWr : rawWr * 100) : null,
            averageCubes: stat?.averageCubes ?? null,
            deckPlayersPercent: stat?.deckPlayersPercent ?? null,
          };
        });

        setCards(cartasCompletas);

        if (!localStorage.getItem("ninja_snap_collection") && cartasCompletas.length > 0) {
          const iniciais = cartasCompletas.slice(0, 45).map((c) => c.id);
          salvarColecao(iniciais);
        }

        if (cartasCompletas.length >= 12) {
          const getCards = (ids: string[]) => {
            const enc = ids.map((id) => cartasCompletas.find((c) => c.id === id)).filter(Boolean) as Card[];
            if (enc.length < 12) {
              const extras = cartasCompletas.filter((c) => !enc.some((e) => e.id === c.id)).slice(0, 12 - enc.length);
              return [...enc, ...extras];
            }
            return enc.slice(0, 12);
          };

          setDecksLista([
            {
              id: "deck-meta-1",
              title: "Itachi Control & Disruption",
              archetype: "Controle / Hand Disruption",
              author: "Tsunoby",
              minElo: 90,
              maxElo: 100,
              rankTierName: "Hokage (90+)",
              isPremium: true,
              winRate: 61.8,
              totalGames: 3420,
              avgCubes: 0.84,
              upvotes: 45,
              downvotes: 3,
              cards: getCards(["condor", "chocho", "itachi", "pain", "madara", "shikamaru", "neji", "kakashi", "sakura", "sasuke", "naruto", "gaara"]),
            },
            {
              id: "deck-meta-2",
              title: "Kage Sand Ongoing Fortress",
              archetype: "Constante / Defesa",
              author: "Kazekage_Main",
              minElo: 60,
              maxElo: 89,
              rankTierName: "Jonin (60-89)",
              winRate: 58.4,
              totalGames: 5120,
              avgCubes: 0.62,
              upvotes: 32,
              downvotes: 4,
              cards: getCards(["gaara", "benten", "choji", "chojibutterfly", "asuma", "hinata", "sasuke", "sakura", "rocklee", "neji", "kankuro", "temari"]),
            },
            {
              id: "deck-meta-3",
              title: "Shadow Clone Swarm & Buff",
              archetype: "Enxame / Multiplicação",
              author: "Uzumaki_Pro",
              minElo: 30,
              maxElo: 59,
              rankTierName: "Chunin (30-59)",
              winRate: 56.1,
              totalGames: 8940,
              avgCubes: 0.49,
              upvotes: 68,
              downvotes: 6,
              cards: getCards(["naruto", "condor", "chocho", "sakura", "hinata", "rocklee", "ebisu", "iruka", "jiraiya", "tsunade", "asuma", "choji"]),
            },
            {
              id: "deck-meta-4",
              title: "Akatsuki Destruction Tempo",
              archetype: "Destruição & Reanimação",
              author: "Nagato_Shinra",
              minElo: 90,
              maxElo: 100,
              rankTierName: "Hokage (90+)",
              isPremium: true,
              winRate: 63.2,
              totalGames: 2150,
              avgCubes: 0.95,
              upvotes: 89,
              downvotes: 5,
              cards: getCards(["pain", "itachi", "konan", "hidan", "kakuzu", "deidara", "sasori", "tobi", "orochimaru", "madara", "kabuto", "shisui"]),
            },
            {
              id: "deck-meta-5",
              title: "Iniciante: Standard Leaf Beatdown",
              archetype: "Equilibrado / Curva",
              author: "Konoha_Academy",
              minElo: 0,
              maxElo: 29,
              rankTierName: "Academia (0-29)",
              winRate: 54.0,
              totalGames: 12400,
              avgCubes: 0.38,
              upvotes: 115,
              downvotes: 12,
              cards: getCards(["naruto", "sasuke", "sakura", "kakashi", "shikamaru", "choji", "ino", "neji", "rocklee", "hinata", "kiba", "shino"]),
            },
          ]);
        }
      } catch (err) {
        setError("Erro ao carregar dados oficiais do Ninja Snap.");
      } finally {
        setLoading(false);
      }
    }

    carregarTudo();
  }, []);

  const votarNoDeck = (deckId: string, tipo: "up" | "down") => {
    if (meusVotos[deckId] === tipo) return;

    setDecksLista((prev) =>
      prev.map((d) => {
        if (d.id !== deckId) return d;
        const votoAnterior = meusVotos[deckId];
        let up = d.upvotes;
        let down = d.downvotes;

        if (tipo === "up") {
          up += 1;
          if (votoAnterior === "down") down -= 1;
        } else {
          down += 1;
          if (votoAnterior === "up") up -= 1;
        }

        return { ...d, upvotes: Math.max(0, up), downvotes: Math.max(0, down) };
      })
    );

    setMeusVotos({ ...meusVotos, [deckId]: tipo });
  };

  const decksComAnaliseColecao = useMemo(() => {
    return decksLista.map((deckItem) => {
      const cartasFaltando = deckItem.cards.filter((c) => !minhaColecao.includes(c.id));
      return {
        ...deckItem,
        missingCards: cartasFaltando,
        missingCount: cartasFaltando.length,
        isCraftable: cartasFaltando.length === 0,
      };
    });
  }, [decksLista, minhaColecao]);

  const decksFiltrados = useMemo(() => {
    return decksComAnaliseColecao
      .filter((d) => {
        const texto = deckBusca.toLowerCase();
        const bateNome = d.title.toLowerCase().includes(texto) || d.archetype.toLowerCase().includes(texto);

        let bateElo = true;
        if (deckFiltroElo === "0-29") bateElo = d.minElo <= 29 && d.maxElo <= 35;
        if (deckFiltroElo === "30-59") bateElo = d.minElo >= 30 && d.maxElo <= 59;
        if (deckFiltroElo === "60-89") bateElo = d.minElo >= 60 && d.maxElo <= 89;
        if (deckFiltroElo === "90+") bateElo = d.minElo >= 90;

        let bateColecao = true;
        if (deckFiltroColecao === "craftable") bateColecao = d.missingCount === 0;
        if (deckFiltroColecao === "missing-1") bateColecao = d.missingCount <= 1;
        if (deckFiltroColecao === "missing-2") bateColecao = d.missingCount <= 2;

        return bateNome && bateElo && bateColecao;
      })
      .sort((a, b) => {
        if (deckOrdenacao === "untapped") {
          if (b.winRate !== a.winRate) return b.winRate - a.winRate;
          if (b.totalGames !== a.totalGames) return b.totalGames - a.totalGames;
          return b.avgCubes - a.avgCubes;
        }
        if (deckOrdenacao === "winrate") return b.winRate - a.winRate;
        if (deckOrdenacao === "games") return b.totalGames - a.totalGames;
        if (deckOrdenacao === "cubes") return b.avgCubes - a.avgCubes;
        return 0;
      });
  }, [decksComAnaliseColecao, deckBusca, deckFiltroElo, deckFiltroColecao, deckOrdenacao]);

  const toggleCardNoDeck = (card: Card) => {
    const jaEsta = deck.some((c) => c.id === card.id);
    if (jaEsta) {
      setDeck(deck.filter((c) => c.id !== card.id));
    } else {
      if (deck.length >= 12) {
        alert("Seu deck já atingiu o limite máximo de 12 cartas!");
        return;
      }
      setDeck([...deck, card].sort((a, b) => a.chakra - b.chakra));
    }
  };

  const copiarCodigoDeck = (cartas: Card[], titulo: string) => {
    const texto = `[Ninja Snap - ${titulo}]\n` + cartas.map((c) => `# (${c.chakra}) ${c.name} [${c.id}]`).join("\n");
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  const cartasTierList = useMemo(() => {
    return cards
      .filter((card) => {
        const texto = tierBusca.toLowerCase();
        const bateNome = card.name.toLowerCase().includes(texto);
        const bateChakra = tierChakra === "all" ? true : tierChakra === 6 ? card.chakra >= 6 : card.chakra === tierChakra;
        return bateNome && bateChakra;
      })
      .sort((a, b) => {
        if (tierOrdenacao === "winrate") return (b.winRate ?? -999) - (a.winRate ?? -999);
        if (tierOrdenacao === "cubes") return (b.averageCubes ?? -999) - (a.averageCubes ?? -999);
        return (b.deckPlayersPercent ?? -999) - (a.deckPlayersPercent ?? -999);
      });
  }, [cards, tierBusca, tierChakra, tierOrdenacao]);

  const cartasBuilder = useMemo(() => {
    return cards
      .filter((card) => {
        const texto = builderBusca.toLowerCase();
        const hab = (card.ability?.text || "").toLowerCase();
        const bateNome = card.name.toLowerCase().includes(texto) || hab.includes(texto);
        const bateChakra = builderChakra === "all" ? true : builderChakra === 6 ? card.chakra >= 6 : card.chakra === builderChakra;

        let bateTipo = true;
        if (builderHabilidade !== "all") {
          const cfg = tiposHabilidades.find((t) => t.id === builderHabilidade);
          if (cfg?.match) bateTipo = cfg.match.some((p) => hab.includes(p));
        }

        return bateNome && bateChakra && bateTipo;
      })
      .sort((a, b) => a.chakra - b.chakra || b.power - a.power);
  }, [cards, builderBusca, builderChakra, builderHabilidade]);

  const cartasCatalogo = useMemo(() => {
    return cards
      .filter((card) => {
        const texto = catalogBusca.toLowerCase();
        const bateNome = card.name.toLowerCase().includes(texto) || (card.ability?.text || "").toLowerCase().includes(texto);
        const bateChakra = catalogChakra === "all" ? true : catalogChakra === 6 ? card.chakra >= 6 : card.chakra === catalogChakra;
        return bateNome && bateChakra;
      })
      .sort((a, b) => a.chakra - b.chakra || a.name.localeCompare(b.name));
  }, [cards, catalogBusca, catalogChakra]);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-orange-500 selection:text-white">
      {/* 1. NAVBAR FIXA NO TOPO */}
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Logo & Imagem Personalizada */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setAbaAtiva("deckstier")}>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-orange-600 via-amber-500 to-yellow-400 p-0.5 shadow-lg shadow-orange-500/20 flex items-center justify-center overflow-hidden">
              <img
                src="/logo.png"
                alt="Ninja Snap Logo"
                className="w-full h-full object-contain rounded-[14px] bg-slate-950"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                  (e.target as HTMLElement).parentElement!.innerHTML = `<span class="text-xl">🥷</span>`;
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-500">
                  NINJA SNAP
                </span>
                <span className="bg-orange-500/20 text-orange-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-orange-500/30">
                  META GG
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Estatísticas & Meta Tracker Profissional</p>
            </div>
          </div>

          {/* Menus de Navegação */}
          <nav className="hidden md:flex items-center bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl gap-1 shadow-inner">
            <button
              onClick={() => setAbaAtiva("deckstier")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                abaAtiva === "deckstier"
                  ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              🔥 Melhores Decks
            </button>
            <button
              onClick={() => { setAbaAtiva("tierlist"); setLimiteExibicao(24); }}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                abaAtiva === "tierlist"
                  ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              🏆 Tier List Cartas
            </button>
            <button
              onClick={() => setAbaAtiva("builder")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                abaAtiva === "builder"
                  ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              🃏 Deck Builder ({deck.length}/12)
            </button>
            <button
              onClick={() => { setAbaAtiva("catalog"); setLimiteExibicao(24); }}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                abaAtiva === "catalog"
                  ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              📖 Catálogo ({cards.length})
            </button>
          </nav>

          {/* Minha Coleção & Login Google */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setModalColecaoAberto(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-orange-500/50 rounded-xl text-xs font-bold transition-all shadow-md"
            >
              <span>🎴</span>
              <span className="hidden sm:inline">Minha Coleção:</span>
              <span className="text-orange-400 font-extrabold">{minhaColecao.length}/{cards.length}</span>
            </button>

            <button
              onClick={() => window.location.href = "/api/auth/login"}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl text-xs font-black shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
            >
              <span>👤</span>
              <span className="hidden sm:inline">Conectar com Google</span>
            </button>
          </div>
        </div>

        {/* Menu Mobile */}
        <div className="md:hidden flex overflow-x-auto px-4 py-2 bg-slate-900 border-t border-slate-800 gap-2">
          <button
            onClick={() => setAbaAtiva("deckstier")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${abaAtiva === "deckstier" ? "bg-orange-600 text-white" : "text-slate-400"}`}
          >
            🔥 Decks
          </button>
          <button
            onClick={() => { setAbaAtiva("tierlist"); setLimiteExibicao(24); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${abaAtiva === "tierlist" ? "bg-orange-600 text-white" : "text-slate-400"}`}
          >
            🏆 Tier List
          </button>
          <button
            onClick={() => setAbaAtiva("builder")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${abaAtiva === "builder" ? "bg-orange-600 text-white" : "text-slate-400"}`}
          >
            🃏 Builder ({deck.length}/12)
          </button>
          <button
            onClick={() => { setAbaAtiva("catalog"); setLimiteExibicao(24); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${abaAtiva === "catalog" ? "bg-orange-600 text-white" : "text-slate-400"}`}
          >
            📖 Catálogo
          </button>
        </div>
      </header>

      {/* 2. CONTEÚDO PRINCIPAL */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {loading && (
          <div className="text-center py-32">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-lg font-bold text-orange-400 tracking-wide animate-pulse">
              Carregando dados shinobi do Ninja Snap...
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-950/60 border border-red-500/80 text-red-200 p-6 rounded-2xl text-center my-8 shadow-xl">
            ❌ {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ========================================================= */}
            {/* ABA 1: MELHORES DECKS (UNTAPPED.GG + VOTAÇÃO) */}
            {/* ========================================================= */}
            {abaAtiva === "deckstier" && (
              <div className="space-y-6">
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-orange-950/40 border border-slate-800 p-6 sm:p-8 shadow-2xl">
                  <div className="relative z-10 max-w-2xl">
                    <span className="text-xs font-black tracking-widest text-orange-400 uppercase bg-orange-950/80 border border-orange-500/30 px-3 py-1 rounded-full">
                      META TRACKER OFICIAL
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-white mt-3 tracking-wide">
                      Top Decks do Meta Ranqueado
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                      Classificação estilo Untapped.gg baseada em Win Rate, volume de partidas e rendimento de cubos. Vote nos decks que funcionam para você!
                    </p>
                  </div>
                </div>

                {/* Filtros */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                    <div>
                      <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5">
                        Buscar Deck / Arquétipo:
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Itachi, Discard, Sand..."
                        value={deckBusca}
                        onChange={(e) => setDeckBusca(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5 flex items-center justify-between">
                        <span>Filtrar por Elo:</span>
                        <span className="text-[9px] text-amber-400 font-extrabold">Ranqueada</span>
                      </label>
                      <select
                        value={deckFiltroElo}
                        onChange={(e) => setDeckFiltroElo(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 cursor-pointer"
                      >
                        <option value="all">🌐 Todos os Elos (Geral)</option>
                        <option value="0-29">🌱 Academia / Genin (Elo 0 - 29)</option>
                        <option value="30-59">⚔️ Chunin / Tokubetsu (Elo 30 - 59)</option>
                        <option value="60-89">🔥 Jonin / Anbu (Elo 60 - 89)</option>
                        <option value="90+">👑 Hokage / Six Paths (Elo 90+) [PRO]</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5 flex items-center justify-between">
                        <span>Cartas na Coleção:</span>
                        <button onClick={() => setModalColecaoAberto(true)} className="text-[10px] text-orange-400 hover:underline">
                          Editar ({minhaColecao.length})
                        </button>
                      </label>
                      <select
                        value={deckFiltroColecao}
                        onChange={(e) => setDeckFiltroColecao(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 cursor-pointer"
                      >
                        <option value="all">Mostrar Todos os Decks</option>
                        <option value="craftable">✅ Posso Montar (0 faltando)</option>
                        <option value="missing-1">⚠️ Falta até 1 Carta</option>
                        <option value="missing-2">⚠️ Faltam até 2 Cartas</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5">
                        Classificar por:
                      </label>
                      <select
                        value={deckOrdenacao}
                        onChange={(e) => setDeckOrdenacao(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 cursor-pointer"
                      >
                        <option value="untapped">🔥 Meta Score (Win Rate &gt; Jogos &gt; Cubos)</option>
                        <option value="winrate">📈 Maior Taxa de Vitória (% Win Rate)</option>
                        <option value="cubes">💠 Média de Cubos Ganhos (+/-)</option>
                        <option value="games">👥 Mais Partidas Registradas</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Lista de Decks */}
                <div className="space-y-6">
                  {decksFiltrados.map((deckItem, idx) => {
                    const tier = deckItem.winRate >= 60 ? "TIER S" : deckItem.winRate >= 56 ? "TIER A" : "TIER B";
                    const tierBadge =
                      tier === "TIER S"
                        ? "bg-red-600 text-white shadow-red-600/30"
                        : tier === "TIER A"
                        ? "bg-orange-500 text-white shadow-orange-500/30"
                        : "bg-blue-600 text-white shadow-blue-600/30";

                    const meuVoto = meusVotos[deckItem.id];

                    return (
                      <div
                        key={deckItem.id}
                        className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl hover:border-slate-700 transition-all relative overflow-hidden"
                      >
                        {deckItem.isPremium && (
                          <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 via-orange-500 to-transparent text-slate-950 font-black text-[10px] tracking-wider uppercase px-6 py-1 rounded-bl-xl shadow-md">
                            ⭐ PRO META (ELO 90+)
                          </div>
                        )}

                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-5 pb-5 border-b border-slate-800">
                          <div>
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-slate-500 font-black text-sm">#{idx + 1}</span>
                              <span className={`text-xs font-black px-3 py-0.5 rounded-lg shadow ${tierBadge}`}>
                                {tier}
                              </span>
                              <h3 className="text-xl font-black text-slate-100">{deckItem.title}</h3>
                              <span className="text-[11px] font-bold text-slate-400 bg-slate-950 px-2.5 py-0.5 rounded-lg border border-slate-800">
                                {deckItem.archetype}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-2">
                              <span>Elo: <b className="text-amber-400">{deckItem.rankTierName}</b></span>
                              <span>•</span>
                              <span>Criador: <b className="text-slate-300">{deckItem.author}</b></span>
                            </p>
                          </div>

                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center bg-slate-950 px-4 py-2 rounded-2xl border border-slate-800 gap-4 text-xs">
                              <div>
                                <span className="text-[9px] uppercase font-bold text-slate-500 block">Win Rate</span>
                                <span className="text-sm font-black text-green-400">{deckItem.winRate.toFixed(1)}%</span>
                              </div>
                              <div className="border-l border-slate-800 pl-4">
                                <span className="text-[9px] uppercase font-bold text-slate-500 block">Média Cubos</span>
                                <span className="text-sm font-black text-orange-400">+{deckItem.avgCubes.toFixed(2)}</span>
                              </div>
                              <div className="border-l border-slate-800 pl-4">
                                <span className="text-[9px] uppercase font-bold text-slate-500 block">Amostragem</span>
                                <span className="text-sm font-black text-slate-300">{deckItem.totalGames.toLocaleString("pt-BR")} jogos</span>
                              </div>
                            </div>

                            {/* Botões de Voto 👍 e 👎 */}
                            <div className="flex items-center bg-slate-950 rounded-2xl border border-slate-800 p-1 shadow">
                              <button
                                onClick={() => votarNoDeck(deckItem.id, "up")}
                                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                                  meuVoto === "up" ? "bg-green-600 text-white shadow-lg shadow-green-600/30" : "text-slate-400 hover:text-green-400 hover:bg-slate-900"
                                }`}
                                title="Deck forte"
                              >
                                👍 {deckItem.upvotes}
                              </button>
                              <button
                                onClick={() => votarNoDeck(deckItem.id, "down")}
                                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                                  meuVoto === "down" ? "bg-red-600 text-white shadow-lg shadow-red-600/30" : "text-slate-400 hover:text-red-400 hover:bg-slate-900"
                                }`}
                                title="Não recomendado"
                              >
                                👎 {deckItem.downvotes}
                              </button>
                            </div>

                            {/* Status de Coleção */}
                            {deckItem.missingCount === 0 ? (
                              <span className="bg-green-950/80 border border-green-500/50 text-green-300 text-xs font-black px-3 py-2 rounded-xl">
                                ✓ Pronto p/ Jogar
                              </span>
                            ) : (
                              <span className="bg-amber-950/80 border border-amber-500/50 text-amber-300 text-xs font-black px-3 py-2 rounded-xl">
                                Falta {deckItem.missingCount} {deckItem.missingCount === 1 ? "carta" : "cartas"}
                              </span>
                            )}

                            <button
                              onClick={() => copiarCodigoDeck(deckItem.cards, deckItem.title)}
                              className="px-4 py-2 bg-slate-800 hover:bg-orange-600 text-xs font-black rounded-xl text-slate-200 hover:text-white transition-all shadow-md cursor-pointer"
                            >
                              📋 Copiar
                            </button>
                          </div>
                        </div>

                        {/* Grade das 12 cartas com Chakra e Poder */}
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2.5">
                          {deckItem.cards.map((card) => {
                            const possuiNaColecao = minhaColecao.includes(card.id);

                            return (
                              <div
                                key={card.id}
                                className={`group relative bg-slate-950 border rounded-2xl overflow-hidden shadow transition-all hover:scale-105 ${
                                  possuiNaColecao ? "border-slate-800 hover:border-orange-500" : "border-red-500/40 opacity-50 grayscale"
                                }`}
                              >
                                <div className="relative aspect-[512/768] w-full">
                                  <div className="absolute top-1 left-1 z-10 bg-blue-600 border border-slate-950 text-white font-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center shadow">
                                    {card.chakra}
                                  </div>
                                  <div className="absolute top-1 right-1 z-10 bg-orange-600 border border-slate-950 text-white font-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center shadow">
                                    {card.power}
                                  </div>

                                  {!possuiNaColecao && (
                                    <div className="absolute inset-0 bg-red-950/70 flex items-center justify-center z-20">
                                      <span className="text-[10px] font-black text-red-300 bg-red-900/90 px-1.5 py-0.5 rounded">
                                        Falta
                                      </span>
                                    </div>
                                  )}

                                  <img
                                    src={`/api/art/${card.id}`}
                                    alt={card.name}
                                    loading="lazy"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = "none";
                                    }}
                                  />
                                </div>
                                <div className="p-1.5 text-center bg-slate-900">
                                  <p className="text-[10px] font-bold text-slate-200 truncate">{card.name}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* ABA 2: TIER LIST DE CARTAS */}
            {/* ========================================================= */}
            {abaAtiva === "tierlist" && (
              <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <div>
                    <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5">Buscar Carta:</label>
                    <input
                      type="text"
                      placeholder="Ex: Condor, Chôchô, Itachi..."
                      value={tierBusca}
                      onChange={(e) => setTierBusca(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5">Ordenar por:</label>
                    <select
                      value={tierOrdenacao}
                      onChange={(e) => setTierOrdenacao(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 cursor-pointer"
                    >
                      <option value="winrate">🔥 Maior Taxa de Vitória (Win Rate)</option>
                      <option value="cubes">💠 Média de Cubos (+/-)</option>
                      <option value="popularity">👥 Mais Populares no Meta</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5">Custo Chakra:</label>
                    <div className="flex gap-1 flex-wrap">
                      {(["all", 1, 2, 3, 4, 5, 6] as const).map((valor) => (
                        <button
                          key={valor}
                          onClick={() => setTierChakra(valor)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                            tierChakra === valor ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {valor === "all" ? "Todos" : valor === 6 ? "6+" : valor}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {cartasTierList.slice(0, limiteExibicao).map((card, idx) => (
                    <div
                      key={card.id}
                      className="group bg-slate-900 border border-slate-800 hover:border-orange-500 rounded-2xl overflow-hidden flex flex-col justify-between shadow-xl hover:scale-105 transition-all duration-300"
                    >
                      <div className="relative aspect-[512/768] w-full bg-slate-950 overflow-hidden">
                        <div className="absolute top-2 left-2 z-10 bg-slate-950/80 border border-slate-700 text-slate-300 font-extrabold text-[11px] px-2 py-0.5 rounded-md shadow">
                          #{idx + 1}
                        </div>

                        {/* Custo e Poder na Tier List */}
                        <div className="absolute top-2 right-2 z-10 bg-blue-600 border border-slate-950 text-white font-black text-xs w-7 h-7 rounded-full flex items-center justify-center shadow-lg">
                          {card.chakra}
                        </div>
                        <div className="absolute bottom-2 right-2 z-10 bg-orange-600 border border-slate-950 text-white font-black text-xs w-7 h-7 rounded-full flex items-center justify-center shadow-lg">
                          {card.power}
                        </div>

                        <img
                          src={`/api/art/${card.id}`}
                          alt={card.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      </div>

                      <div className="p-3 bg-slate-900/95 flex flex-col justify-between flex-grow gap-2">
                        <h3 className="font-bold text-xs text-slate-100 truncate">{card.name}</h3>
                        <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-800 text-center text-xs">
                          <span className="text-green-400 font-bold">{card.winRate ? `${card.winRate.toFixed(1)}%` : "-"}</span>
                          <span className="text-orange-400 font-bold">{card.averageCubes ? `${card.averageCubes > 0 ? "+" : ""}${card.averageCubes.toFixed(2)}` : "-"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {limiteExibicao < cartasTierList.length && (
                  <div className="text-center pt-4">
                    <button
                      onClick={() => setLimiteExibicao((prev) => prev + 24)}
                      className="px-6 py-3 bg-slate-900 hover:bg-orange-600 border border-slate-800 hover:border-orange-500 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer"
                    >
                      Exibir Mais Cartas ({limiteExibicao} de {cartasTierList.length}) ⬇️
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* ABA 3: DECK BUILDER */}
            {/* ========================================================= */}
            {abaAtiva === "builder" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col justify-between h-fit sticky top-24">
                  <div>
                    <input
                      type="text"
                      value={nomeDeck}
                      onChange={(e) => setNomeDeck(e.target.value)}
                      className="bg-slate-950 border border-slate-800 text-base font-bold text-orange-400 rounded-xl px-3 py-2 w-full focus:outline-none focus:border-orange-500 mb-4"
                    />

                    <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
                      {deck.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-10">
                          Clique nas cartas ao lado para montar seu deck de 12 cartas.
                        </p>
                      ) : (
                        deck.map((card) => (
                          <div
                            key={card.id}
                            onClick={() => toggleCardNoDeck(card)}
                            className="flex items-center justify-between bg-slate-950 hover:bg-red-950/30 border border-slate-800 hover:border-red-500/50 p-2 rounded-xl cursor-pointer transition-all group"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="bg-blue-600 text-white font-black text-xs w-6 h-6 rounded-full flex items-center justify-center">
                                {card.chakra}
                              </span>
                              <span className="text-xs font-bold text-slate-200">{card.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="bg-orange-600 text-white font-black text-xs w-6 h-6 rounded-full flex items-center justify-center">
                                {card.power}
                              </span>
                              <span className="text-slate-500 group-hover:text-red-400 text-xs font-bold px-1">✕</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-800">
                    <button
                      onClick={() => copiarCodigoDeck(deck, nomeDeck)}
                      disabled={deck.length === 0}
                      className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black transition-all shadow-lg cursor-pointer"
                    >
                      {copiado ? "✓ Código Copiado!" : `📋 Copiar Código (${deck.length}/12)`}
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                      <input
                        type="text"
                        placeholder="Buscar ninja..."
                        value={builderBusca}
                        onChange={(e) => setBuilderBusca(e.target.value)}
                        className="w-full sm:w-1/2 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                      />
                      <div className="flex gap-1 flex-wrap">
                        {(["all", 1, 2, 3, 4, 5, 6] as const).map((v) => (
                          <button
                            key={v}
                            onClick={() => setBuilderChakra(v)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold ${builderChakra === v ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}
                          >
                            {v === "all" ? "Todos" : v === 6 ? "6+" : v}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-1.5 flex-wrap">
                      {tiposHabilidades.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setBuilderHabilidade(t.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${builderHabilidade === t.id ? "bg-orange-600 text-white" : "bg-slate-950 text-slate-400 border border-slate-800"}`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {cartasBuilder.map((card) => {
                      const sel = deck.some((c) => c.id === card.id);
                      return (
                        <div
                          key={card.id}
                          onClick={() => toggleCardNoDeck(card)}
                          className={`group relative bg-slate-900 border rounded-2xl overflow-hidden flex flex-col justify-between cursor-pointer transition-all hover:scale-105 shadow-xl ${
                            sel ? "border-green-500 ring-2 ring-green-500/40" : "border-slate-800 hover:border-orange-500"
                          }`}
                        >
                          <div className="relative aspect-[512/768] w-full bg-slate-950">
                            {sel && (
                              <div className="absolute inset-0 bg-slate-950/75 flex items-center justify-center z-20">
                                <span className="bg-green-600 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-xl">
                                  ✓ No Deck
                                </span>
                              </div>
                            )}
                            <div className="absolute top-2 left-2 z-10 bg-blue-600 border border-slate-950 text-white font-black text-xs w-7 h-7 rounded-full flex items-center justify-center shadow-lg">
                              {card.chakra}
                            </div>
                            <div className="absolute top-2 right-2 z-10 bg-orange-600 border border-slate-950 text-white font-black text-xs w-7 h-7 rounded-full flex items-center justify-center shadow-lg">
                              {card.power}
                            </div>
                            <img src={`/api/art/${card.id}`} alt={card.name} loading="lazy" className="w-full h-full object-cover" />
                          </div>
                          <div className="p-3 bg-slate-900/95">
                            <h4 className="font-bold text-xs text-slate-100 mb-1 truncate">{card.name}</h4>
                            <p className="text-[10px] text-slate-300 line-clamp-2 leading-tight">{card.ability?.text || "Sem efeito."}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* ABA 4: CATÁLOGO COMPLETO */}
            {/* ========================================================= */}
            {abaAtiva === "catalog" && (
              <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <input
                    type="text"
                    placeholder="Filtrar catálogo completo..."
                    value={catalogBusca}
                    onChange={(e) => setCatalogBusca(e.target.value)}
                    className="w-full sm:w-1/2 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                  />
                  <div className="flex gap-1.5 flex-wrap">
                    {(["all", 1, 2, 3, 4, 5, 6] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setCatalogChakra(v)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold ${catalogChakra === v ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}
                      >
                        {v === "all" ? "Todos" : v === 6 ? "6+" : v}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-400 px-1">
                  <span>Exibindo <b>{Math.min(limiteExibicao, cartasCatalogo.length)}</b> de <b>{cartasCatalogo.length}</b> cartas</span>
                  {limiteExibicao < cartasCatalogo.length && (
                    <button
                      onClick={() => setLimiteExibicao(cartasCatalogo.length)}
                      className="text-orange-400 hover:underline font-bold cursor-pointer"
                    >
                      Mostrar Todas de Uma Vez ({cartasCatalogo.length})
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {cartasCatalogo.slice(0, limiteExibicao).map((card) => (
                    <div key={card.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between hover:border-orange-500 transition-all">
                      <div className="relative aspect-[512/768] w-full bg-slate-950">
                        {/* CUSTO E DANO NO CATÁLOGO */}
                        <div className="absolute top-2 left-2 z-10 bg-blue-600 border border-slate-950 text-white font-black text-xs w-7 h-7 rounded-full flex items-center justify-center shadow-lg">
                          {card.chakra}
                        </div>
                        <div className="absolute top-2 right-2 z-10 bg-orange-600 border border-slate-950 text-white font-black text-xs w-7 h-7 rounded-full flex items-center justify-center shadow-lg">
                          {card.power}
                        </div>

                        <img src={`/api/art/${card.id}`} alt={card.name} loading="lazy" className="w-full h-full object-cover" />
                      </div>
                      <div className="p-3 bg-slate-900/95">
                        <h3 className="font-bold text-sm text-slate-100 mb-1 truncate">{card.name}</h3>
                        <p className="text-[11px] text-slate-300 leading-snug line-clamp-3">{card.ability?.text || "Sem efeito."}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Botões de Carregar Mais */}
                {limiteExibicao < cartasCatalogo.length && (
                  <div className="flex justify-center gap-3 pt-6">
                    <button
                      onClick={() => setLimiteExibicao((prev) => prev + 36)}
                      className="px-6 py-3 bg-slate-900 hover:bg-orange-600 border border-slate-800 hover:border-orange-500 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer"
                    >
                      Exibir Mais (+36) ⬇️
                    </button>
                    <button
                      onClick={() => setLimiteExibicao(cartasCatalogo.length)}
                      className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer"
                    >
                      Carregar Todas ({cartasCatalogo.length})
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* 3. MODAL DE COLEÇÃO */}
      {modalColecaoAberto && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <span>🎴</span> Minha Coleção de Ninjas
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Marque as cartas que você possui para ver os decks prontos para jogar!
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => salvarColecao(cards.map((c) => c.id))}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg text-slate-300"
                >
                  Marcar Todas
                </button>
                <button
                  onClick={() => salvarColecao([])}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg text-slate-300"
                >
                  Desmarcar Todas
                </button>
                <button
                  onClick={() => setModalColecaoAberto(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-red-600 text-white font-bold flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {cards.map((card) => {
                const possui = minhaColecao.includes(card.id);

                return (
                  <div
                    key={card.id}
                    onClick={() => toggleCartaNaColecao(card.id)}
                    className={`relative rounded-xl overflow-hidden border cursor-pointer transition-all ${
                      possui
                        ? "border-green-500 ring-2 ring-green-500/40 opacity-100 scale-100"
                        : "border-slate-800 opacity-40 grayscale hover:opacity-75"
                    }`}
                  >
                    <div className="aspect-[512/768] w-full bg-slate-950 relative">
                      <div className="absolute top-1 left-1 z-10 bg-blue-600 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                        {card.chakra}
                      </div>
                      <div className="absolute top-1 right-1 z-10 bg-orange-600 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                        {card.power}
                      </div>
                      <img src={`/api/art/${card.id}`} alt={card.name} loading="lazy" className="w-full h-full object-cover" />
                    </div>
                    <p className="text-[10px] font-bold text-center py-1 bg-slate-900 truncate px-1 text-slate-200">
                      {card.name}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400">
                Total na coleção: <b className="text-orange-400">{minhaColecao.length}</b> de {cards.length} ninjas
              </span>
              <button
                onClick={() => setModalColecaoAberto(false)}
                className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-xl shadow-lg cursor-pointer"
              >
                Salvar Coleção
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}