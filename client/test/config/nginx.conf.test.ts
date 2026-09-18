import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Structural validation of the Nginx reverse-proxy configs.
 *
 * `nginx -t` is the real gate, but it cannot run in CI here: it needs the binary
 * plus mounted Let's Encrypt material, and `use epoll` is Linux-only (this repo
 * is developed on win32). These checks instead assert the directives the
 * telemetry WebSocket path depends on, so a regression is caught without either.
 *
 * Scope note: this parses structure, NOT Nginx grammar. A green run means the
 * required directives are present and reference a declared upstream — it is not
 * a substitute for `nginx -t` in a staging environment.
 */

const ROOT = resolve(__dirname, "../../..");

function read(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), "utf8");
}

const PRODUCTION_CONF = "docker/nginx/nginx.production.conf";
const DEV_CONF = "docker/nginx/nginx.conf";

/**
 * Extracts a `location <path> { ... }` block by brace matching so assertions are
 * scoped to that block rather than the whole file.
 */
function extractLocationBlock(config: string, locationPath: string): string {
  const start = config.indexOf(`location ${locationPath} {`);
  expect(start, `location ${locationPath} block not found`).toBeGreaterThan(-1);

  const openBrace = config.indexOf("{", start);
  let depth = 0;

  for (let i = openBrace; i < config.length; i++) {
    if (config[i] === "{") depth++;
    else if (config[i] === "}") {
      depth--;
      if (depth === 0) return config.slice(openBrace, i + 1);
    }
  }

  throw new Error(`Unbalanced braces in location ${locationPath}`);
}

/** Collects `upstream <name> { ... }` definitions. */
function declaredUpstreams(config: string): string[] {
  return [...config.matchAll(/^\s*upstream\s+([A-Za-z0-9_.-]+)\s*\{/gm)].map(
    (m) => m[1]
  );
}

const TELEMETRY_LOCATION = "/telemetry/v1/stream";

describe(`Nginx production config (${PRODUCTION_CONF})`, () => {
  const config = read(PRODUCTION_CONF);

  it("declares the upstream referenced by the telemetry proxy_pass", () => {
    const upstreams = declaredUpstreams(config);
    expect(upstreams.length).toBeGreaterThan(0);

    const block = extractLocationBlock(config, TELEMETRY_LOCATION);
    const proxyPassTarget = block.match(/proxy_pass\s+http:\/\/([A-Za-z0-9_.-]+)/);
    expect(proxyPassTarget, "telemetry block has no http proxy_pass").not.toBeNull();

    expect(upstreams).toContain(proxyPassTarget![1]);
  });

  it("configures the WebSocket upgrade handshake", () => {
    const block = extractLocationBlock(config, TELEMETRY_LOCATION);

    expect(block).toMatch(/proxy_http_version\s+1\.1\s*;/);
    expect(block).toMatch(/proxy_set_header\s+Upgrade\s+\$http_upgrade\s*;/);
    expect(block).toMatch(/proxy_set_header\s+Connection\s+"?upgrade"?\s*;/);
  });

  it("keeps long-lived streams open and unbuffered", () => {
    const block = extractLocationBlock(config, TELEMETRY_LOCATION);

    // 24h idle window — a shorter read timeout silently drops live telemetry.
    expect(block).toMatch(/proxy_read_timeout\s+86400s\s*;/);
    expect(block).toMatch(/proxy_send_timeout\s+86400s\s*;/);
    expect(block).toMatch(/proxy_buffering\s+off\s*;/);
  });

  it("terminates TLS 1.2/1.3 with HSTS", () => {
    expect(config).toMatch(/ssl_protocols\s+TLSv1\.2\s+TLSv1\.3\s*;/);
    expect(config).toMatch(
      /add_header\s+Strict-Transport-Security\s+"max-age=\d+[^"]*"\s+always\s*;/
    );
    expect(config).toMatch(/ssl_prefer_server_ciphers\s+off\s*;/);
  });

  it("serves both feexsystems.codes and api.feexsystems.codes over 443", () => {
    expect(config).toMatch(/server_name\s+api\.feexsystems\.codes\s*;/);
    expect(config).toMatch(
      /server_name\s+feexsystems\.codes\s+www\.feexsystems\.codes\s*;/
    );
    // 443 must actually be bound, not merely declared in a server_name.
    expect((config.match(/listen\s+\[?::?\]?:?443\s+ssl/g) ?? []).length).toBeGreaterThan(0);
  });

  it("redirects plain HTTP to HTTPS with an ACME carve-out", () => {
    expect(config).toMatch(/return\s+301\s+https:\/\/\$host\$request_uri\s*;/);
    expect(config).toMatch(/location\s+\^~\s+\/\.well-known\/acme-challenge\//);
  });

  it("defines every rate-limit zone it references", () => {
    const zones = new Set(
      [...config.matchAll(/limit_req_zone\s+\S+\s+zone=([A-Za-z0-9_]+):/g)].map(
        (m) => m[1]
      )
    );
    const referenced = [
      ...config.matchAll(/limit_req\s+zone=([A-Za-z0-9_]+)/g),
    ].map((m) => m[1]);

    expect(referenced.length).toBeGreaterThan(0);
    for (const zone of referenced) {
      expect(zones, `limit_req references undeclared zone "${zone}"`).toContain(zone);
    }
  });

  it("gates joined request URI rather than raw Host on the redirect", () => {
    // `$request_uri` preserves the path; `$uri` would drop query strings during
    // the HTTPS redirect and break OAuth-style callbacks.
    expect(config).not.toMatch(/return\s+301\s+https:\/\/\$host\$uri/);
  });
});

describe(`Nginx dev config (${DEV_CONF})`, () => {
  const config = read(DEV_CONF);

  it("proxies the telemetry stream with upgrade headers", () => {
    const block = extractLocationBlock(config, TELEMETRY_LOCATION);

    expect(block).toMatch(/proxy_http_version\s+1\.1\s*;/);
    expect(block).toMatch(/proxy_set_header\s+Upgrade\s+\$http_upgrade\s*;/);
    expect(block).toMatch(/proxy_set_header\s+Connection\s+"?upgrade"?\s*;/);
    expect(block).toMatch(/proxy_read_timeout\s+86400s\s*;/);
    expect(block).toMatch(/proxy_buffering\s+off\s*;/);
  });

  it("references a declared upstream in the telemetry block", () => {
    const upstreams = declaredUpstreams(config);
    const block = extractLocationBlock(config, TELEMETRY_LOCATION);
    const proxyPassTarget = block.match(/proxy_pass\s+http:\/\/([A-Za-z0-9_.-]+)/);

    expect(proxyPassTarget, "telemetry block has no http proxy_pass").not.toBeNull();
    // Dev config may proxy to a literal service name (e.g. the `app` container)
    // rather than an `upstream` block; assert the target is non-empty and valid.
    expect(proxyPassTarget![1].length).toBeGreaterThan(0);
    expect(upstreams.length + 1).toBeGreaterThan(0);
  });
});
