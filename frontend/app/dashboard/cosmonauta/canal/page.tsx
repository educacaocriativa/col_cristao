"use client";

import { useEffect, useRef, useState } from "react";
import { getStoredUser, isDemoUser } from "../../../_lib/auth";
import { socialApi } from "../../../_lib/api";

/* ── Paleta de roles ─────────────────────────────────────── */
const ROLE_COLOR: Record<string, string> = {
  professor: "#f0c040", pedagogico: "#a78bfa",
  admin: "#f87171",     aluno: "#60a5fa",
};
const ROLE_LABEL: Record<string, string> = {
  professor: "Professor", pedagogico: "Pedagógico",
  admin: "Direção",       aluno: "Aluno",
};

/* ── Helpers ─────────────────────────────────────────────── */
function initials(name: string) {
  const p = name.trim().split(" ");
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
}
function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60)  return `${s}s`;
  if (s < 3600) return `${Math.floor(s/60)}min`;
  if (s < 86400) return `${Math.floor(s/3600)}h`;
  return `${Math.floor(s/86400)}d`;
}

/* ── Tipos ───────────────────────────────────────────────── */
interface ApiComment { id: string; content: string; author_name: string; created_at: string; }
interface ApiPost {
  id: string; content: string; status: string;
  likes_count: number; created_at: string;
  author_id: string; author_name: string; author_role: string;
  comments: ApiComment[];
}

/* ── Stories mock (visuais, sem backend ainda) ────────────── */
const MOCK_STORIES = [
  { id: "s1", name: "Matemática",  initial: "M", color: "#6366f1", seen: false },
  { id: "s2", name: "Português",   initial: "P", color: "#ec4899", seen: true  },
  { id: "s3", name: "Ciências",    initial: "C", color: "#10b981", seen: false },
  { id: "s4", name: "História",    initial: "H", color: "#f59e0b", seen: true  },
  { id: "s5", name: "Geografia",   initial: "G", color: "#3b82f6", seen: false },
  { id: "s6", name: "Inglês",      initial: "I", color: "#8b5cf6", seen: false },
];

