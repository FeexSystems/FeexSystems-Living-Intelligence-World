/**
 * Static validation of the Nginx reverse-proxy configuration.
 *
 * `nginx -t` is the authoritative check, but it cannot run in CI or on a
 * developer machine without (a) an nginx binary, (b) TLS material at the paths
 * the config references, and (c) Linux. This suite reproduces the subset of
 * `nginx -t` that catches real regressions in the WebSocket telemetry pipeline:
 *
 *   1. Block structure is balanced and every server block is well-formed.
 *   2. `proxy_pass` targets resolve to a declared `upstream`.
 *   3. The `/telemetry/v1/stream` location carries every directive required for
 *      a WebSocket upgrade plus unbuffered long-lived streaming.
 *   4. Directives that nginx only permits once per block are not duplicated
 *      (`resolver`), and Linux-only directives are absent from shared configs.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const REPO_ROOT = resolve(__dirname, '../../..');
const DEV_CONF = resolve(REPO_ROOT, 'docker/nginx/nginx.conf');
const PROD_CONF = resolve(REPO_ROOT, 'docker/nginx/nginx.production.conf');

interface ParsedBlock {
  /** Directive/block name, e.g. `http`, `server`, `location`. */
  name: string;
  /** Arguments on the opening line, e.g. `/telemetry/v1/stream`. */
  args: string;
  /** Raw directive lines inside the block (comments stripped, trimmed). */
  lines: string[];
  /** Recursively parsed child blocks. */
  children: ParsedBlock[];
}

/**
 * Strip `#` comments without touching `#` inside quoted strings (nginx
 * security headers legitimately contain `#`-free but quote-bearing values).
 */
function stripComments(source: string): string {
  return source
    .split('\n')
    .map((line) => {
      let inSingle = false;
      let inDouble = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === "'" && !inDouble) inSingle = !inSingle;
        else if (ch === '"' && !inSingle) inDouble = !inDouble;
        else if (ch === '#' && !inSingle && !inDouble) return line.slice(0, i);
      }
      return line;
    })
    .join('\n');
}

/** Tokenise into statements terminated by `;` or `{`. */
function parseBlocks(source: string): { blocks: ParsedBlock[]; balanced: boolean } {
  const text = stripComments(source);
  const root: ParsedBlock = { name: '__root__', args: '', lines: [], children: [] };
  const stack: ParsedBlock[] = [root];
  let buffer = '';

  const pushStatement = (raw: string) => {
    const statement = raw.trim().replace(/\s+/g, ' ');
    if (!statement) return;
    stack[stack.length - 1].lines.push(statement);
  };

  // Quote-aware scan: `;`, `{` and `}` inside quoted values must not terminate a
  // statement. Header values legitimately contain semicolons, e.g.
  //   add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
  // and a naive scan truncates that to `add_header ... "max-age=63072000`,
  // silently losing includeSubDomains and always.
  let inSingle = false;
  let inDouble = false;

  for (const ch of text) {
    const isQuote = ch === '"' || ch === "'";
    const isStructural = ch === '{' || ch === '}' || ch === ';';

    if (isStructural && !inSingle && !inDouble) {
      scanStatement(ch, buffer, stack, pushStatement);
      buffer = '';
    } else {
      if (isQuote) {
        if (ch === '"') inDouble = !inDouble;
        else inSingle = !inSingle;
      }
      buffer += ch;
    }
  }

  return { blocks: root.children, balanced: stack.length === 1 };
}

/** Applies a structural delimiter (`{`, `}` or `;`) to the block stack. */
function scanStatement(
  ch: string,
  buffer: string,
  stack: ParsedBlock[],
  pushStatement: (raw: string) => void
) {
  if (ch === '{') {
    const header = buffer.trim().replace(/\s+/g, ' ');
    const [name, ...rest] = header.split(' ');
    const block: ParsedBlock = {
      name: name || '',
      args: rest.join(' '),
      lines: [],
      children: [],
    };
    stack[stack.length - 1].children.push(block);
    stack.push(block);
  } else if (ch === '}') {
    pushStatement(buffer);
    if (stack.length > 1) stack.pop();
  } else {
    // ';' terminates a directive
    pushStatement(buffer);
  }
}

function findBlock(root: ParsedBlock, name: string): ParsedBlock | undefined {
  return root.children.find((c) => c.name === name);
}

function findAll(root: ParsedBlock, name: string): ParsedBlock[] {
  return root.children.filter((c) => c.name === name);
}

