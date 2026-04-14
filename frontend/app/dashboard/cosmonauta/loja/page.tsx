"use client";

import { useState } from "react";
import { lojaApi, coinsApi } from "../../../_lib/api";
import { useQuery } from "../../../_lib/useQuery";

interface Product {
  id: string;
  name: string;
  description: string | null;
  image_emoji: string;
  coin_price: number;
  stock: number | null;
}

interface CoinsData { balance: number; totalEarned: number; }

interface Purchase {
  id: string;
  name: string;
  image_emoji: string;
  coins_spent: number;
  status: string;
  purchased_at: string;
}

export default function LojaPage() {
  const [buying, setBuying]     = useState<string | null>(null);
  const [success, setSuccess]   = useState<string | null>(null);
  const [tab, setTab]           = useState<"loja" | "historico">("loja");

  const { data: products, loading, error } = useQuery<Product[]>(
    () => lojaApi.list() as Promise<Product[]>,
    []
  );

  const { data: coins, refetch: refetchCoins } = useQuery<CoinsData>(
    () => coinsApi.getBalance() as Promise<CoinsData>,
    []
  );

  const { data: purchases, loading: purchasesLoading, refetch: refetchPurchases } = useQuery<Purchase[]>(
    tab === "historico" ? () => lojaApi.getCompras() as Promise<Purchase[]> : null,
    [tab]
  );

  async function handleBuy(product: Product) {
    if (buying) return;
    const balance = coins?.balance ?? 0;
    if (balance < product.coin_price) {
      alert(`Você precisa de ${product.coin_price} Estelares, mas tem apenas ${balance}.`);
      return;
    }
    if (!confirm(`Confirmar compra de "${product.name}" por ${product.coin_price} Estelares?`)) return;
    setBuying(product.id);
    try {
      await lojaApi.comprar(product.id);
      setSuccess(product.name);
      refetchCoins();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao comprar.");
    } finally {
      setBuying(null);
    }
  }

  const balance = coins?.balance ?? 0;

  return (
    <div className="p-6 space-y-6">
      {/* Toast */}
      {success && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl"
          style={{ background: "linear-gradient(135deg,#34d399,#10b981)", color: "#0a1638", boxShadow: "0 8px 32px rgba(52,211,153,0.4)" }}>
          <span className="text-2xl">🎉</span>
          <div>
            <p className="text-sm font-bold">Compra realizada!</p>
            <p className="text-xs opacity-80">{success} foi para o seu inventário</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
            Loja Galáctica
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            Troque seus Estelares por prêmios incríveis
          </p>
        </div>
        {/* Balance */}
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl"
          style={{ background: "linear-gradient(135deg,rgba(240,192,64,0.2),rgba(240,192,64,0.08))", border: "1px solid rgba(240,192,64,0.35)" }}>
          <span className="text-3xl">🌟</span>
          <div>
            <p className="text-2xl font-bold" style={{ color: "#f0c040", fontFamily: "'Space Grotesk',sans-serif" }}>
              {balance}
            </p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Estelares disponíveis</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["loja", "historico"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-150"
            style={{
              background: tab === t ? "rgba(240,192,64,0.18)" : "rgba(255,255,255,0.05)",
              color: tab === t ? "#f0c040" : "rgba(255,255,255,0.45)",
              border: `1px solid ${tab === t ? "rgba(240,192,64,0.4)" : "rgba(255,255,255,0.08)"}`,
            }}>
            {t === "loja" ? "🛍️ Produtos" : "📦 Minhas Compras"}
          </button>
        ))}
      </div>

      {/* LOJA */}
      {tab === "loja" && (
        <>
          {loading && (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto"
                style={{ borderColor: "#f0c040", borderTopColor: "transparent" }} />
            </div>
          )}
          {error && <p className="text-center text-sm" style={{ color: "#f87171" }}>{error}</p>}
          {!loading && (!products || products.length === 0) && (
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              <span className="text-6xl">🏪</span>
              <p className="text-lg font-bold text-white">Loja vazia por enquanto</p>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                O administrador irá adicionar produtos em breve.
              </p>
            </div>
          )}
          {!loading && products && products.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((p) => {
                const canAfford   = balance >= p.coin_price;
                const outOfStock  = p.stock !== null && p.stock <= 0;
                const isLoading   = buying === p.id;
                return (
                  <div key={p.id} className="rounded-3xl overflow-hidden transition-all duration-200 hover:scale-[1.02]"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: `1px solid ${canAfford && !outOfStock ? "rgba(240,192,64,0.2)" : "rgba(255,255,255,0.07)"}`,
                    }}>
                    {/* Product hero */}
                    <div className="flex items-center justify-center py-8"
                      style={{ background: canAfford ? "rgba(240,192,64,0.06)" : "rgba(255,255,255,0.02)" }}>
                      <span className="text-7xl">{p.image_emoji}</span>
                    </div>

                    <div className="px-5 py-4 space-y-3">
                      <div>
                        <h3 className="text-base font-bold text-white">{p.name}</h3>
                        {p.description && (
                          <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "rgba(255,255,255,0.45)" }}>
                            {p.description}
                          </p>
                        )}
                      </div>

                      {/* Price + stock */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg">🌟</span>
                          <span className="text-lg font-bold" style={{ color: canAfford ? "#f0c040" : "#f87171", fontFamily: "'Space Grotesk',sans-serif" }}>
                            {p.coin_price}
                          </span>
                        </div>
                        {p.stock !== null && (
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              background: p.stock > 0 ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)",
                              color: p.stock > 0 ? "#34d399" : "#f87171",
                            }}>
                            {p.stock > 0 ? `${p.stock} disponíveis` : "Esgotado"}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleBuy(p)}
                        disabled={!canAfford || outOfStock || isLoading}
                        className="w-full py-3 rounded-2xl font-bold text-sm transition-all duration-200 disabled:opacity-40"
                        style={{
                          background: canAfford && !outOfStock
                            ? "linear-gradient(135deg,#f0c040,#eab308)"
                            : "rgba(255,255,255,0.06)",
                          color: canAfford && !outOfStock ? "#0a1638" : "rgba(255,255,255,0.35)",
                          fontFamily: "'Space Grotesk',sans-serif",
                        }}>
                        {isLoading ? "Comprando…"
                          : outOfStock ? "Esgotado"
                          : !canAfford ? `Faltam ${p.coin_price - balance} 🌟`
                          : "Resgatar →"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* HISTÓRICO */}
      {tab === "historico" && (
        <>
          {purchasesLoading && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto"
                style={{ borderColor: "#f0c040", borderTopColor: "transparent" }} />
            </div>
          )}
          {!purchasesLoading && (!purchases || purchases.length === 0) && (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <span className="text-5xl">📦</span>
              <p className="text-base font-bold text-white">Nenhuma compra ainda</p>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Acumule Estelares e troque na loja!</p>
            </div>
          )}
          {!purchasesLoading && purchases && purchases.length > 0 && (
            <div className="space-y-3">
              {purchases.map((pur) => (
                <div key={pur.id} className="flex items-center gap-4 px-4 py-4 rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <span className="text-3xl shrink-0">{pur.image_emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{pur.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                      {new Date(pur.purchased_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold" style={{ color: "#f0c040" }}>-{pur.coins_spent} 🌟</p>
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: pur.status === "delivered" ? "rgba(52,211,153,0.1)" : "rgba(251,191,36,0.1)",
                        color: pur.status === "delivered" ? "#34d399" : "#fbbf24",
                      }}>
                      {pur.status === "delivered" ? "✓ Entregue" : "⏳ Pendente"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
