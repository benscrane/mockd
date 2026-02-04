#!/bin/bash

# Generate placeholder icons using ImageMagick
# Run: brew install imagemagick && ./scripts/generate-icons.sh

ASSETS_DIR="$(dirname "$0")/../assets"

# Create a simple icon with the letter M on a dark background
generate_icon() {
  local size=$1
  local output=$2

  convert -size ${size}x${size} xc:"#6366F1" \
    -gravity center \
    -font Helvetica-Bold \
    -pointsize $((size / 2)) \
    -fill white \
    -annotate 0 "m" \
    "$ASSETS_DIR/$output"
}

# Generate icons
generate_icon 1024 "icon.png"
generate_icon 512 "splash-icon.png"
generate_icon 1024 "adaptive-icon.png"
generate_icon 48 "favicon.png"

echo "Icons generated in $ASSETS_DIR"
