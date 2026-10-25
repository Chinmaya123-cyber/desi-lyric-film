# Installation

## 1. Tools on your machine
- Node 18+ (`node -v`), Python 3.12 (`python3.12 -V`; `uv` recommended), ffmpeg (`brew install ffmpeg`), Google Chrome.

## 2. The skill
**Plugin (recommended, Claude Code):**
```
/plugin marketplace add Chinmaya123-cyber/desi-lyric-film
/plugin install desi-lyric-film@desi-lyric-film
```
The plugin includes the Atlabs MCP server definition.

**Manual:** clone this repo and copy the skill:
```bash
git clone https://github.com/Chinmaya123-cyber/desi-lyric-film
cp -R desi-lyric-film/skills/desi-lyric-film ~/.claude/skills/
```

## 3. The Atlabs MCP (required)
See [atlabs-mcp.md](atlabs-mcp.md). The skill checks for it first and will not start without it.

## 4. First run
Ask Claude for a lyric video with your song. On the first run it copies the template into a new project folder, installs
the Node packages and a small Python environment (numpy, scipy, pillow, faster-whisper). The Whisper model downloads once.
