# Connecting the Atlabs MCP

The skill generates all character art through Atlabs, so this is required.

1. **Account** — sign up at https://app.atlabs.ai. Generations use credits (a full film ≈ 25–40).
2. **Connect**
   - **Claude Code, plugin installed:** `/mcp` → choose **atlabs** → sign in.
   - **Claude Code, manual:** `claude mcp add --transport http atlabs https://mcp.atlabs.ai/mcp` → then `/mcp` → **atlabs** → sign in.
   - **Claude Desktop / claude.ai:** Settings → Connectors → **Add custom connector** → Name `Atlabs`, URL `https://mcp.atlabs.ai/mcp`
     → **Add** → **Connect** → sign in. Enable it for the chat from the tools menu.
3. **Check** — ask Claude "check my Atlabs credits". If it shows a balance, you're ready.

Models the skill uses: **Nano Banana 2.1** (character consistency and every expression/outfit edit), **GPT Image 2.5 Sunburst**
(stylising real photos), **Seedream 5** (props and scene plates).
