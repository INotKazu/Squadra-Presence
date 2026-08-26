#!/usr/bin/env bash
set -euo pipefail

input="${1:?input PNG required}"
output="${2:?output PNG required}"
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

# Isolate the two saturated flat comic-outline colors without touching Bardock.
# Alpha is intentionally removed from the masks so transparent pixels stay black.
convert "$input" -alpha off \
  -fx '((r-g)>0.23 && (r-b)>0.24 && r>0.68 && g<0.48 && b<0.43) ? 1 : 0' \
  -colorspace Gray "$work_dir/coral-mask.png"

convert "$input" -alpha off \
  -fx '((g-r)>0.18 && (b-r)>0.22 && r<0.38 && g>0.48 && b>0.52) ? 1 : 0' \
  -colorspace Gray "$work_dir/teal-mask.png"

# Small, regular comic halftone dots. The offsets keep the two colors distinct.
convert -size 11x11 xc:black -fill white -draw 'circle 2.5,2.5 2.5,4' \
  -write mpr:dot +delete -size 1024x1024 tile:mpr:dot "$work_dir/dots-a.png"
convert -size 11x11 xc:black -fill white -draw 'circle 8,8 8,9.5' \
  -write mpr:dot +delete -size 1024x1024 tile:mpr:dot "$work_dir/dots-b.png"

composite -compose Multiply "$work_dir/dots-a.png" "$work_dir/coral-mask.png" "$work_dir/coral-dots-mask.png"
composite -compose Multiply "$work_dir/dots-b.png" "$work_dir/teal-mask.png" "$work_dir/teal-dots-mask.png"

convert -size 1024x1024 xc:'#1590a6' "$work_dir/coral-dots-mask.png" -alpha off \
  -compose CopyOpacity -composite -channel A -evaluate Multiply 0.72 +channel "$work_dir/coral-dots.png"
convert -size 1024x1024 xc:'#d84c3d' "$work_dir/teal-dots-mask.png" -alpha off \
  -compose CopyOpacity -composite -channel A -evaluate Multiply 0.72 +channel "$work_dir/teal-dots.png"

convert "$input" "$work_dir/coral-dots.png" -compose Over -composite \
  "$work_dir/teal-dots.png" -compose Over -composite "$output"