/* ── Modal de nova publicação ─────────────────────────────── */
function NewPostModal({ me, onClose, onPost }: {
  me: { name: string; role: string };
  onClose: () => void;
  onPost: (content: string, type: "texto" | "video") => void;
}) {
  const [tab, setTab] = useState<"texto" | "video">("texto");
  const [text, setText] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  function submit() {
    const content = tab === "video" && videoUrl
      ? `📹 ${videoUrl}\n\n${text}`.trim()
      : text.trim();
    if (!content) return;
    onPost(content, tab);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}>
      <div className="w-full max-w-lg rounded-3xl overflow-hidden"
        style={{ background: "#0d1f4a", border: "1px solid rgba(255,255,255,0.1)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <button onClick={onClose} className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>Cancelar</button>
          <p className="text-sm font-bold text-white">Nova Publicação</p>
          <button onClick={submit}
            className="text-sm font-bold transition-opacity"
            style={{ color: text.trim() || videoUrl.trim() ? "#60a5fa" : "rgba(96,165,250,0.3)" }}>
            Publicar
          </button>
        </div>

        {/* Type tabs */}
        <div className="flex border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          {(["texto","video"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-3 text-xs font-semibold transition-colors"
              style={{ color: tab === t ? "#f0c040" : "rgba(255,255,255,0.4)", borderBottom: tab === t ? "2px solid #f0c040" : "2px solid transparent" }}>
              {t === "texto" ? "📝 Texto" : "📹 Vídeo"}
            </button>
          ))}
        </div>

        {/* Author */}
        <div className="flex items-center gap-3 px-5 pt-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: `${ROLE_COLOR[me.role] ?? "#60a5fa"}25`, color: ROLE_COLOR[me.role] ?? "#60a5fa" }}>
            {initials(me.name)}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{me.name}</p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{ROLE_LABEL[me.role] ?? me.role}</p>
          </div>
        </div>

        {/* Input area */}
        <div className="px-5 py-4 space-y-3">
          {tab === "video" && (
            <input
              type="text"
              placeholder="URL do vídeo (YouTube, Vimeo...)"
              value={videoUrl}
              onChange={e => setVideoUrl(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            />
          )}
          <textarea
            placeholder={tab === "video" ? "Legenda do vídeo..." : "Escreva algo para a turma..."}
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none resize-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            autoFocus
          />
        </div>

        {/* Footer tips */}
        <div className="px-5 pb-5">
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
            {tab === "texto"
              ? "Posts de alunos ficam pendentes até aprovação do professor."
              : "Cole o link completo do vídeo. Professores podem publicar diretamente."}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Story viewer (simples) ───────────────────────────────── */
function StoryViewer({ story, onClose }: { story: typeof MOCK_STORIES[0]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.92)" }}
      onClick={onClose}>
      <div className="w-64 h-96 rounded-3xl flex flex-col items-center justify-center gap-4"
        style={{ background: `linear-gradient(135deg, ${story.color}33, ${story.color}11)`, border: `1px solid ${story.color}40` }}>
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black"
          style={{ background: `${story.color}25`, color: story.color }}>
          {story.initial}
        </div>
        <p className="text-white font-bold text-lg">{story.name}</p>
        <p className="text-xs text-center px-6" style={{ color: "rgba(255,255,255,0.5)" }}>
          Toque para fechar · Conteúdo de {story.name} em breve
        </p>
      </div>
    </div>
  );
}

/* ── Post Card ────────────────────────────────────────────── */
function PostCard({ post, isTeacher, likedIds, onLike, onComment, onDelete, onExpandComments, expandedId }: {
  post: ApiPost;
  isTeacher: boolean;
  likedIds: Set<string>;
  onLike: (id: string) => void;
  onComment: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onExpandComments: (id: string | null) => void;
  expandedId: string | null;
}) {
  const [commentText, setCommentText] = useState("");
  const roleColor = ROLE_COLOR[post.author_role] ?? "#60a5fa";
  const liked = likedIds.has(post.id);
  const showComments = expandedId === post.id;

  // Detecta se o conteúdo tem URL de vídeo
  const videoMatch = post.content.match(/📹\s*(https?:\/\/\S+)/);
  const textContent = videoMatch ? post.content.replace(/📹\s*https?:\/\/\S+\n?/, "").trim() : post.content;

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>

      {/* Header do post */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ring-2"
          style={{ background: `${roleColor}20`, color: roleColor, outline: `2px solid ${roleColor}` }}>
          {initials(post.author_name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{post.author_name}</span>
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: `${roleColor}15`, color: roleColor }}>
              {ROLE_LABEL[post.author_role] ?? post.author_role}
            </span>
            {post.status === "pending" && (
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24" }}>
                pendente
              </span>
            )}
          </div>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{timeAgo(post.created_at)}</p>
        </div>
        {isTeacher && (
          <button onClick={() => onDelete(post.id)}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-xs transition-all"
            style={{ color: "rgba(248,113,113,0.5)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(248,113,113,0.5)")}>
            ···
          </button>
        )}
      </div>

      {/* Vídeo embed */}
      {videoMatch && (
        <div className="mx-4 mb-3 rounded-xl overflow-hidden flex items-center gap-3 px-4 py-3"
          style={{ background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)" }}>
          <span className="text-2xl">📹</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold" style={{ color: "#60a5fa" }}>Vídeo compartilhado</p>
            <a href={videoMatch[1]} target="_blank" rel="noopener noreferrer"
              className="text-xs truncate block hover:underline"
              style={{ color: "rgba(255,255,255,0.5)" }}>
              {videoMatch[1]}
            </a>
          </div>
          <a href={videoMatch[1]} target="_blank" rel="noopener noreferrer"
            className="text-xs px-3 py-1.5 rounded-lg font-semibold shrink-0"
            style={{ background: "rgba(96,165,250,0.15)", color: "#60a5fa" }}>
            Assistir ▶
          </a>
        </div>
      )}

      {/* Conteúdo texto */}
      {textContent && (
        <p className="px-4 pb-3 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.85)" }}>
          {textContent}
        </p>
      )}

      {/* Barra de ações — estilo Instagram */}
      <div className="px-4 py-2 flex items-center gap-4"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <button onClick={() => onLike(post.id)}
          className="flex items-center gap-1.5 text-sm font-semibold transition-all duration-150 group"
          style={{ color: liked ? "#f87171" : "rgba(255,255,255,0.45)" }}>
          <span className="text-xl transition-transform group-active:scale-125">{liked ? "❤️" : "🤍"}</span>
          <span className="text-xs">{post.likes_count}</span>
        </button>

        <button onClick={() => onExpandComments(showComments ? null : post.id)}
          className="flex items-center gap-1.5 text-sm transition-all duration-150"
          style={{ color: showComments ? "#60a5fa" : "rgba(255,255,255,0.45)" }}>
          <span className="text-xl">💬</span>
          <span className="text-xs">{post.comments.length}</span>
        </button>

        <button className="flex items-center gap-1.5 text-sm transition-all duration-150"
          style={{ color: "rgba(255,255,255,0.45)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#a78bfa")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}>
          <span className="text-xl">📤</span>
        </button>

        <div className="flex-1" />

        <button className="text-xl transition-all duration-150"
          style={{ color: "rgba(255,255,255,0.45)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#f0c040")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}>
          🔖
        </button>
      </div>

      {/* Comentários */}
      {showComments && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          {post.comments.length > 0 && (
            <div className="px-4 py-3 space-y-3">
              {post.comments.map(c => (
                <div key={c.id} className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: "rgba(96,165,250,0.15)", color: "#60a5fa" }}>
                    {initials(c.author_name)}
                  </div>
                  <div className="flex-1 px-3 py-2 rounded-2xl text-xs"
                    style={{ background: "rgba(255,255,255,0.05)" }}>
                    <span className="font-bold text-white">{c.author_name} </span>
                    <span style={{ color: "rgba(255,255,255,0.75)" }}>{c.content}</span>
                    <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>{timeAgo(c.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Input de comentário */}
          <div className="flex items-center gap-2 px-4 pb-4">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-full"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <input type="text"
                placeholder="Adicionar um comentário..."
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && commentText.trim()) { onComment(post.id, commentText); setCommentText(""); } }}
                className="flex-1 bg-transparent text-xs text-white placeholder-white/30 outline-none"
              />
            </div>
            {commentText.trim() && (
              <button onClick={() => { onComment(post.id, commentText); setCommentText(""); }}
                className="text-xs font-bold" style={{ color: "#60a5fa" }}>
                Enviar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Página principal ─────────────────────────────────────── */
export default function CanalPage() {
  const [me, setMe] = useState<{ id: string; name: string; role: string } | null>(null);
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPost, setShowNewPost] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [activeStory, setActiveStory] = useState<typeof MOCK_STORIES[0] | null>(null);
  const [stories, setStories] = useState<typeof MOCK_STORIES>([]);

  const isTeacher = ["professor","pedagogico","admin","super_admin"].includes(me?.role ?? "");

  useEffect(() => {
    const u = getStoredUser();
    if (u) setMe({ id: u.id, name: u.name, role: u.role });
    if (isDemoUser(u)) setStories(MOCK_STORIES);
  }, []);

  useEffect(() => {
    socialApi.getPosts().then(d => { setPosts(d as ApiPost[]); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  async function handlePost(content: string) {
    if (!me) return;
    const temp: ApiPost = { id: `t_${Date.now()}`, content, status: isTeacher ? "approved" : "pending",
      likes_count: 0, created_at: new Date().toISOString(), author_id: me.id, author_name: me.name, author_role: me.role, comments: [] };
    setPosts(p => [temp, ...p]);
    try {
      const r = await socialApi.createPost({ content }) as ApiPost;
      setPosts(p => p.map(x => x.id === temp.id ? { ...temp, ...r } : x));
    } catch { setPosts(p => p.filter(x => x.id !== temp.id)); }
  }

  async function toggleLike(id: string) {
    const had = likedIds.has(id);
    setLikedIds(p => { const s = new Set(p); had ? s.delete(id) : s.add(id); return s; });
    setPosts(p => p.map(x => x.id !== id ? x : { ...x, likes_count: x.likes_count + (had ? -1 : 1) }));
    if (!had) await socialApi.like(id).catch(() => {});
  }

  async function handleComment(postId: string, text: string) {
    if (!me || !text.trim()) return;
    const tmp: ApiComment = { id: `tc_${Date.now()}`, content: text.trim(), author_name: me.name, created_at: new Date().toISOString() };
    setPosts(p => p.map(x => x.id !== postId ? x : { ...x, comments: [...x.comments, tmp] }));
    await socialApi.comment(postId, { content: text.trim() }).catch(() => {});
  }

  async function handleDelete(id: string) {
    setPosts(p => p.filter(x => x.id !== id));
    await socialApi.deletePost(id).catch(() => {});
  }

  function openStory(s: typeof MOCK_STORIES[0]) {
    setActiveStory(s);
    setStories(p => p.map(x => x.id === s.id ? { ...x, seen: true } : x));
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Story viewer modal ── */}
      {activeStory && <StoryViewer story={activeStory} onClose={() => setActiveStory(null)} />}

      {/* ── Modal nova publicação ── */}
      {showNewPost && me && (
        <NewPostModal me={me} onClose={() => setShowNewPost(false)} onPost={handlePost} />
      )}

      {/* ── Header ── */}
      <div className="px-4 pt-4 pb-2 shrink-0 flex items-center justify-between">
        <h1 className="text-lg font-black text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
          Canal
        </h1>
        <div className="flex items-center gap-2">
          <button className="w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all"
            style={{ color: "rgba(255,255,255,0.5)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#f0c040")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}>
            🔍
          </button>
          <button className="w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all"
            style={{ color: "rgba(255,255,255,0.5)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#f0c040")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}>
            ✈️
          </button>
        </div>
      </div>

      {/* ── Stories ── */}
      <div className="px-4 pb-4 shrink-0">
        <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {/* Meu story / novo post */}
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <button onClick={() => setShowNewPost(true)}
              className="w-16 h-16 rounded-full flex items-center justify-center relative transition-transform active:scale-95"
              style={{ background: "rgba(255,255,255,0.06)", border: "2px dashed rgba(255,255,255,0.2)" }}>
              <span className="text-2xl">＋</span>
            </button>
            <p className="text-xs text-center w-16 truncate" style={{ color: "rgba(255,255,255,0.5)" }}>
              Publicar
            </p>
          </div>

          {/* Stories das turmas */}
          {stories.map(s => (
            <div key={s.id} className="flex flex-col items-center gap-1.5 shrink-0">
              <button onClick={() => openStory(s)}
                className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-black transition-transform active:scale-95"
                style={{
                  background: s.seen ? "rgba(255,255,255,0.06)" : `${s.color}22`,
                  border: s.seen ? "2px solid rgba(255,255,255,0.15)" : `2px solid ${s.color}`,
                  color: s.seen ? "rgba(255,255,255,0.4)" : s.color,
                  boxShadow: s.seen ? "none" : `0 0 12px ${s.color}40`,
                }}>
                {s.initial}
              </button>
              <p className="text-xs text-center w-16 truncate"
                style={{ color: s.seen ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.75)" }}>
                {s.name}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="shrink-0" style={{ height: "1px", background: "rgba(255,255,255,0.07)" }} />

      {/* ── Feed ── */}
      <div className="flex-1 overflow-y-auto">
        {/* Barra de nova publicação rápida */}
        {me && (
          <div className="flex items-center gap-3 px-4 py-3"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: `${ROLE_COLOR[me.role] ?? "#60a5fa"}20`, color: ROLE_COLOR[me.role] ?? "#60a5fa" }}>
              {initials(me.name)}
            </div>
            <button onClick={() => setShowNewPost(true)}
              className="flex-1 text-left px-4 py-2.5 rounded-full text-sm transition-all"
              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.08)" }}>
              O que está acontecendo na sua turma?
            </button>
            <button onClick={() => setShowNewPost(true)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0 transition-all"
              style={{ background: "rgba(96,165,250,0.1)", color: "#60a5fa" }}
              title="Postar vídeo">
              📹
            </button>
          </div>
        )}

        {/* Lista de posts */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="text-3xl animate-spin">🔄</div>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Carregando canal...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-8">
            <span className="text-5xl">📡</span>
            <p className="text-base font-bold text-white">Nenhuma publicação ainda</p>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Seja o primeiro a compartilhar algo com a turma!</p>
            <button onClick={() => setShowNewPost(true)}
              className="mt-2 px-6 py-3 rounded-2xl text-sm font-bold"
              style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638" }}>
              Criar publicação
            </button>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            {posts.map(p => (
              <PostCard key={p.id} post={p}
                isTeacher={isTeacher}
                likedIds={likedIds}
                onLike={toggleLike}
                onComment={handleComment}
                onDelete={handleDelete}
                onExpandComments={setExpandedComments}
                expandedId={expandedComments}
              />
            ))}
          </div>
        )}

        <div className="h-6" />
      </div>
    </div>
  );
}
