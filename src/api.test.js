import test from "node:test";
import assert from "node:assert/strict";
import { createPost, deletePost, loadPosts, updatePost } from "./api.js";

function storage() {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

test("GET cache and local overlay preserve fake API CRUD actions", async (t) => {
  const oldFetch = globalThis.fetch;
  const oldLocal = globalThis.localStorage;
  const oldSession = globalThis.sessionStorage;
  t.after(() => {
    globalThis.fetch = oldFetch;
    globalThis.localStorage = oldLocal;
    globalThis.sessionStorage = oldSession;
  });
  globalThis.localStorage = storage();
  globalThis.sessionStorage = storage();
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, method: options.method ?? "GET" });
    const data =
      options.method === "POST"
        ? { id: 101 }
        : options.method === "DELETE"
          ? {}
          : [
              { id: 1, title: "Original", body: "Original body", userId: 1 },
              { id: 2, title: "Second", body: "Second body", userId: 2 },
            ];
    return new Response(JSON.stringify(data), { status: 200 });
  };

  assert.equal((await loadPosts()).length, 2);
  assert.equal((await loadPosts()).length, 2);
  assert.equal(calls.filter((call) => call.method === "GET").length, 1);

  const created = await createPost({
    title: "New post",
    body: "A new post body",
    userId: 3,
  });
  assert.match(created.id, /^local-/);
  await updatePost({ ...created, title: "Updated new post" });
  await updatePost({
    id: 1,
    title: "Edited original",
    body: "Original body",
    userId: 1,
  });
  await deletePost({ id: 2 });
  const after = await loadPosts({ force: true });
  assert.deepEqual(
    after.map((post) => post.title),
    ["Updated new post", "Edited original"],
  );
  assert.deepEqual(
    calls.map((call) => call.method),
    ["GET", "POST", "PUT", "DELETE", "GET"],
  );
  await deletePost(created);
  assert.deepEqual(
    (await loadPosts()).map((post) => post.id),
    [1],
  );
});
