// Smoke test: spawn server.js over stdio via the MCP SDK client, list tools,
// call a couple. Requires NEXUS_API_KEY in env (passed through to the child).
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["server.js"],
  env: { ...process.env },
});
const client = new Client({ name: "nexus-mcp-test", version: "1.0.0" });
await client.connect(transport);

const tools = await client.listTools();
console.log("TOOLS:", tools.tools.map((t) => t.name).join(", "));

const tr = await client.callTool({ name: "nexus_tracker", arguments: { name: "graft" } });
console.log("TRACKER graft:", tr.content[0].text.slice(0, 140).replace(/\s+/g, " "));

const rec = await client.callTool({ name: "nexus_record_lookup", arguments: { entity: "Tesla" } });
console.log("RECORD Tesla:", rec.content[0].text.slice(0, 140).replace(/\s+/g, " "));

const se = await client.callTool({ name: "nexus_search", arguments: { query: "sanctions", limit: 1 } });
console.log("SEARCH:", se.content[0].text.slice(0, 140).replace(/\s+/g, " "));

const bad = await client.callTool({ name: "nexus_factcheck", arguments: { claim: "x" } });
console.log("FACTCHECK(reject short):", bad.isError ? bad.content[0].text.slice(0, 80) : "(no error)");

await client.close();
console.log("OK");
