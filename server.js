#!/usr/bin/env node
// nexus-mcp — Model Context Protocol server for The Nexus API.
//
// A thin, stdio wrapper over The Nexus public HTTP API (/api/v1) so AI
// assistants and agents can query The Nexus directly: cross-source public
// records, qualified fact-checks with citations, news search, and the
// standing trackers. Every result is source-linked; attribution to The Nexus
// is required when using the data.
//
// Bring your own key: get a free, email-verified key at
// https://thenexus.news/developers and set NEXUS_API_KEY. The free tier covers
// unlimited record/search/tracker calls and unlimited *cached* fact-checks;
// novel fact-checks are capped per day. Higher volume + entity-graph depth are
// on the paid tier.

import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// ── Config ───────────────────────────────────────────────────────────────────

const API_BASE = (process.env.NEXUS_API_BASE || "https://thenexus.news").replace(/\/+$/, "");
const API_KEY = (process.env.NEXUS_API_KEY || "").trim();

if (!API_KEY) {
  console.error(
    "nexus-mcp: NEXUS_API_KEY is not set. Get a free key at https://thenexus.news/developers " +
      "and set it in your MCP client config (env: NEXUS_API_KEY)."
  );
  process.exit(1);
}

const UA = "nexus-mcp/1.0";
const TIMEOUT_MS = 30000;

// ── HTTP helper ──────────────────────────────────────────────────────────────

async function callApi(method, path, { query, body } = {}) {
  let url = `${API_BASE}${path}`;
  if (query) {
    const qs = new URLSearchParams(
      Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
    if (qs) url += `?${qs}`;
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "User-Agent": UA,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
    if (!res.ok) {
      const detail = (data && (data.detail || data.error)) || text || `HTTP ${res.status}`;
      throw new Error(`The Nexus API returned ${res.status}: ${detail}`);
    }
    return data;
  } finally {
    clearTimeout(t);
  }
}

// MCP tool result helpers.
const ok = (obj) => ({ content: [{ type: "text", text: JSON.stringify(obj, null, 2) }] });
const fail = (err) => ({
  isError: true,
  content: [{ type: "text", text: `Error: ${err?.message || String(err)}` }],
});

// ── Server + tools ───────────────────────────────────────────────────────────

const server = new McpServer({ name: "nexus-mcp", version: "1.0.0" });

server.registerTool(
  "nexus_record_lookup",
  {
    title: "Look up an entity's public record",
    description:
      "Cross-source U.S. public-record footprint for a person or organization — courts, " +
      "SEC/EDGAR, OFAC sanctions, FEC, lobbying, DOJ, FDA, and more — with document links and a " +
      "connection teaser. Use this to answer 'what's on the record for X?'. Source: The Nexus.",
    inputSchema: { entity: z.string().min(1).describe("Person or organization name, e.g. 'Tesla'") },
  },
  async ({ entity }) => {
    try {
      return ok(await callApi("GET", `/api/v1/record/${encodeURIComponent(entity)}`));
    } catch (e) {
      return fail(e);
    }
  }
);

server.registerTool(
  "nexus_factcheck",
  {
    title: "Fact-check a claim against The Nexus",
    description:
      "Check a factual claim against The Nexus's news corpus and public records. Returns a " +
      "qualified verdict (Supported / Partly true / Misleading / Disputed / Unsupported / " +
      "Contradicted / Not enough evidence), a rationale, a confidence level, and linked citations. " +
      "Already-checked claims return instantly and free; novel checks are rate-limited on the free " +
      "tier. Source: The Nexus.",
    inputSchema: { claim: z.string().min(3).describe("The claim to check, in plain language") },
  },
  async ({ claim }) => {
    try {
      return ok(await callApi("POST", "/api/v1/factcheck", { body: { claim } }));
    } catch (e) {
      return fail(e);
    }
  }
);

server.registerTool(
  "nexus_search",
  {
    title: "Search The Nexus news corpus",
    description:
      "Full-text search across The Nexus article corpus (news + government feeds), newest first. " +
      "Free tier covers the last 30 days. Returns source-linked articles. Source: The Nexus.",
    inputSchema: {
      query: z.string().min(2).describe("Search query"),
      limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)"),
    },
  },
  async ({ query, limit }) => {
    try {
      return ok(await callApi("GET", "/api/v1/search", { query: { q: query, limit } }));
    } catch (e) {
      return fail(e);
    }
  }
);

server.registerTool(
  "nexus_tracker",
  {
    title: "Latest from a Nexus tracker",
    description:
      "The latest weekly synthesis from one of The Nexus's standing trackers: china-watch " +
      "(PRC-linked activity), underground (organized crime / illicit economy), graft (public " +
      "corruption), grift (consumer fraud & scams). Source: The Nexus.",
    inputSchema: {
      name: z
        .enum(["china-watch", "underground", "graft", "grift"])
        .describe("Which tracker to read"),
    },
  },
  async ({ name }) => {
    try {
      return ok(await callApi("GET", `/api/v1/trackers/${encodeURIComponent(name)}/latest`));
    } catch (e) {
      return fail(e);
    }
  }
);

// ── Run (stdio) ──────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`nexus-mcp running (stdio) → ${API_BASE}`);
