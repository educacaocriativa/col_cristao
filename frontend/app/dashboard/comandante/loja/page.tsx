"use client";

import { useState } from "react";
import { lojaApi } from "../../../_lib/api";
import { useQuery } from "../../../_lib/useQuery";

interface Product {
  id: string;
  name: string;
  description: string | null;
  image_emoji: string;
  coin_price: number;
  stock: number | null;
  active: boolean;
}

interface Purchase {
  id: string;
  student_name: string;
  product_name: string;
  image_emoji: string;
  coins_spent: number;
  status: string;
  purchased_at: string;
}

const EMPTY_FORM = { name: "", description: "", image_emoji: "🎁", coin_price: "", stock: "" };

export default function AdminLojaPage() {
  const [tab, setTab]           = useState<"produtos" | "pedidos">("produtos");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({ ...EMPTY_FORM });

  const { data: products, loading, refetch } = useQuery<Product[]>(
    () => lojaApi.list() as Promise<Product[]>,
    []
  );

  const { data: purchases, loading: purchasesLoading, refetch: refetchPurchases } = useQuery<Purchase[]>(
    tab === "pedidos" ? () => lojaApi.getAdminCompras() as Promise<Purchase[]> : null,
    [tab]
  );

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  }

  function openEdit(p: Product) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description ?? "",
      image_emoji: p.image_emoji,
      coin_price: String(p.coin_price),
      stock: p.stock != null ? String(p.stock) : "",
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.coin_price) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        image_emoji: form.image_emoji || "🎁",
        coin_price: Number(form.coin_price),
        stock: form.stock ? Number(form.stock) : null,
      };
      if (editingId) {
        await lojaApi.update(editingId, payload);
      } else {
        await lojaApi.create(payload);
      }
      setShowModal(false);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao salvar produto.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este produto da loja?")) return;
    await lojaApi.delete(id);
    refetch();
  }

  async function handleDeliver(purchaseId: string) {
    await lojaApi.entregar(purchaseId);
    refetchPurchases();
  }

  const pendingCount = purchases?.filter((p) => p.status === "pending").length ?? 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
            Loja Galáctica
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            Gerencie produtos e pedidos dos alunos
          </p>
        </div>
        {tab === "produtos" && (
          <button onClick={openCreate}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm"
            style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif", boxShadow: "0 4px 20px rgba(240,192,64,0.3)" }}>
            + Novo Produto
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["produtos", "pedidos"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-150"
            style={{
              background: tab === t ? "rgba(240,192,64,0.18)" : "rgba(255,255,255,0.05)",
              color: tab === t ? "#f0c040" : "rgba(255,255,255,0.45)",
              border: `1px solid ${tab === t ? "rgba(240,192,64,0.4)" : "rgba(255,255,255,0.08)"}`,
            }}>
            {t === "produtos" ? "🛍️ Produtos" : `📦 Pedidos${pendingCount > 0 ? ` (${pendingCount})` : ""}`}
          </button>
        ))}
      </div>

      {/* PRODUTOS */}
      {tab === "produtos" && (
        <>
          {loading && (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto"
                style={{ borderColor: "#f0c040", borderTopColor: "transparent" }} />
            </div>
          )}
          {!loading && (!products || products.length === 0) && (
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              <span className="text-6xl">🏪</span>
              <p className="text-lg font-bold text-white">Nenhum produto cadastrado</p>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                Adicione produtos para que os alunos possam resgatar com seus Estelares.
              </p>
              <button onClick={openCreate}
                className="px-6 py-3 rounded-xl font-bold text-sm"
                style={{ background: "rgba(240,192,64,0.15)", color: "#f0c040" }}>
                + Adicionar Produto
              </button>
            </div>
          )}
          {!loading && products && products.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((p) => (
                <div key={p.id} className="rounded-3xl overflow-hidden"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${p.active ? "rgba(240,192,64,0.2)" : "rgba(255,255,255,0.07)"}`,
                    opacity: p.active ? 1 : 0.5,
                  }}>
                  <div className="flex items-center justify-center py-8"
                    style={{ background: "rgba(240,192,64,0.06)" }}>
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
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">🌟</span>
                        <span className="text-lg font-bold" style={{ color: "#f0c040", fontFamily: "'Space Grotesk',sans-serif" }}>
                          {p.coin_price}
                        </span>
                      </div>
                      {p.stock !== null ? (
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            background: p.stock > 0 ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)",
                            color: p.stock > 0 ? "#34d399" : "#f87171",
                          }}>
                          {p.stock > 0 ? `${p.stock} em estoque` : "Esgotado"}
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(52,211,153,0.1)", color: "#34d399" }}>
                          Ilimitado
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(p)}
                        className="flex-1 py-2.5 rounded-xl text-xs font-semibold"
                        style={{ background: "rgba(240,192,64,0.1)", color: "#f0c040" }}>
                        ✏️ Editar
                      </button>
                      <button onClick={() => handleDelete(p.id)}
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xs"
                        style={{ background: "rgba(248,113,113,0.08)", color: "#f87171" }}>
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* PEDIDOS */}
      {tab === "pedidos" && (
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
              <p className="text-base font-bold text-white">Nenhum pedido ainda</p>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Os pedidos dos alunos aparecerão aqui.</p>
            </div>
          )}
          {!purchasesLoading && purchases && purchases.length > 0 && (
            <div className="space-y-3">
              {purchases.map((pur) => (
                <div key={pur.id} className="flex items-center gap-4 px-5 py-4 rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <span className="text-3xl shrink-0">{pur.image_emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{pur.product_name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {pur.student_name} · {new Date(pur.purchased_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <p className="text-sm font-bold" style={{ color: "#f0c040" }}>-{pur.coins_spent} 🌟</p>
                    {pur.status === "pending" ? (
                      <button onClick={() => handleDeliver(pur.id)}
                        className="px-4 py-2 rounded-xl text-xs font-bold"
                        style={{ background: "rgba(52,211,153,0.15)", color: "#34d399" }}>
                        ✓ Entregar
                      </button>
                    ) : (
                      <span className="text-xs px-3 py-1.5 rounded-xl"
                        style={{ background: "rgba(52,211,153,0.08)", color: "#34d399" }}>
                        ✓ Entregue
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="w-full max-w-md rounded-3xl p-6 space-y-5"
            style={{ background: "#0d1a3a", border: "1px solid rgba(240,192,64,0.2)" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                {editingId ? "Editar Produto" : "Novo Produto"}
              </h2>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>✕</button>
            </div>

            <div className="space-y-3">
              {/* Emoji picker row */}
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Emoji do Produto</label>
                <div className="flex gap-2 flex-wrap">
                  {["🎁", "🏆", "📚", "🎮", "🎨", "🍕", "🎧", "⚽", "🎬", "🌟", "🦺", "📱"].map((e) => (
                    <button key={e} onClick={() => setForm((p) => ({ ...p, image_emoji: e }))}
                      className="w-10 h-10 rounded-xl text-xl transition-all"
                      style={{
                        background: form.image_emoji === e ? "rgba(240,192,64,0.25)" : "rgba(255,255,255,0.06)",
                        border: `1px solid ${form.image_emoji === e ? "rgba(240,192,64,0.6)" : "rgba(255,255,255,0.1)"}`,
                      }}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Nome *</label>
                <input type="text" placeholder="Ex: Lanche na Cantina"
                  value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>

              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Descrição</label>
                <textarea rows={2} placeholder="Descreva o prêmio..."
                  value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none resize-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Preço (🌟 Estelares) *</label>
                  <input type="number" min="1" placeholder="50"
                    value={form.coin_price} onChange={(e) => setForm((p) => ({ ...p, coin_price: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Estoque (vazio = ilimitado)</label>
                  <input type="number" min="0" placeholder="—"
                    value={form.stock} onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-2xl font-semibold text-sm"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={!form.name.trim() || !form.coin_price || saving}
                className="flex-1 py-3 rounded-2xl font-bold text-sm disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif" }}>
                {saving ? "Salvando…" : editingId ? "Salvar Produto →" : "Criar Produto →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
