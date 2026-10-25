#!/bin/zsh
# cut_audio.sh <song> <start_s> <end_s>   → public/audio/song_cut.wav with a short fade in and a 2 s fade out
set -e
S=$2; E=$3; L=$(python3 -c "print(round($E-$S,3))"); FO=$(python3 -c "print(max(0,round($E-$S-2.2,3)))")
ffmpeg -v error -y -ss $S -t $L -i "$1" -af "afade=t=in:d=0.2,afade=t=out:st=$FO:d=2.2" -ar 48000 -ac 2 public/audio/song_cut.wav
echo "public/audio/song_cut.wav  ($L s; video t = song t − $S)"
