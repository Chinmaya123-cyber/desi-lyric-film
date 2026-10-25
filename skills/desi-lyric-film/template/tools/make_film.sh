#!/bin/zsh
# Render the film: src/film.json + src/lyrics.json + src/character.json → out/<name>.mp4 (1920x1080, 24 fps)
#   ./tools/make_film.sh [name]        (default name: lyric-film)
set -e
cd "$(dirname "$0")/.."
NAME=${1:-lyric-film}
npx remotion render src/index.ts LyricFilm out/$NAME-raw.mp4 --concurrency=6 --crf=16 --audio-codec=aac --audio-bitrate=320k --log=error
PY=.venv/bin/python; [[ -x $PY ]] || PY=python3
$PY -I tools/fix_blank_frames.py out/$NAME-raw.mp4
ffmpeg -v error -y -i out/$NAME-raw.mp4 -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -movflags +faststart \
  -af "loudnorm=I=-14:TP=-1.2" -c:a aac -b:a 256k out/$NAME.mp4 2>/dev/null || cp out/$NAME-raw.mp4 out/$NAME.mp4
echo "✓ out/$NAME.mp4"
