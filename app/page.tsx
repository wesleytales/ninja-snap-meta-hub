"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";

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
  card_ids?: string[];
  isPremium?: boolean;
}

export default function Home() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Abas: "deckstier", "mydecks", "tierlist", "builder", "catalog"
  const [abaAtiva, setAbaAtiva] = useState<"deckstier" | "mydecks" | "tierlist" | "builder" | "catalog">("deckstier");

  // Nickname do Jogador
  const [meuNick, setMeuNick] = useState("Tsunoby");

  // Minha Coleção
  const [minhaColecao, setMinhaColecao] = useState<string[]>([]);
  const [modalColecaoAberto, setModalColecaoAberto] = useState(false);
  const [buscaColecaoModal, setBuscaColecaoModal] = useState("");
  const [chakraColecaoModal, setChakraColecaoModal] = useState<number | "all">("all");

  // Modal Importador de Deck
  const [modalImportarAberto, setModalImportarAberto] = useState(false);
  const [textoCodigoImportar, setTextoCodigoImportar] = useState("");

  // Decks e Votos
  const [decksLista, setDecksLista] = useState<MetaDeck[]>([]);
  const [meusVotos, setMeusVotos] = useState<Record<string, "up" | "down">>({});

  // Filtros de Decks
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
  const [autorDeck, setAutorDeck] = useState("Tsunoby");
  const [arquetipoDeck, setArquetipoDeck] = useState("Controle");
  const [builderBusca, setBuilderBusca] = useState("");
  const [builderChakra, setBuilderChakra] = useState<number | "all">("all");
  const [builderHabilidade, setBuilderHabilidade] = useState<string>("all");
  const [copiado, setCopiado] = useState(false);
  const [salvandoDeck, setSalvandoDeck] = useState(false);

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

  // Carrega coleção e nick salvos
  useEffect(() => {
    const salvaColecao = localStorage.getItem("ninja_snap_collection");
    if (salvaColecao) {
      try {
        setMinhaColecao(JSON.parse(salvaColecao));
      } catch (e) {}
    }

    const salvoNick = localStorage.getItem("ninja_snap_nick");
    if (salvoNick) {
      setMeuNick(salvoNick);
      setAutorDeck(salvoNick);
    }
  }, []);

  const salvarNick = (novo: string) => {
    setMeuNick(novo);
    setAutorDeck(novo);
    localStorage.setItem("ninja_snap_nick", novo);
  };

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

  // Carrega cartas e decks
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
          salvarColecao(cartasCompletas.slice(0, 45).map((c) => c.id));
        }

        const { data: decksDoBanco } = await supabase
          .from("decks")
          .select("*")
          .order("created_at", { ascending: false });

        if (decksDoBanco && decksDoBanco.length > 0) {
          const decksMontados: MetaDeck[] = decksDoBanco.map((d: any) => {
            const cardIds: string[] = d.card_ids || [];
            const cartasDoDeck = cardIds
              .map((id) => cartasCompletas.find((c) => c.id === id))
              .filter(Boolean) as Card[];

            return {
              id: d.id,
              title: d.title,
              archetype: d.archetype || "Geral",
              author: d.author || "Anônimo",
              minElo: d.min_elo || 0,
              maxElo: d.max_elo || 100,
              rankTierName: d.rank_tier_name || "Geral",
              totalGames: d.total_games || 1,
              winRate: d.win_rate || 50.0,
              avgCubes: d.avg_cubes || 0.0,
              upvotes: d.upvotes || 1,
              downvotes: d.downvotes || 0,
              cards: cartasDoDeck.length === 12 ? cartasDoDeck : cartasCompletas.slice(0, 12),
              isPremium: d.min_elo >= 90,
            };
          });

          setDecksLista(decksMontados);
        }
      } catch (err) {
        setError("Erro ao carregar dados oficiais do Ninja Snap.");
      } finally {
        setLoading(false);
      }
    }

    carregarTudo();
  }, []);

  // PARSER IMPORTADOR
  const importarCodigoDeck = () => {
    if (!textoCodigoImportar.trim()) return;

    const texto = textoCodigoImportar;
    const cartasEncontradas: Card[] = [];

    const matchesIds = texto.match(/\[([a-zA-Z0-9_-]+)\]/g);

    if (matchesIds && matchesIds.length > 0) {
      matchesIds.forEach((m) => {
        const idLimpo = m.replace("[", "").replace("]", "").toLowerCase().trim();
        if (idLimpo.includes("ninja") || idLimpo.includes("deck")) return;

        const carta = cards.find((c) => c.id.toLowerCase() === idLimpo);
        if (carta && !cartasEncontradas.some((c) => c.id === carta.id)) {
          cartasEncontradas.push(carta);
        }
      });
    }

    if (cartasEncontradas.length < 12) {
      cards.forEach((carta) => {
        if (
          texto.toLowerCase().includes(carta.name.toLowerCase()) &&
          !cartasEncontradas.some((c) => c.id === carta.id)
        ) {
          if (cartasEncontradas.length < 12) {
            cartasEncontradas.push(carta);
          }
        }
      });
    }

    if (cartasEncontradas.length === 0) {
      alert("❌ Não foi possível reconhecer as cartas no texto colado. Verifique o formato!");
      return;
    }

    const matchTitulo = texto.match(/\[Ninja Snap - (.*?)\]/);
    if (matchTitulo && matchTitulo[1]) {
      setNomeDeck(matchTitulo[1].trim());
    } else {
      setNomeDeck("Deck Importado");
    }

    setDeck(cartasEncontradas.sort((a, b) => a.chakra - b.chakra));
    setModalImportarAberto(false);
    setTextoCodigoImportar("");
    setAbaAtiva("builder");

    if (cartasEncontradas.length === 12) {
      alert("✅ Deck de 12 cartas importado com sucesso para o Deck Builder!");
    } else {
      alert(`⚠️ Importadas ${cartasEncontradas.length} de 12 cartas. Complete as restantes no Deck Builder!`);
    }
  };

  // Salvar no Supabase
  const publicarDeckNoBanco = async () => {
    if (deck.length !== 12) {
      alert("Para salvar o deck, selecione exatamente 12 cartas!");
      return;
    }

    try {
      setSalvandoDeck(true);

      const comWinRate = deck.filter((c) => c.winRate !== null && c.winRate !== undefined);
      const mediaWr =
        comWinRate.length > 0
          ? comWinRate.reduce((acc, c) => acc + (c.winRate || 0), 0) / comWinRate.length
          : 52.5;

      const comCubos = deck.filter((c) => c.averageCubes !== null && c.averageCubes !== undefined);
      const mediaCubos =
        comCubos.length > 0
          ? comCubos.reduce((acc, c) => acc + (c.averageCubes || 0), 0) / comCubos.length
          : 0.45;

      const cardIds = deck.map((c) => c.id);

      const novoDeckBanco = {
        title: nomeDeck.trim() || "Meu Deck Ninja",
        author: autorDeck.trim() || meuNick || "Ninja",
        archetype: arquetipoDeck,
        min_elo: 30,
        max_elo: 89,
        rank_tier_name: "Chunin / Jonin",
        win_rate: parseFloat(mediaWr.toFixed(1)),
        total_games: 1,
        avg_cubes: parseFloat(mediaCubos.toFixed(2)),
        upvotes: 1,
        downvotes: 0,
        card_ids: cardIds,
      };

      const { data, error: insertError } = await supabase
        .from("decks")
        .insert([novoDeckBanco])
        .select();

      if (insertError) throw insertError;

      const deckSalvo: MetaDeck = {
        id: data[0].id,
        title: data[0].title,
        archetype: data[0].archetype,
        author: data[0].author,
        minElo: data[0].min_elo,
        maxElo: data[0].max_elo,
        rankTierName: data[0].rank_tier_name,
        totalGames: data[0].total_games,
        winRate: data[0].win_rate,
        avgCubes: data[0].avg_cubes,
        upvotes: data[0].upvotes,
        downvotes: data[0].downvotes,
        cards: [...deck],
        isPremium: false,
      };

      setDecksLista([deckSalvo, ...decksLista]);
      salvarNick(autorDeck.trim() || meuNick);

      alert("🎉 Deck salvo com sucesso no seu perfil e no Banco de Dados!");
      setAbaAtiva("mydecks");
    } catch (err: any) {
      alert("Erro ao salvar: " + (err.message || "Tente novamente"));
    } finally {
      setSalvandoDeck(false);
    }
  };

  // Excluir Deck
  const excluirDeckDoBanco = async (deckId: string) => {
    if (!confirm("Tem certeza que deseja excluir este deck do banco de dados?")) return;

    try {
      await supabase.from("decks").delete().eq("id", deckId);
      setDecksLista((prev) => prev.filter((d) => d.id !== deckId));
      alert("Deck excluído com sucesso!");
    } catch (err) {
      alert("Erro ao excluir deck.");
    }
  };

  // Votação
  const votarNoDeck = async (deckId: string, tipo: "up" | "down") => {
    if (meusVotos[deckId] === tipo) return;

    const deckAlvo = decksLista.find((d) => d.id === deckId);
    if (!deckAlvo) return;

    let up = deckAlvo.upvotes;
    let down = deckAlvo.downvotes;
    const votoAnterior = meusVotos[deckId];

    if (tipo === "up") {
      up += 1;
      if (votoAnterior === "down") down -= 1;
    } else {
      down += 1;
      if (votoAnterior === "up") up -= 1;
    }

    up = Math.max(0, up);
    down = Math.max(0, down);

    setDecksLista((prev) =>
      prev.map((d) => (d.id === deckId ? { ...d, upvotes: up, downvotes: down } : d))
    );
    setMeusVotos({ ...meusVotos, [deckId]: tipo });

    try {
      await supabase.from("decks").update({ upvotes: up, downvotes: down }).eq("id", deckId);
    } catch (e) {}
  };

  // Meus Decks
  const meusDecksPessoais = useMemo(() => {
    const nickComparar = meuNick.toLowerCase().trim();
    return decksLista.filter(
      (d) => d.author.toLowerCase().trim() === nickComparar || d.author === "Tsunoby"
    );
  }, [decksLista, meuNick]);

  // Análise de Coleção por Deck
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

  // Filtros de Decks do Meta
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

  const carregarDeckNoBuilder = (deckAlvo: MetaDeck) => {
    setDeck([...deckAlvo.cards]);
    setNomeDeck(deckAlvo.title + " (Cópia)");
    setArquetipoDeck(deckAlvo.archetype);
    setAbaAtiva("builder");
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

  // Cartas Filtradas no Modal de Coleção
  const cartasColecaoModalFiltradas = useMemo(() => {
    return cards.filter((card) => {
      const texto = buscaColecaoModal.toLowerCase();
      const bateNome = card.name.toLowerCase().includes(texto);
      const bateChakra = chakraColecaoModal === "all" ? true : chakraColecaoModal === 6 ? card.chakra >= 6 : card.chakra === chakraColecaoModal;
      return bateNome && bateChakra;
    });
  }, [cards, buscaColecaoModal, chakraColecaoModal]);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-orange-500 selection:text-white">
      {/* 1. NAVBAR FIXA */}
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
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
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                abaAtiva === "deckstier"
                  ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              🔥 Melhores Decks
            </button>
            <button
              onClick={() => setAbaAtiva("mydecks")}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                abaAtiva === "mydecks"
                  ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              👤 Meus Decks ({meusDecksPessoais.length})
            </button>
            <button
              onClick={() => { setAbaAtiva("tierlist"); setLimiteExibicao(24); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                abaAtiva === "tierlist"
                  ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              🏆 Tier List Cartas
            </button>
            <button
              onClick={() => setAbaAtiva("builder")}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                abaAtiva === "builder"
                  ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              🃏 Criar Deck ({deck.length}/12)
            </button>
            <button
              onClick={() => { setAbaAtiva("catalog"); setLimiteExibicao(24); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                abaAtiva === "catalog"
                  ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              📖 Catálogo ({cards.length})
            </button>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setModalImportarAberto(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-orange-500 rounded-xl text-xs font-bold transition-all shadow cursor-pointer"
              title="Importar código de deck"
            >
              <span>📥</span>
              <span className="hidden sm:inline">Importar</span>
            </button>

            <button
              onClick={() => setModalColecaoAberto(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-orange-500 rounded-xl text-xs font-bold transition-all shadow cursor-pointer"
            >
              <span>🎴</span>
              <span className="hidden sm:inline">Coleção:</span>
              <span className="text-orange-400 font-black">{minhaColecao.length}/{cards.length}</span>
            </button>

            <button
              onClick={() => window.location.href = "/api/auth/login"}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl text-xs font-black shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
            >
              <span>👤</span>
              <span className="hidden sm:inline">Conectar Google</span>
            </button>
          </div>
        </div>

        {/* Menu Mobile */}
        <div className="md:hidden flex overflow-x-auto px-4 py-2 bg-slate-900 border-t border-slate-800 gap-2">
          <button onClick={() => setAbaAtiva("deckstier")} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${abaAtiva === "deckstier" ? "bg-orange-600 text-white" : "text-slate-400"}`}>🔥 Decks Meta</button>
          <button onClick={() => setAbaAtiva("mydecks")} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${abaAtiva === "mydecks" ? "bg-orange-600 text-white" : "text-slate-400"}`}>👤 Meus Decks</button>
          <button onClick={() => { setAbaAtiva("tierlist"); setLimiteExibicao(24); }} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${abaAtiva === "tierlist" ? "bg-orange-600 text-white" : "text-slate-400"}`}>🏆 Tier List</button>
          <button onClick={() => setAbaAtiva("builder")} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${abaAtiva === "builder" ? "bg-orange-600 text-white" : "text-slate-400"}`}>🃏 Criar Deck</button>
          <button onClick={() => { setAbaAtiva("catalog"); setLimiteExibicao(24); }} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${abaAtiva === "catalog" ? "bg-orange-600 text-white" : "text-slate-400"}`}>📖 Catálogo</button>
        </div>
      </header>

      {/* 2. CONTEÚDO PRINCIPAL */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {loading && (
          <div className="text-center py-32">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-lg font-bold text-orange-400 tracking-wide animate-pulse">
              Carregando dados oficiais do Ninja Snap & Supabase...
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
            {/* ABA: MEUS DECKS PESSOAIS */}
            {abaAtiva === "mydecks" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
                  <div>
                    <span className="text-[10px] font-black tracking-widest text-orange-400 uppercase bg-orange-950/80 border border-orange-500/30 px-3 py-0.5 rounded-full">
                      ÁREA DO JOGADOR
                    </span>
                    <h2 className="text-2xl font-black text-white mt-2">
                      Meus Decks Salvos ({meusDecksPessoais.length})
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Baralhos vinculados ao seu Nick: <b className="text-orange-400">{meuNick}</b>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                      <span className="text-[11px] text-slate-400">Nick:</span>
                      <input
                        type="text"
                        value={meuNick}
                        onChange={(e) => salvarNick(e.target.value)}
                        className="bg-transparent text-xs font-bold text-orange-400 focus:outline-none w-24"
                      />
                    </div>
                    <button
                      onClick={() => setModalImportarAberto(true)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl text-slate-200 transition-all cursor-pointer"
                    >
                      📥 Importar Código
                    </button>
                    <button
                      onClick={() => setAbaAtiva("builder")}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-xs font-black rounded-xl text-white transition-all shadow-lg cursor-pointer"
                    >
                      + Novo Deck
                    </button>
                  </div>
                </div>

                {meusDecksPessoais.length === 0 ? (
                  <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-slate-800 p-8 space-y-4">
                    <span className="text-4xl block">🃏</span>
                    <h3 className="text-lg font-bold text-slate-200">Você ainda não salvou nenhum deck pessoal!</h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Use o Deck Builder para montar seu baralho ou clique no botão abaixo para colar um código do jogo.
                    </p>
                    <div className="flex justify-center gap-3 pt-2">
                      <button
                        onClick={() => setModalImportarAberto(true)}
                        className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl text-slate-200 cursor-pointer"
                      >
                        📥 Importar Código de Deck
                      </button>
                      <button
                        onClick={() => setAbaAtiva("builder")}
                        className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-xs font-black rounded-xl text-white shadow-lg cursor-pointer"
                      >
                        Montar no Deck Builder
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {meusDecksPessoais.map((deckItem) => (
                      <div
                        key={deckItem.id}
                        className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl hover:border-slate-700 transition-all"
                      >
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-5 pb-5 border-b border-slate-800">
                          <div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-orange-600 text-white shadow">
                                {deckItem.archetype}
                              </span>
                              <h3 className="text-xl font-black text-slate-100">{deckItem.title}</h3>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                              Criado por você (<b className="text-orange-400">{deckItem.author}</b>) • Win Rate Estimado: <b className="text-green-400">{deckItem.winRate}%</b>
                            </p>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => carregarDeckNoBuilder(deckItem)}
                              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl text-slate-200 transition-all cursor-pointer"
                            >
                              ✏️ Editar
                            </button>
                            <button
                              onClick={() => copiarCodigoDeck(deckItem.cards, deckItem.title)}
                              className="px-3.5 py-2 bg-slate-800 hover:bg-orange-600 text-xs font-bold rounded-xl text-slate-200 hover:text-white transition-all cursor-pointer"
                            >
                              📋 Copiar Código
                            </button>
                            <button
                              onClick={() => excluirDeckDoBanco(deckItem.id)}
                              className="px-3 py-2 bg-slate-800 hover:bg-red-600 text-xs font-bold rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2.5">
                          {deckItem.cards.map((card) => (
                            <div key={card.id} className="group relative bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow hover:border-orange-500 transition-all hover:scale-105">
                              <div className="relative aspect-[512/768] w-full">
                                <div className="absolute top-1 left-1 z-10 bg-blue-600 text-white font-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center shadow">
                                  {card.chakra}
                                </div>
                                <div className="absolute top-1 right-1 z-10 bg-orange-600 text-white font-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center shadow">
                                  {card.power}
                                </div>
                                <img src={`/api/art/${card.id}`} alt={card.name} loading="lazy" className="w-full h-full object-cover" />
                              </div>
                              <div className="p-1.5 text-center bg-slate-900">
                                <p className="text-[10px] font-bold text-slate-200 truncate">{card.name}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ABA: MELHORES DECKS GERAIS */}
            {abaAtiva === "deckstier" && (
              <div className="space-y-6">
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-orange-950/40 border border-slate-800 p-6 sm:p-8 shadow-2xl">
                  <div className="relative z-10 max-w-2xl">
                    <span className="text-xs font-black tracking-widest text-orange-400 uppercase bg-orange-950/80 border border-orange-500/30 px-3 py-1 rounded-full">
                      META TRACKER & BANCO DE DADOS
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-white mt-3 tracking-wide">
                      Top Decks do Meta Ranqueado
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                      Decks salvos pela comunidade. Classificação por Win Rate, volume de partidas e rendimento de cubos.
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

                            <div className="flex items-center bg-slate-950 rounded-2xl border border-slate-800 p-1 shadow">
                              <button
                                onClick={() => votarNoDeck(deckItem.id, "up")}
                                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                  meuVoto === "up" ? "bg-green-600 text-white shadow-lg shadow-green-600/30" : "text-slate-400 hover:text-green-400 hover:bg-slate-900"
                                }`}
                              >
                                👍 {deckItem.upvotes}
                              </button>
                              <button
                                onClick={() => votarNoDeck(deckItem.id, "down")}
                                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                  meuVoto === "down" ? "bg-red-600 text-white shadow-lg shadow-red-600/30" : "text-slate-400 hover:text-red-400 hover:bg-slate-900"
                                }`}
                              >
                                👎 {deckItem.downvotes}
                              </button>
                            </div>

                            <button
                              onClick={() => copiarCodigoDeck(deckItem.cards, deckItem.title)}
                              className="px-4 py-2 bg-slate-800 hover:bg-orange-600 text-xs font-black rounded-xl text-slate-200 hover:text-white transition-all shadow-md cursor-pointer"
                            >
                              📋 Copiar
                            </button>
                          </div>
                        </div>

                        {/* 12 Cartas */}
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
                                  <div className="absolute top-1 left-1 z-10 bg-blue-600 text-white font-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center shadow">
                                    {card.chakra}
                                  </div>
                                  <div className="absolute top-1 right-1 z-10 bg-orange-600 text-white font-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center shadow">
                                    {card.power}
                                  </div>

                                  {!possuiNaColecao && (
                                    <div className="absolute inset-0 bg-red-950/70 flex items-center justify-center z-20">
                                      <span className="text-[10px] font-black text-red-300 bg-red-900/90 px-1.5 py-0.5 rounded">
                                        Falta
                                      </span>
                                    </div>
                                  )}

                                  <img src={`/api/art/${card.id}`} alt={card.name} loading="lazy" className="w-full h-full object-cover" />
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

            {/* ABA: TIER LIST DE CARTAS */}
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
                        <div className="absolute top-2 right-2 z-10 bg-blue-600 border border-slate-950 text-white font-black text-xs w-7 h-7 rounded-full flex items-center justify-center shadow-lg">
                          {card.chakra}
                        </div>
                        <div className="absolute bottom-2 right-2 z-10 bg-orange-600 border border-slate-950 text-white font-black text-xs w-7 h-7 rounded-full flex items-center justify-center shadow-lg">
                          {card.power}
                        </div>
                        <img src={`/api/art/${card.id}`} alt={card.name} loading="lazy" className="w-full h-full object-cover" />
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

            {/* ABA: DECK BUILDER */}
            {abaAtiva === "builder" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col justify-between h-fit sticky top-24">
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nome do Deck:</label>
                      <input
                        type="text"
                        value={nomeDeck}
                        onChange={(e) => setNomeDeck(e.target.value)}
                        className="bg-slate-950 border border-slate-800 text-sm font-bold text-orange-400 rounded-xl px-3 py-2 w-full focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Autor / Nick:</label>
                        <input
                          type="text"
                          value={autorDeck}
                          onChange={(e) => setAutorDeck(e.target.value)}
                          className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 w-full focus:outline-none focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Arquétipo:</label>
                        <select
                          value={arquetipoDeck}
                          onChange={(e) => setArquetipoDeck(e.target.value)}
                          className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-2.5 py-2 w-full focus:outline-none focus:border-orange-500"
                        >
                          <option value="Controle">Controle</option>
                          <option value="Enxame / Clones">Enxame / Clones</option>
                          <option value="Constante">Constante</option>
                          <option value="Destruição">Destruição</option>
                          <option value="Mover">Mover</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1 pt-2 border-t border-slate-800">
                      {deck.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-8">
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

                  <div className="mt-5 pt-4 border-t border-slate-800 space-y-2">
                    <button
                      onClick={publicarDeckNoBanco}
                      disabled={deck.length !== 12 || salvandoDeck}
                      className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer ${
                        deck.length === 12
                          ? "bg-green-600 hover:bg-green-500 text-white"
                          : "bg-slate-800 text-slate-500 cursor-not-allowed"
                      }`}
                    >
                      {salvandoDeck ? "Salvando no Banco..." : `🚀 Salvar no Meu Perfil (${deck.length}/12)`}
                    </button>
                    <button
                      onClick={() => copiarCodigoDeck(deck, nomeDeck)}
                      disabled={deck.length === 0}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      {copiado ? "✓ Código Copiado!" : "📋 Copiar Código"}
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

            {/* ABA: CATÁLOGO */}
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

      {/* MODAL 1: IMPORTADOR */}
      {modalImportarAberto && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <span>📥</span> Importar Código de Deck
              </h3>
              <button
                onClick={() => setModalImportarAberto(false)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-red-600 text-white font-bold flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Cole o código copiado do Ninja Snap, Discord ou amigos:
            </p>

            <textarea
              rows={6}
              placeholder={`Cole aqui... Exemplo:\n[Ninja Snap - Itachi Control]\n# (1) Naruto [naruto]\n# (2) Sasuke [sasuke]`}
              value={textoCodigoImportar}
              onChange={(e) => setTextoCodigoImportar(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-orange-500 font-mono"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setModalImportarAberto(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={importarCodigoDeck}
                className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-black rounded-xl shadow-lg cursor-pointer"
              >
                Identificar & Montar Deck
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: COLEÇÃO COM ALTURA FIXA NAS CARTAS (NUNCA COLAPSA) */}
      {modalColecaoAberto && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Topo do Modal */}
            <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-950 space-y-4 flex-shrink-0">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <span>🎴</span> Minha Coleção de Ninjas
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Marque as cartas que você possui para ver os decks prontos para jogar!
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => salvarColecao(cards.map((c) => c.id))}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl text-slate-200 cursor-pointer"
                  >
                    Marcar Todas
                  </button>
                  <button
                    onClick={() => salvarColecao([])}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl text-slate-200 cursor-pointer"
                  >
                    Desmarcar
                  </button>
                  <button
                    onClick={() => setModalColecaoAberto(false)}
                    className="w-8 h-8 rounded-full bg-slate-800 hover:bg-red-600 text-white font-bold flex items-center justify-center cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Filtros Internos */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-1">
                <input
                  type="text"
                  placeholder="Pesquisar ninja na coleção..."
                  value={buscaColecaoModal}
                  onChange={(e) => setBuscaColecaoModal(e.target.value)}
                  className="w-full sm:w-1/2 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
                <div className="flex gap-1 flex-wrap">
                  {(["all", 1, 2, 3, 4, 5, 6] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setChakraColecaoModal(v)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold ${chakraColecaoModal === v ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}
                    >
                      {v === "all" ? "Todos" : v === 6 ? "6+" : v}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Grade de Cartas com Altura Garantida (h-44 sm:h-52) */}
            <div className="p-6 overflow-y-auto flex-grow grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {cartasColecaoModalFiltradas.map((card) => {
                const possui = minhaColecao.includes(card.id);

                return (
                  <div
                    key={card.id}
                    onClick={() => toggleCartaNaColecao(card.id)}
                    className={`group relative rounded-2xl overflow-hidden border cursor-pointer transition-all hover:scale-105 shadow-xl flex flex-col justify-between ${
                      possui
                        ? "border-green-500 ring-2 ring-green-500/50 bg-slate-900"
                        : "border-slate-800 opacity-40 grayscale bg-slate-950 hover:opacity-75"
                    }`}
                  >
                    {/* Contêiner com altura fixa que impede colapsar */}
                    <div className="relative w-full h-44 sm:h-52 bg-slate-950 overflow-hidden">
                      {possui && (
                        <div className="absolute top-2 right-2 z-20 bg-green-600 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg border border-slate-950">
                          ✓
                        </div>
                      )}

                      <div className="absolute top-2 left-2 z-10 bg-blue-600 border border-slate-950 text-white font-black text-xs w-6 h-6 rounded-full flex items-center justify-center shadow-lg">
                        {card.chakra}
                      </div>
                      <div className="absolute bottom-2 right-2 z-10 bg-orange-600 border border-slate-950 text-white font-black text-xs w-6 h-6 rounded-full flex items-center justify-center shadow-lg">
                        {card.power}
                      </div>

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

                    <div className="p-2 text-center bg-slate-900 border-t border-slate-800">
                      <p className="text-xs font-bold text-slate-200 truncate">{card.name}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Rodapé do Modal */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-xs flex-shrink-0">
              <span className="text-slate-400">
                Cartas na coleção: <b className="text-orange-400">{minhaColecao.length}</b> de {cards.length} ninjas
              </span>
              <button
                onClick={() => setModalColecaoAberto(false)}
                className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-xl shadow-lg cursor-pointer"
              >
                Concluir & Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}