# nexus-mcp

A [Model Context Protocol](https://modelcontextprotocol.io) server for **The Nexus** — give your AI assistant or agent direct access to **U.S. government primary-source records**, fact-checks, news search, and standing trackers.

**What makes it different:** most news/search MCP servers wrap headlines. The Nexus also puts the **government record** in your agent's hands — court filings, SEC/EDGAR, OFAC sanctions, FEC, lobbying disclosures, DOJ and FDA enforcement, and more — cross-referenced by entity and linked to the source document. Every result is primary-source-linked. **Attribution to The Nexus is required** when using the data.

## Tools

| Tool | What it does |
|------|--------------|
| `nexus_record_lookup` | **Cross-source U.S. public-record footprint** for a person or organization — courts, SEC/EDGAR, OFAC sanctions, FEC, lobbying, DOJ, FDA, and more — with per-document links and a connection teaser. |
| `nexus_factcheck` | Qualified verdict + rationale + linked citations for a claim. Cached checks are instant & free; novel checks are rate-limited on the free tier. |
| `nexus_search` | Full-text search across The Nexus news corpus (free tier: last 30 days). |
| `nexus_tracker` | Latest weekly synthesis from `china-watch` (PRC-linked activity), `underground` (organized crime), `graft` (public corruption), or `grift` (consumer fraud). |

## Setup

1. Get a free, email-verified API key at **https://thenexus.news/developers**.
2. Install: `npm install -g @thenexus/mcp` (or clone and `npm install`).
3. Add the server to your MCP client.

### Claude Desktop / Claude Code

```json
{
  "mcpServers": {
    "nexus": {
      "command": "npx",
      "args": ["-y", "@thenexus/mcp"],
      "env": { "NEXUS_API_KEY": "nxs_live_your_key_here" }
    }
  }
}
```

(Or point `command`/`args` at a local `node /path/to/server.js`.)

## Free tier

Unlimited `record` / `search` / `tracker` calls and unlimited **cached** fact-checks; a small number of **novel** fact-checks per day. Higher volume and entity-graph depth are on the paid tier — see [/developers](https://thenexus.news/developers).

## Environment

| Var | Required | Default |
|-----|----------|---------|
| `NEXUS_API_KEY` | yes | — |
| `NEXUS_API_BASE` | no | `https://thenexus.news` |

> Security note: only set `NEXUS_API_BASE` to a host you trust — it's where your key is sent. Leave it unset to use The Nexus.

## License

MIT
