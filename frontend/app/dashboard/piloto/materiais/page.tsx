"use client";

import { useMemo, useState } from "react";
import { materiaisApi, turmasApi } from "../../../_lib/api";
import { useQuery } from "../../../_lib/useQuery";

interface Material {
  id: string;
  title: string;
  description: string | null;
  material_type: "video" | "pdf" | "link";
  vimeo_id: string | null;
  file_url: string | null;
  s3_key: string | null;
  file_size_bytes: number | null;
  bimester: number | null;
  subject_id: string;
  subject_name: string;
  subject_color: string;
  class_name: string | null;
  creator_name: string;
  created_at: string;
}

interface Subject { id: string; subject_id: string; name: string; color: string; icon: string; }
interface Turma { id: string; subjects: Subject[]; }

interface NewMaterial {
  title: string;
  material_type: "video" | "pdf";
  vimeo_id: string;
  file_url: string;
  bimester: string;
  topic: string;
}

export default function MateriaisPage() {
  const [activeSubjectId, setActiveSubjectId] = useState<string>("");
  const [tab, setTab]                          = useState<"video" | "pdf">("video");
  const [showUpload, setShowUpload]            = useState(false);
  const [uploadType, setUploadType]            = useState<"video" | "pdf">("video");
  const [saving, setSaving]                    = useState(false);

  const [form, setForm] = useState<NewMaterial>({
    title: "", material_type: "video", vimeo_id: "", file_url: "", bimester: "", topic: "",
  });

  // Load professor's turmas to get subjects
  const { data: turmas } = useQuery<Turma[]>(
    () => turmasApi.list() as Promise<Turma[]>,
    []
  );

  // Collect unique subjects from all turmas
  const subjects = useMemo(() => {
    if (!turmas) return [] as Subject[];
    const seen = new Set<string>();
    const list: Subject[] = [];
    turmas.forEach((t) =>
      t.subjects?.forEach((s) => {
        if (!seen.has(s.subject_id)) {
          seen.add(s.subject_id);
          list.push(s);
        }
      })
    );
    return list;
  }, [turmas]);

  // Auto-select first subject
  const effectiveSubjectId = activeSubjectId || subjects[0]?.subject_id || "";

  const { data: materials, loading, refetch } = useQuery<Material[]>(
    effectiveSubjectId
      ? () => materiaisApi.list({ subject_id: effectiveSubjectId }) as Promise<Material[]>
      : null,
    [effectiveSubjectId]
  );

  const videos   = materials?.filter((m) => m.material_type === "video") ?? [];
  const pdfs     = materials?.filter((m) => m.material_type === "pdf")   ?? [];
  const allMats  = materials ?? [];

  const activeSubject = subjects.find((s) => s.subject_id === effectiveSubjectId);

  async function handleCreate() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await materiaisApi.create({
        subject_id: effectiveSubjectId,
        title: form.title,
        material_type: uploadType,
        vimeo_id: uploadType === "video" ? form.vimeo_id || null : null,
        file_url: uploadType === "pdf" ? form.file_url || null : null,
        bimester: form.bimester ? Number(form.bimester) : null,
      });
      setShowUpload(false);
      setForm({ title: "", material_type: "video", vimeo_id: "", file_url: "", bimester: "", topic: "" });
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao salvar material.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este material?")) return;
    await materiaisApi.delete(id);
    refetch();
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
            Biblioteca Galáctica
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            Gerencie videoaulas (Vimeo) e PDFs por disciplina
          </p>
        </div>
        <button onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm"
          style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif", boxShadow: "0 4px 20px rgba(240,192,64,0.3)" }}>
          + Novo Material
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: "🎬", label: "Videoaulas",   value: allMats.filter((m) => m.material_type === "video").length, color: "#60a5fa" },
          { icon: "📄", label: "PDFs",          value: allMats.filter((m) => m.material_type === "pdf").length,   color: "#f0c040" },
          { icon: "📚", label: "Disciplinas",   value: subjects.length,                                            color: "#34d399" },
          { icon: "👁",  label: "Total",         value: allMats.length,                                            color: "#a78bfa" },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center py-3 rounded-xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <span className="text-xl mb-1">{s.icon}</span>
            <p className="text-xl font-bold" style={{ color: s.color, fontFamily: "'Space Grotesk',sans-serif" }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-5">
        {/* Subject sidebar */}
        <div className="w-44 shrink-0 space-y-1">
          {subjects.map((s) => (
            <button key={s.subject_id} onClick={() => setActiveSubjectId(s.subject_id)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-150"
              style={{
                background: effectiveSubjectId === s.subject_id ? `${s.color}18` : "rgba(255,255,255,0.03)",
                border: `1px solid ${effectiveSubjectId === s.subject_id ? s.color + "35" : "rgba(255,255,255,0.06)"}`,
              }}>
              <span>{s.icon || "📚"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate"
                  style={{ color: effectiveSubjectId === s.subject_id ? s.color : "rgba(255,255,255,0.7)" }}>
                  {s.name.split(" ")[0]}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="flex-1 min-w-0 space-y-4">
          {activeSubject && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ background: `${activeSubject.color}20` }}>
                {activeSubject.icon || "📚"}
              </div>
              <div className="flex-1">
                <h2 className="text-base font-bold text-white">{activeSubject.name}</h2>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {videos.length} videoaulas · {pdfs.length} PDFs
                </p>
              </div>
              <button onClick={() => setShowUpload(true)}
                className="text-xs px-3 py-2 rounded-xl font-semibold"
                style={{ background: `${activeSubject.color}15`, color: activeSubject.color, border: `1px solid ${activeSubject.color}30` }}>
                + Adicionar
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2">
            {(["video", "pdf"] as const).map((t) => {
              const count = t === "video" ? videos.length : pdfs.length;
              const color = activeSubject?.color || "#f0c040";
              return (
                <button key={t} onClick={() => setTab(t)}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150"
                  style={{
                    background: tab === t ? `${color}20` : "rgba(255,255,255,0.05)",
                    color: tab === t ? color : "rgba(255,255,255,0.4)",
                    border: `1px solid ${tab === t ? color + "40" : "rgba(255,255,255,0.08)"}`,
                  }}>
                  {t === "video" ? `🎬 Videoaulas (${count})` : `📄 PDFs (${count})`}
                </button>
              );
            })}
          </div>

          {/* Loading */}
          {loading && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto"
                style={{ borderColor: activeSubject?.color || "#f0c040", borderTopColor: "transparent" }} />
            </div>
          )}

          {/* List */}
          {!loading && tab === "video" && (
            <div className="space-y-2">
              {videos.length === 0 && (
                <p className="text-sm text-center py-6" style={{ color: "rgba(255,255,255,0.3)" }}>
                  Nenhuma videoaula ainda.
                </p>
              )}
              {videos.map((v) => (
                <div key={v.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                    style={{ background: `${activeSubject?.color || "#60a5fa"}15` }}>
                    🎬
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{v.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {v.vimeo_id && (
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded"
                          style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.45)" }}>
                          vimeo/{v.vimeo_id}
                        </span>
                      )}
                      {v.bimester && (
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{v.bimester}º Bim.</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(v.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs shrink-0"
                    style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}>
                    🗑
                  </button>
                </div>
              ))}
            </div>
          )}

          {!loading && tab === "pdf" && (
            <div className="space-y-2">
              {pdfs.length === 0 && (
                <p className="text-sm text-center py-6" style={{ color: "rgba(255,255,255,0.3)" }}>
                  Nenhum PDF ainda.
                </p>
              )}
              {pdfs.map((p) => {
                const sizeLabel = p.file_size_bytes
                  ? p.file_size_bytes > 1_000_000
                    ? `${(p.file_size_bytes / 1_048_576).toFixed(1)} MB`
                    : `${Math.round(p.file_size_bytes / 1024)} KB`
                  : null;
                return (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                      style={{ background: "rgba(240,192,64,0.1)" }}>
                      📄
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{p.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {p.s3_key && (
                          <span className="text-xs font-mono px-1.5 py-0.5 rounded"
                            style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.45)" }}>
                            s3://{p.s3_key}
                          </span>
                        )}
                        {sizeLabel && <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{sizeLabel}</span>}
                      </div>
                    </div>
                    <button onClick={() => handleDelete(p.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs shrink-0"
                      style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}>
                      🗑
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowUpload(false); }}>
          <div className="w-full max-w-md rounded-3xl p-6 space-y-5"
            style={{ background: "#0d1a3a", border: "1px solid rgba(240,192,64,0.2)" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                Adicionar Material
              </h2>
              <button onClick={() => setShowUpload(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
                ✕
              </button>
            </div>

            <div className="flex gap-3">
              {(["video", "pdf"] as const).map((t) => (
                <button key={t} onClick={() => { setUploadType(t); setForm((p) => ({ ...p, material_type: t })); }}
                  className="flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl text-sm font-semibold transition-all duration-150"
                  style={{
                    background: uploadType === t ? (t === "video" ? "rgba(96,165,250,0.15)" : "rgba(240,192,64,0.12)") : "rgba(255,255,255,0.04)",
                    color: uploadType === t ? (t === "video" ? "#60a5fa" : "#f0c040") : "rgba(255,255,255,0.4)",
                    border: `1px solid ${uploadType === t ? (t === "video" ? "rgba(96,165,250,0.35)" : "rgba(240,192,64,0.35)") : "rgba(255,255,255,0.08)"}`,
                  }}>
                  <span className="text-2xl">{t === "video" ? "🎬" : "📄"}</span>
                  {t === "video" ? "Videoaula (Vimeo)" : "PDF (S3)"}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Título *</label>
                <input type="text"
                  placeholder={uploadType === "video" ? "Nome da videoaula…" : "Nome do documento…"}
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>

              {uploadType === "video" ? (
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>ID do Vimeo</label>
                  <input type="text" placeholder="Ex: 824637892"
                    value={form.vimeo_id}
                    onChange={(e) => setForm((p) => ({ ...p, vimeo_id: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none font-mono"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(96,165,250,0.25)" }}
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>URL do arquivo (S3)</label>
                  <input type="text" placeholder="https://…"
                    value={form.file_url}
                    onChange={(e) => setForm((p) => ({ ...p, file_url: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none font-mono"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(240,192,64,0.25)" }}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Disciplina</label>
                  <select className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    {subjects.map((s) => (
                      <option key={s.subject_id} value={s.subject_id} style={{ background: "#0a1638" }}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Bimestre</label>
                  <select value={form.bimester}
                    onChange={(e) => setForm((p) => ({ ...p, bimester: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <option value="" style={{ background: "#0a1638" }}>—</option>
                    {[1, 2, 3, 4].map((b) => (
                      <option key={b} value={b} style={{ background: "#0a1638" }}>{b}º Bimestre</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowUpload(false)}
                className="flex-1 py-3.5 rounded-2xl font-semibold text-sm"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
                Cancelar
              </button>
              <button onClick={handleCreate} disabled={!form.title.trim() || saving}
                className="flex-1 py-3.5 rounded-2xl font-bold text-sm disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif" }}>
                {saving ? "Salvando…" : "💾 Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
