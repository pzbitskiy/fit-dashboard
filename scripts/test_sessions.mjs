import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import axios from "axios";
import ts from "typescript";

// Compile the API adapter without needing a browser or the Vite development server.
const source = readFileSync(new URL("../src/lib/api.ts", import.meta.url), "utf8")
  .replaceAll("import.meta.env", '({ VITE_API_BASE: "http://dashboard.test/api" })');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
});
const require = createRequire(import.meta.url);

function setup(initialStorage = {}) {
  const storage = new Map(Object.entries(initialStorage));
  const localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key),
  };
  const client = axios.create();
  const requests = [];
  let failure = null;
  client.defaults.adapter = async config => {
    requests.push(config);
    const response = { data: {}, status: 200, statusText: "OK", headers: {}, config };
    if (failure !== null) {
      const errorResponse = typeof failure === "number" ? { ...response, status: failure } : undefined;
      throw new axios.AxiosError("Request failed", String(failure), config, {}, errorResponse);
    }
    return response;
  };
  const exports = {};
  const load = id => {
    if (id === "axios") return { create: () => client, isAxiosError: axios.isAxiosError };
    if (id === "@tauri-apps/api/core") return { isTauri: () => false };
    return require(id);
  };
  new Function("require", "exports", "localStorage", outputText)(load, exports, localStorage);
  return { api: exports.api, storage, requests, failWith: value => { failure = value; } };
}

test("a saved token older than 72 hours is restored if the backend accepts it", async () => {
  const { api, storage, requests } = setup({
    sessionToken: "valid-long-lived-session",
    sessionTokenTs: String(Date.now() - 10 * 24 * 3600 * 1000),
  });
  assert.equal(await api.restoreSession(async () => { await api.getOverview(); }), true);
  assert.equal(requests[0].headers.get("X-Session"), "valid-long-lived-session");
  assert.equal(storage.get("sessionToken"), "valid-long-lived-session");
  assert.equal(storage.has("sessionTokenTs"), false);
});

test("a token without a browser timestamp can be restored", async () => {
  const { api } = setup({ sessionToken: "saved-session" });
  assert.equal(await api.restoreSession(async () => { await api.getOverview(); }), true);
});

test("a missing session does not request protected data", async () => {
  const { api, requests } = setup();
  assert.equal(await api.restoreSession(async () => { await api.getOverview(); }), false);
  assert.equal(requests.length, 0);
});

test("a backend 401 clears the token and requires login", async () => {
  const { api, storage, requests, failWith } = setup({ sessionToken: "expired-session" });
  failWith(401);
  assert.equal(await api.restoreSession(async () => { await api.getOverview(); }), false);
  assert.equal(storage.has("sessionToken"), false);
  failWith(null);
  await api.status();
  assert.equal(requests.at(-1).headers.has("X-Session"), false);
});

for (const failure of [500, 502, 403, "ERR_NETWORK", "ECONNABORTED"]) {
  test(`${failure} preserves the session so a retry can restore it`, async () => {
    const { api, storage, failWith } = setup({ sessionToken: "valid-session" });
    failWith(failure);
    await assert.rejects(api.restoreSession(async () => { await api.getOverview(); }));
    assert.equal(storage.get("sessionToken"), "valid-session");
    failWith(null);
    assert.equal(await api.restoreSession(async () => { await api.getOverview(); }), true);
  });
}

test("a fresh login replaces stale storage and explicit logout clears it", () => {
  const { api, storage } = setup({ sessionToken: "old", sessionTokenTs: "1" });
  api.setSession("new");
  assert.equal(api.getStoredSession(), "new");
  assert.equal(storage.has("sessionTokenTs"), false);
  api.setSession(null);
  assert.equal(api.getStoredSession(), null);
});
