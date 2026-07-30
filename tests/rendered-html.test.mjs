import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("protegge il contenuto durante la verifica della sessione", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Money Elite/);
  assert.match(html, /Caricamento sicuro/);
  assert.doesNotMatch(html, /Patrimonio totale dei conti/);
  assert.doesNotMatch(html, /Transazioni recenti/);
});

test("usa Supabase esclusivamente con le variabili pubbliche locali", async () => {
  const [page, client, gitignore] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/supabase/client.ts", import.meta.url), "utf8"),
    readFile(new URL("../.gitignore", import.meta.url), "utf8"),
  ]);

  assert.match(page, /signInWithPassword/);
  assert.match(page, /auth\.getUser/);
  assert.match(page, /auth\.onAuthStateChange/);
  assert.match(page, /auth\.signOut/);
  assert.match(client, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(client, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.doesNotMatch(client, /service_role|DATABASE_PASSWORD/i);
  assert.match(gitignore, /\.env\*/);
});
