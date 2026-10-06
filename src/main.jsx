import React, { useEffect, useMemo, useReducer, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileText,
  LayoutDashboard,
  LoaderCircle,
  Menu,
  MessageCircle,
  MoreHorizontal,
  PenLine,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import {
  createPost,
  deletePost,
  loadComments,
  loadPosts,
  updatePost,
} from "./api";
import "./styles.css";

const PAGE_SIZE = 8;
const initialState = {
  posts: [],
  loading: true,
  refreshing: false,
  error: "",
  busy: false,
  notice: "",
};

function reducer(state, action) {
  switch (action.type) {
    case "load-start":
      return {
        ...state,
        refreshing: state.posts.length > 0,
        loading: state.posts.length === 0,
        error: "",
      };
    case "load-success":
      return {
        ...state,
        posts: action.posts,
        loading: false,
        refreshing: false,
        error: "",
      };
    case "load-error":
      return {
        ...state,
        loading: false,
        refreshing: false,
        error: action.message,
      };
    case "busy":
      return { ...state, busy: action.value };
    case "create":
      return {
        ...state,
        posts: [action.post, ...state.posts],
        notice: "Post created and saved locally.",
      };
    case "update":
      return {
        ...state,
        posts: state.posts.map((post) =>
          post.id === action.post.id ? action.post : post,
        ),
        notice: "Post updated.",
      };
    case "delete":
      return {
        ...state,
        posts: state.posts.filter((post) => post.id !== action.id),
        notice: "Post deleted.",
      };
    case "notice-clear":
      return { ...state, notice: "" };
    default:
      return state;
  }
}

function Sidebar({ open, onClose }) {
  return (
    <>
      {open && (
        <button
          className="sidebar-shade"
          aria-label="Close navigation"
          onClick={onClose}
        />
      )}
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="side-top">
          <a
            className="logo"
            href="/"
            onClick={(event) => event.preventDefault()}
          >
            <span className="logo-icon">
              <BookOpen size={19} strokeWidth={2.4} />
            </span>
            <span>
              postboard<span className="logo-dot">.</span>
            </span>
          </a>
          <button
            className="side-close icon-button"
            aria-label="Close navigation"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav aria-label="Main navigation">
          <span className="nav-item active">
            <LayoutDashboard size={18} /> All posts{" "}
            <span className="nav-active-dot" />
          </span>
        </nav>
        <div className="side-spacer" />
        <div className="side-guide">
          <span className="guide-graphic">
            <Sparkles size={22} />
          </span>
          <strong>Make room for ideas.</strong>
          <p>A simple space to create, manage, and revisit your stories.</p>
        </div>
        <div className="side-bottom">
          <div className="side-avatar">P</div>
          <div>
            <strong>Postboard Studio</strong>
            <span>Personal workspace</span>
          </div>
          <MoreHorizontal size={18} />
        </div>
      </aside>
    </>
  );
}

function PostCard({ post, onOpen, onEdit, onDelete, index }) {
  return (
    <article
      className="post-card"
      style={{
        "--card-accent": ["#cde6dc", "#f4e3cc", "#dce6ef", "#e9dce8"][
          index % 4
        ],
      }}
    >
      <button
        className="card-open"
        onClick={() => onOpen(post.id)}
        aria-label={`Read ${post.title}`}
      >
        <div className="card-art">
          <span className="art-number">
            {String(post.id).startsWith("local-")
              ? "NEW"
              : String(post.id).padStart(2, "0")}
          </span>
          <span className="art-glyph" aria-hidden="true">
            ✳
          </span>
          <span className="art-corner" />
        </div>
        <div className="card-copy">
          <div className="card-kicker">
            <span className="kicker-dot" />{" "}
            {post.local
              ? "YOUR NEW POST"
              : `POST ${String(post.id).padStart(3, "0")}`}
          </div>
          <h3>{post.title}</h3>
          <p>{post.body}</p>
        </div>
      </button>
      <div className="card-footer">
        <span className="author-avatar">{post.userId}</span>
        <span className="author-name">
          Writer {String(post.userId).padStart(2, "0")}
        </span>
        <div className="card-actions">
          <button
            aria-label={`Edit ${post.title}`}
            title="Edit post"
            onClick={() => onEdit(post.id)}
          >
            <PenLine size={16} />
          </button>
          <button
            aria-label={`Delete ${post.title}`}
            title="Delete post"
            onClick={() => onDelete(post.id)}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}

function ModalFrame({ children, onClose, label }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        {children}
      </section>
    </div>
  );
}

function PostEditor({ post, busy, onClose, onSave }) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const [userId, setUserId] = useState(post?.userId ?? 1);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    if (title.trim().length < 3 || body.trim().length < 10) {
      setError(
        "Add a title of at least 3 characters and a story of at least 10 characters.",
      );
      return;
    }
    setError("");
    try {
      await onSave({
        title: title.trim(),
        body: body.trim(),
        userId: Number(userId),
      });
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <ModalFrame onClose={onClose} label={post ? "Edit post" : "Create post"}>
      <div className="modal-head">
        <div>
          <span className="eyebrow">EDITOR</span>
          <h2>{post ? "Edit your post" : "Create a new post"}</h2>
          <p>Give your idea a place to grow.</p>
        </div>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close editor"
        >
          <X size={20} />
        </button>
      </div>
      <form className="editor-form" onSubmit={submit}>
        <label>
          Title <span>*</span>
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Give your post a thoughtful title"
            maxLength={120}
          />
        </label>
        <label>
          Story <span>*</span>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Start writing your story..."
            rows={7}
          />
        </label>
        <label>
          Author{" "}
          <select
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
          >
            {Array.from({ length: 10 }, (_, i) => (
              <option value={i + 1} key={i + 1}>
                Writer {String(i + 1).padStart(2, "0")}
              </option>
            ))}
          </select>
        </label>
        {error && (
          <p className="editor-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button-primary" disabled={busy}>
            {busy ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <Check size={17} />
            )}{" "}
            {post ? "Save changes" : "Publish post"}
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}

function PostDetail({ post, onClose, onEdit, onDelete }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    loadComments(post.id, controller.signal)
      .then(setComments)
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [post.id]);
  return (
    <ModalFrame onClose={onClose} label="Post details">
      <div className="modal-head detail-head">
        <div>
          <span className="eyebrow">POST DETAILS</span>
          <h2>{post.title}</h2>
          <span className="detail-author">
            <span className="author-avatar">{post.userId}</span> Writer{" "}
            {String(post.userId).padStart(2, "0")}
          </span>
        </div>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close details"
        >
          <X size={20} />
        </button>
      </div>
      <div className="detail-body">{post.body}</div>
      <div className="detail-tools">
        <button onClick={onEdit}>
          <PenLine size={15} /> Edit post
        </button>
        <button className="danger-link" onClick={onDelete}>
          <Trash2 size={15} /> Delete post
        </button>
      </div>
      <div className="comments">
        <h3>
          <MessageCircle size={18} /> Comments{" "}
          <span>{loading ? "…" : comments.length}</span>
        </h3>
        {loading ? (
          <p className="subtle">Loading comments…</p>
        ) : error ? (
          <p className="editor-error">{error}</p>
        ) : comments.length === 0 ? (
          <p className="subtle">No comments yet.</p>
        ) : (
          comments.map((comment) => (
            <div className="comment" key={comment.id}>
              <span className="comment-avatar">
                {comment.name.charAt(0).toUpperCase()}
              </span>
              <div>
                <strong>{comment.name}</strong>
                <small>{comment.email}</small>
                <p>{comment.body}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </ModalFrame>
  );
}

function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [sideOpen, setSideOpen] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  async function refresh(force = false, signal) {
    dispatch({ type: "load-start" });
    try {
      dispatch({
        type: "load-success",
        posts: await loadPosts({ force, signal }),
      });
    } catch (error) {
      if (error.name !== "AbortError")
        dispatch({ type: "load-error", message: error.message });
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    refresh(false, controller.signal);
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!state.notice) return;
    const timer = setTimeout(() => dispatch({ type: "notice-clear" }), 4000);
    return () => clearTimeout(timer);
  }, [state.notice]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = state.posts.filter((post) =>
      `${post.title} ${post.body} ${post.userId}`.toLowerCase().includes(query),
    );
    result.sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (Boolean(a.local) !== Boolean(b.local))
        return sort === "oldest" ? (a.local ? 1 : -1) : a.local ? -1 : 1;
      if (a.local && b.local) return 0;
      return sort === "oldest"
        ? Number(a.id) - Number(b.id)
        : Number(b.id) - Number(a.id);
    });
    return result;
  }, [state.posts, search, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const selected = state.posts.find((post) => post.id === modal?.id);
  const toDelete = state.posts.find((post) => post.id === confirmId);

  async function save(fields) {
    dispatch({ type: "busy", value: true });
    try {
      if (modal?.id) {
        const post = await updatePost({ ...selected, ...fields });
        dispatch({ type: "update", post });
      } else {
        const post = await createPost(fields);
        dispatch({ type: "create", post });
        setSort("newest");
        setPage(1);
        setSearch("");
      }
      setModal(null);
    } finally {
      dispatch({ type: "busy", value: false });
    }
  }
  async function remove() {
    if (!toDelete) return;
    dispatch({ type: "busy", value: true });
    try {
      await deletePost(toDelete);
      dispatch({ type: "delete", id: toDelete.id });
      setConfirmId(null);
      setModal(null);
    } catch (error) {
      dispatch({ type: "load-error", message: error.message });
      setConfirmId(null);
    } finally {
      dispatch({ type: "busy", value: false });
    }
  }

  return (
    <div className="app-shell">
      <Sidebar open={sideOpen} onClose={() => setSideOpen(false)} />
      <main className="main">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            aria-label="Open navigation"
            onClick={() => setSideOpen(true)}
          >
            <Menu size={23} />
          </button>
          <span className="breadcrumb">
            Workspace <span>/</span> <strong>All posts</strong>
          </span>
          <span className="topbar-right">
            <span className={`live-dot ${state.error ? "offline" : ""}`} />
            {state.error
              ? "Connection issue"
              : state.loading
                ? "Loading posts"
                : "JSONPlaceholder ready"}
          </span>
        </header>
        <div className="content">
          <section className="hero">
            <div>
              <div className="hero-kicker">
                <span className="hero-line" /> YOUR CREATIVE SPACE
              </div>
              <h1>
                Stories worth <em>sharing.</em>
              </h1>
              <p>Write what matters. Keep every idea in one beautiful place.</p>
            </div>
            <button
              className="button-primary new-button"
              onClick={() => setModal({ type: "create" })}
            >
              <Plus size={18} /> New post
            </button>
          </section>

          <section className="stats" aria-label="Workspace overview">
            <div className="stat">
              <span className="stat-icon mint">
                <FileText size={20} />
              </span>
              <div>
                <strong>{state.posts.length}</strong>
                <span>Total posts</span>
              </div>
              <ArrowRight size={17} />
            </div>
            <div className="stat">
              <span className="stat-icon peach">
                <UsersRound size={20} />
              </span>
              <div>
                <strong>
                  {new Set(state.posts.map((post) => post.userId)).size}
                </strong>
                <span>Contributors</span>
              </div>
              <ArrowRight size={17} />
            </div>
            <div className="stat">
              <span className="stat-icon lilac">
                <Clock3 size={20} />
              </span>
              <div>
                <strong>{PAGE_SIZE}</strong>
                <span>Posts per page</span>
              </div>
              <ArrowRight size={17} />
            </div>
          </section>

          <section className="collection" aria-labelledby="collection-title">
            <div className="section-heading">
              <div>
                <span className="eyebrow">EXPLORE YOUR CONTENT</span>
                <h2 id="collection-title">
                  All posts <span>{filtered.length}</span>
                </h2>
              </div>
              <p>Find the right words, right when you need them.</p>
            </div>
            <div className="toolbar">
              <div className="search-box">
                <Search size={18} />
                <input
                  aria-label="Search posts"
                  placeholder="Search posts, stories, or authors..."
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                />
                {search && (
                  <button
                    aria-label="Clear search"
                    onClick={() => setSearch("")}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <div className="toolbar-actions">
                <label className="sort-box">
                  <span>Sort:</span>
                  <select
                    aria-label="Sort posts"
                    value={sort}
                    onChange={(event) => {
                      setSort(event.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="title">Title A–Z</option>
                  </select>
                  <ChevronDown size={16} />
                </label>
                <button
                  className="refresh-button"
                  title="Refresh from API"
                  aria-label="Refresh posts from API"
                  disabled={state.refreshing}
                  onClick={() => refresh(true)}
                >
                  <RefreshCw
                    size={17}
                    className={state.refreshing ? "spin" : ""}
                  />
                </button>
              </div>
            </div>
            {state.error && (
              <div className="error-banner" role="alert">
                <CircleHelp size={17} />
                {state.error}
                <button onClick={() => refresh(true)}>Retry</button>
              </div>
            )}
            {state.loading ? (
              <div className="loading">
                <LoaderCircle className="spin" size={28} />
                <span>Gathering your stories…</span>
              </div>
            ) : visible.length === 0 ? (
              <div className="empty">
                <Search size={28} />
                <h3>No posts found</h3>
                <p>Try another search or create something new.</p>
                <button
                  className="button-primary"
                  onClick={() => setModal({ type: "create" })}
                >
                  <Plus size={16} /> Create post
                </button>
              </div>
            ) : (
              <div className="post-grid">
                {visible.map((post, index) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    index={(currentPage - 1) * PAGE_SIZE + index}
                    onOpen={(id) => setModal({ type: "detail", id })}
                    onEdit={(id) => setModal({ type: "edit", id })}
                    onDelete={setConfirmId}
                  />
                ))}
              </div>
            )}
            {!state.loading && filtered.length > 0 && (
              <div className="pagination">
                <span>
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                  {Math.min(currentPage * PAGE_SIZE, filtered.length)} of{" "}
                  {filtered.length} posts
                </span>
                <div>
                  <button
                    aria-label="Previous page"
                    disabled={currentPage === 1}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    <ArrowLeft size={17} />
                  </button>
                  <span>
                    Page <strong>{currentPage}</strong> of {pages}
                  </span>
                  <button
                    aria-label="Next page"
                    disabled={currentPage === pages}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    <ArrowRight size={17} />
                  </button>
                </div>
              </div>
            )}
          </section>
          <footer className="content-footer">
            <span>© 2026 Postboard Studio</span>
            <span>
              Made for stories that matter <Sparkles size={14} />
            </span>
          </footer>
        </div>
      </main>
      {state.notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {state.notice}
        </div>
      )}
      {modal?.type === "create" && (
        <PostEditor
          busy={state.busy}
          onClose={() => setModal(null)}
          onSave={save}
        />
      )}
      {modal?.type === "edit" && selected && (
        <PostEditor
          key={selected.id}
          post={selected}
          busy={state.busy}
          onClose={() => setModal(null)}
          onSave={save}
        />
      )}
      {modal?.type === "detail" && selected && (
        <PostDetail
          post={selected}
          onClose={() => setModal(null)}
          onEdit={() => setModal({ type: "edit", id: selected.id })}
          onDelete={() => setConfirmId(selected.id)}
        />
      )}
      {toDelete && (
        <ModalFrame
          onClose={() => !state.busy && setConfirmId(null)}
          label="Confirm deletion"
        >
          <div className="confirm-icon">
            <Trash2 size={24} />
          </div>
          <h2 className="confirm-title">Delete this post?</h2>
          <p className="confirm-copy">
            “{toDelete.title}” will disappear from your workspace. You can
            refresh the demo data only by clearing this site's local storage.
          </p>
          <div className="modal-actions">
            <button
              className="button-secondary"
              onClick={() => setConfirmId(null)}
            >
              Keep post
            </button>
            <button
              className="button-danger"
              disabled={state.busy}
              onClick={remove}
            >
              {state.busy ? "Deleting…" : "Delete post"}
            </button>
          </div>
        </ModalFrame>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
