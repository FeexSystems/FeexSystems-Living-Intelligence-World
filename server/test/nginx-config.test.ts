import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Nginx Configuration Static Syntax & Telemetry Contract Tests", () => {
  const rootDir = path.resolve(__dirname, "../../");
  const devConfigPath = path.join(rootDir, "docker/nginx/nginx.conf");
  const prodConfigPath = path.join(rootDir, "docker/nginx/nginx.production.conf");

  it("ensures docker/nginx/nginx.conf exists and defines the telemetry streaming directives", () => {
    expect(fs.existsSync(devConfigPath)).toBe(true);
    const content = fs.readFileSync(devConfigPath, "utf-8");

    // 1. Cross-platform portability check (no hardcoded epoll)
    expect(content).not.toMatch(/use\s+epoll;/);

    // 2. Upstream declaration
    expect(content).toMatch(/upstream\s+app\s*\{/);

    // 3. Telemetry block extraction
    const telemetryBlockMatch = content.match(/location\s+\/telemetry\/v1\/stream\s*\{([\s\S]*?)\}/);
    expect(telemetryBlockMatch).not.toBeNull();
    const telemetryBlock = telemetryBlockMatch![1];

    // 4. Assert the 6 critical proxy directives
    expect(telemetryBlock).toMatch(/proxy_pass\s+http:\/\/app;/);
    expect(telemetryBlock).toMatch(/proxy_http_version\s+1\.1;/);
    expect(telemetryBlock).toMatch(/proxy_set_header\s+Upgrade\s+\$http_upgrade;/);
    expect(telemetryBlock).toMatch(/proxy_set_header\s+Connection\s+["']upgrade["'];/);
    expect(telemetryBlock).toMatch(/proxy_read_timeout\s+86400s;/);
    expect(telemetryBlock).toMatch(/proxy_send_timeout\s+86400s;/);
    expect(telemetryBlock).toMatch(/proxy_buffering\s+off;/);
  });

  it("ensures docker/nginx/nginx.production.conf exists and validates production proxy contract", () => {
    expect(fs.existsSync(prodConfigPath)).toBe(true);
    const content = fs.readFileSync(prodConfigPath, "utf-8");

    // 1. Cross-platform build target check: no hardcoded 'use epoll'
    expect(content).not.toMatch(/use\s+epoll;/);

    // 2. Upstream declaration & dynamic container resolver
    expect(content).toMatch(/upstream\s+feex_backend\s*\{/);
    expect(content).toMatch(/resolver\s+[^;]+valid=\d+s/);

    // 3. Telemetry block extraction
    const telemetryBlockMatch = content.match(/location\s+\/telemetry\/v1\/stream\s*\{([\s\S]*?)\}/);
    expect(telemetryBlockMatch).not.toBeNull();
    const telemetryBlock = telemetryBlockMatch![1];

    // 4. Assert the 6 critical proxy directives
    expect(telemetryBlock).toMatch(/proxy_pass\s+http:\/\/feex_backend;/);
    expect(telemetryBlock).toMatch(/proxy_http_version\s+1\.1;/);
    expect(telemetryBlock).toMatch(/proxy_set_header\s+Upgrade\s+\$http_upgrade;/);
    expect(telemetryBlock).toMatch(/proxy_set_header\s+Connection\s+["']upgrade["'];/);
    expect(telemetryBlock).toMatch(/proxy_read_timeout\s+86400s;/);
    expect(telemetryBlock).toMatch(/proxy_send_timeout\s+86400s;/);
    expect(telemetryBlock).toMatch(/proxy_buffering\s+off;/);
  });
});
