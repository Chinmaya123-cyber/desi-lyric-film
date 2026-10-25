# Atlabs MCP — required

The character art is made through the Atlabs MCP ("Atlabs MiniTools"). The skill does not run without it.

## Connect

- **Claude Code with this plugin installed**: the plugin ships `.mcp.json` with the Atlabs server — run `/mcp`, pick
  **atlabs**, sign in with your Atlabs account.
- **Claude Code, manual**: `claude mcp add --transport http atlabs https://mcp.atlabs.ai/mcp`, then `/mcp` → atlabs → sign in.
- **Claude Desktop / claude.ai**: Settings → Connectors → Add custom connector → Name `Atlabs`, URL
  `https://mcp.atlabs.ai/mcp` → Add → Connect → sign in; enable it in the chat's tools menu.
- **Account**: https://app.atlabs.ai — generations spend credits (a full film: ~25–40 with Nano Banana 2.1).

Verify with `get_account` (shows the credit balance). Tools are often deferred: load them with ToolSearch
(`atlabs generate_image get_result start_upload get_account list_models`).

## Tools used

| tool | for |
|---|---|
| `start_upload` + `curl -X PUT --upload-file …` | upload the user's reference images (the PUT response has the `media_id`) |
| `generate_image` | every image; pass `reference_media_ids` for consistency |
| `get_result` | wait for a job; download `outputs[].url` with `curl -sL -o …` |
| `list_models tool=generate_image` | check models, aspect ratios, reference limits |
| `get_account` | connection check + credits |

If the PUT can't connect (sandboxed environment), use `upload_from_browser` instead.

## Models

| model id | best for |
|---|---|
| `nano_banana_2_1` | **default** — base from references and every edit (expressions, blinks, outfits, backgrounds); strongest identity consistency; ~1 credit |
| `gpt_image_2_5_sunburst` | turning a real photo into the illustrated style when Nano Banana keeps it too photographic; up to 16 references |
| `seedream_5_pro` | new props, full-scene plates, extra stickers at 2K; ~2 credits |

Aspect ratios: character base/expressions `2:3` or `3:4`; eye close-up band `16:9`; look cards `2:3`; props `1:1`/`16:9`.
Always submit independent jobs in parallel, then collect them.
