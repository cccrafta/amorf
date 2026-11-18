#!/usr/bin/env node
// Gives a deployed version of the Worker `amorf` a numbered address, https://v<N>.amorf.workers.dev (docs/deployment.md,
// Versioned deployments). Cloudflare names a version only when it is uploaded, so the number is a separate small Worker `v<N>`
// that forwards every request to the version's preview URL and keeps its own address in the browser bar.
//
//   node scripts/version-alias.mjs <N> <version id or its first 8 characters>
//
// Needs CLOUDFLARE_ACCOUNT_ID and a wrangler login, like every other wrangler command here.
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const [n, id] = process.argv.slice(2);
if (!/^\d+$/.test(n ?? "") || !/^[0-9a-f]{8}/.test(id ?? "")) {
  console.error("usage: version-alias.mjs <N> <version id>");
  process.exit(1);
}
const target = `https://${id.slice(0, 8)}-amorf.amorf.workers.dev`;

// Redirects from the version (a trailing slash, say) point at the preview host; they are turned back to this address.
const worker = `const TARGET = ${JSON.stringify(target)};
export default {
  async fetch(req) {
    const url = new URL(req.url);
    const res = await fetch(new Request(TARGET + url.pathname + url.search, req), { redirect: "manual" });
    const loc = res.headers.get("location");
    if (!loc || !loc.startsWith(TARGET)) return res;
    const out = new Response(res.body, res);
    out.headers.set("location", url.origin + loc.slice(TARGET.length));
    return out;
  },
};
`;

const dir = mkdtempSync(join(tmpdir(), "amorf-alias-"));
try {
  const file = join(dir, "index.js");
  writeFileSync(file, worker);
  // global_fetch_strictly_public sends the fetch over the public internet; a Worker may not otherwise fetch another
  // Worker's workers.dev address on the same account (error 1042).
  execFileSync("wrangler", [
    "deploy", file, "--name", `v${n}`, "--compatibility-date", "2026-11-01",
    "--compatibility-flags", "global_fetch_strictly_public",
  ], { stdio: "inherit" });
  console.log(`v${n}: https://v${n}.amorf.workers.dev -> ${target}`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