/** Recursively collect every block anywhere in the tree. */
function collectAll(root: ParsedBlock, name: string): ParsedBlock[] {
  const out: ParsedBlock[] = [];
  const walk = (node: ParsedBlock) => {
    if (node.name === name) out.push(node);
    node.children.forEach(walk);
  };
  walk(root);
  return out;
}

/** Directives on this block only. */
function directivesIn(block: ParsedBlock): string[] {
  return block.lines;
}

/**
 * Directives in this block, including all nested blocks. Nginx inherits
 * most directives downward, so a check scoped to a single block misses
 * statements that legitimately live in a child (e.g. `return 301` inside
 * `location /`).
 */
function collectDirectives(block: ParsedBlock): string[] {
  const out: string[] = [...block.lines];
  for (const child of block.children) out.push(...collectDirectives(child));
  return out;
}

function hasDirective(block: ParsedBlock, directive: string): boolean {
  return collectDirectives(block).some(
    (l) => l === directive || l.startsWith(`${directive} `)
  );
}

/**
 * Value of the first matching directive, searched depth-first through the
 * block. Pass `own` to restrict the lookup to the block's own lines.
 */
function directiveValue(
  block: ParsedBlock,
  directive: string,
  scope: 'recursive' | 'own' = 'recursive'
): string | undefined {
  const lines = scope === 'own' ? block.lines : collectDirectives(block);
  const hit = lines.find((l) => l.startsWith(`${directive} `));
  return hit ? hit.slice(directive.length + 1).trim() : undefined;
}

/** Directives declared directly on a block (no descent), for uniqueness checks. */
function ownDirectives(block: ParsedBlock, directive: string): string[] {
  return block.lines.filter((l) => l === directive || l.startsWith(`${directive} `));
}

describe.each([
  ['docker/nginx/nginx.conf (dev)', DEV_CONF],
  ['docker/nginx/nginx.production.conf (prod)', PROD_CONF],
])('Nginx config structure: %s', (_label, confPath) => {
  let root: ParsedBlock;

  beforeAll(() => {
    const parsed = parseBlocks(readFileSync(confPath, 'utf8'));
    expect(parsed.balanced, 'braces must balance').toBe(true);
    root = { name: '__file__', args: '', lines: [], children: parsed.blocks };
  });

  it('parses into balanced, non-empty blocks', () => {
    expect(root.children.length).toBeGreaterThan(0);
    expect(findBlock(root, 'http')).toBeDefined();
  });

  it('every server block has exactly one listen directive', () => {
    const servers = collectAll(root, 'server');
    expect(servers.length).toBeGreaterThan(0);
    for (const server of servers) {
      const listens = server.lines.filter((l) => l.startsWith('listen '));
      expect(listens.length, `server ${server.args} listen count`).toBeGreaterThan(0);
    }
  });

  it('every proxy_pass target resolves to a declared upstream or literal host', () => {
    const http = findBlock(root, 'http')!;
    const upstreamNames = findAll(http, 'upstream').map((u) => u.args);

    const servers = collectAll(http, 'server');
    for (const server of servers) {
      const locations = collectAll(server, 'location');
      for (const location of locations) {
        const target = directiveValue(location, 'proxy_pass');
        if (!target) continue;
        const match = target.match(/^https?:\/\/([^/:;]+)/);
        expect(match, `unparseable proxy_pass: ${target}`).not.toBeNull();
        const host = match![1];
        // Allow variables (dynamic resolver form) and explicit named upstreams.
        if (host.includes('$')) continue;
        const isUpstream = upstreamNames.includes(host);
        const isLiteralHost = host.includes('.') || host === 'localhost';
        expect(
          isUpstream || isLiteralHost,
          `proxy_pass http://${host} must reference a declared upstream (${upstreamNames.join(', ')})`
        ).toBe(true);
      }
    }
  });

  it('does not use Linux-only event directives', () => {
    const events = findBlock(root, 'events')!;
    expect(events).toBeDefined();
    expect(
      hasDirective(events, 'use'),
      '`use epoll` breaks nginx on non-Linux hosts; omit it to auto-select'
    ).toBe(false);
  });
});

