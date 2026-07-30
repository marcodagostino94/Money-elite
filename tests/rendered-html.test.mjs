import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("protegge il contenuto durante la verifica della sessione", async () => {
  const html = await readFile(new URL("../out/index.html", import.meta.url), "utf8");
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
