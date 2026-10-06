const BASE_URL = "https://jsonplaceholder.typicode.com";
const CACHE_KEY = "postboard.posts.v1";
const CHANGES_KEY = "postboard.changes.v1";
const CACHE_MS = 5 * 60 * 1000;

function readStored(storage, key, fallback) {
  try {
    const value = JSON.parse(storage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function getChanges() {
  const changes = readStored(localStorage, CHANGES_KEY, {});
  return {
    created: Array.isArray(changes.created) ? changes.created : [],
    updated:
      changes.updated && typeof changes.updated === "object"
        ? changes.updated
        : {},
    deleted: Array.isArray(changes.deleted) ? changes.deleted : [],
  };
}

function putChanges(changes) {
  localStorage.setItem(CHANGES_KEY, JSON.stringify(changes));
}

export function applyChanges(posts, changes = getChanges()) {
  const deleted = new Set(changes.deleted.map(String));
  const existing = posts
    .filter((post) => !deleted.has(String(post.id)))
    .map((post) => changes.updated[post.id] ?? post);
  return [...changes.created, ...existing];
}

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, options);
  if (!response.ok)
    throw new Error(`Request failed (${response.status}). Please try again.`);
  if (response.status === 204) return null;
  return response.json();
}

export async function loadPosts({ force = false, signal } = {}) {
  const cached = readStored(sessionStorage, CACHE_KEY, null);
  if (
    !force &&
    cached &&
    Array.isArray(cached.posts) &&
    Date.now() - cached.savedAt < CACHE_MS
  ) {
    return applyChanges(cached.posts);
  }
  const posts = await request("/posts", { signal });
  if (!Array.isArray(posts))
    throw new Error("The API returned an unexpected response.");
  sessionStorage.setItem(
    CACHE_KEY,
    JSON.stringify({ savedAt: Date.now(), posts }),
  );
  return applyChanges(posts);
}

export async function createPost(fields) {
  await request("/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify(fields),
  });
  // The fake API assigns 101 to every creation and does not persist it.
  const post = { ...fields, id: `local-${crypto.randomUUID()}`, local: true };
  const changes = getChanges();
  changes.created.unshift(post);
  putChanges(changes);
  return post;
}

export async function updatePost(post) {
  if (!post.local) {
    await request(`/posts/${encodeURIComponent(post.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({
        id: post.id,
        userId: post.userId,
        title: post.title,
        body: post.body,
      }),
    });
  }
  const changes = getChanges();
  if (post.local)
    changes.created = changes.created.map((item) =>
      item.id === post.id ? post : item,
    );
  else changes.updated[post.id] = post;
  putChanges(changes);
  return post;
}

export async function deletePost(post) {
  if (!post.local)
    await request(`/posts/${encodeURIComponent(post.id)}`, {
      method: "DELETE",
    });
  const changes = getChanges();
  if (post.local)
    changes.created = changes.created.filter((item) => item.id !== post.id);
  else {
    changes.deleted.push(post.id);
    delete changes.updated[post.id];
  }
  putChanges(changes);
}

const commentCache = new Map();
export async function loadComments(postId, signal) {
  if (String(postId).startsWith("local-")) return [];
  const cached = commentCache.get(postId);
  if (cached && Date.now() - cached.savedAt < CACHE_MS) return cached.comments;
  const comments = await request(
    `/posts/${encodeURIComponent(postId)}/comments`,
    { signal },
  );
  commentCache.set(postId, { savedAt: Date.now(), comments });
  return comments;
}