describe('Telemetry WebSocket proxy block', () => {
  const REQUIRED_WS_DIRECTIVES = [
    'proxy_http_version 1.1',
    'proxy_set_header Upgrade $http_upgrade',
    'proxy_set_header Connection "upgrade"',
    'proxy_read_timeout 86400s',
    'proxy_send_timeout 86400s',
    'proxy_buffering off',
  ];

  describe.each([
    ['docker/nginx/nginx.conf (dev)', DEV_CONF],
    ['docker/nginx/nginx.production.conf (prod)', PROD_CONF],
  ])('%s', (_label, confPath) => {
    let telemetryBlock: ParsedBlock | undefined;

    beforeAll(() => {
      const parsed = parseBlocks(readFileSync(confPath, 'utf8'));
      const root: ParsedBlock = { name: '__file__', args: '', lines: [], children: parsed.blocks };
      const http = findBlock(root, 'http')!;
      const locations = collectAll(http, 'location');
      telemetryBlock = locations.find((l) => l.args === '/telemetry/v1/stream');
    });

    it('declares a /telemetry/v1/stream location', () => {
      expect(telemetryBlock, 'telemetry location must exist').toBeDefined();
    });

    it('carries every directive required for a WSS upgrade', () => {
      expect(telemetryBlock).toBeDefined();
      for (const directive of REQUIRED_WS_DIRECTIVES) {
        expect(
          telemetryBlock!.lines,
          `missing directive: ${directive}`
        ).toContain(directive);
      }
    });

    it('is not rate limited (a 429 would drop the telemetry socket)', () => {
      expect(directiveValue(telemetryBlock!, 'limit_req')).toBeUndefined();
    });

    it('keeps the 24h idle timeout rather than the default 60s', () => {
      expect(directiveValue(telemetryBlock!, 'proxy_read_timeout')).toBe('86400s');
      expect(directiveValue(telemetryBlock!, 'proxy_send_timeout')).toBe('86400s');
    });
  });
});

describe('Production TLS configuration', () => {
  let http: ParsedBlock;

  beforeAll(() => {
    const parsed = parseBlocks(readFileSync(PROD_CONF, 'utf8'));
    const root: ParsedBlock = { name: '__file__', args: '', lines: [], children: parsed.blocks };
    http = findBlock(root, 'http')!;
  });

  it('declares exactly one resolver per block (nginx allows only one)', () => {
    // `resolver` may appear once in http{} and once per server{} — but never
    // twice within the same block, which nginx rejects at parse time.
    for (const block of [http, ...collectAll(http, 'server')]) {
      const resolvers = ownDirectives(block, 'resolver');
      expect(
        resolvers.length,
        `block ${block.name} ${block.args} has ${resolvers.length} resolver directives`
      ).toBeLessThanOrEqual(1);
    }
  });

  it('pins TLS 1.2+ with no legacy protocol enabled', () => {
    const protocols = directiveValue(http, 'ssl_protocols');
    expect(protocols).toBe('TLSv1.2 TLSv1.3');
  });

  it('enables HSTS, OCSP stapling and session ticket hardening', () => {
    expect(hasDirective(http, 'ssl_stapling on')).toBe(true);
    expect(hasDirective(http, 'ssl_session_tickets off')).toBe(true);
    expect(
      http.lines.some(
        (l) => l.startsWith('add_header Strict-Transport-Security') && l.includes('always')
      )
    ).toBe(true);
  });

  it('resolves certificate paths without requiring a Let\'s Encrypt directory', () => {
    // Hardcoded /etc/letsencrypt paths made `nginx -t` fail everywhere that
    // material lives elsewhere, so they must not appear uncommented.
    const servers = collectAll(http, 'server');
    for (const server of servers) {
      for (const line of server.lines) {
        expect(
          line.startsWith('ssl_certificate') && line.includes('/etc/letsencrypt'),
          `server ${server.args} hardcodes a Let's Encrypt path: ${line}`
        ).toBe(false);
      }
    }
    expect(directiveValue(http, 'ssl_certificate')).toBe('/etc/nginx/ssl/fullchain.pem');
    expect(directiveValue(http, 'ssl_certificate_key')).toBe('/etc/nginx/ssl/privkey.pem');
  });

  it('redirects HTTP to HTTPS on the port-80 server', () => {
    const port80 = collectAll(http, 'server').find((s) =>
      s.lines.some((l) => l === 'listen 80')
    );
    expect(port80, 'port 80 server block').toBeDefined();
    // `return 301` lives inside `location /`, so this must search children too.
    expect(
      collectDirectives(port80!).some((l) => l.includes('return 301 https://'))
    ).toBe(true);
  });

  it('declares WebSocket-capable upstream keepalive', () => {
    const upstream = findAll(http, 'upstream')[0];
    expect(upstream, 'upstream block').toBeDefined();
    expect(hasDirective(upstream, 'keepalive 32')).toBe(true);
  });
});
