#!/bin/sh
# Syncs all CSV files from OneDrive Activity Tracker into static/data/

SRC="/Users/computer/Library/CloudStorage/OneDrive-UnitedNations/OCHA GIS - OCHAGIS/CODs/1_Docs/Activity Tracker/AT2"
DEST="$(dirname "$0")/static/data"

mkdir -p "$DEST"

deleted=0
for f in "$DEST"/*.csv; do
  [ -f "$f" ] || continue
  base="$(basename "$f")"
  if [ ! -f "$SRC/$base" ]; then
    rm "$f"
    echo "Deleted: $base"
    deleted=$((deleted + 1))
  fi
done

copied=0
for f in "$SRC"/*.csv; do
  [ -f "$f" ] || continue
  cp "$f" "$DEST/"
  echo "Copied: $(basename "$f")"
  copied=$((copied + 1))
done

if [ "$copied" -eq 0 ]; then
  echo "No CSV files found in: $SRC"
  exit 1
fi

echo "Done. $copied file(s) copied, $deleted file(s) deleted in $DEST"
