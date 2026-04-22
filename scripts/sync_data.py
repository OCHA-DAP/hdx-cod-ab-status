# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///

import sys
from datetime import datetime, timezone
from pathlib import Path

SRC = Path.home() / "Library/CloudStorage/OneDrive-UnitedNations/OCHA GIS - OCHAGIS/CODs/1_Docs/Activity Tracker/AT2"
DEST = Path(__file__).parent.parent / "public" / "data"

BOM = b"\xef\xbb\xbf"

DEST.mkdir(parents=True, exist_ok=True)

if not SRC.exists():
    print(f"Source not found: {SRC}", file=sys.stderr)
    sys.exit(1)

deleted = 0
for f in DEST.glob("*.csv"):
    if not (SRC / f.name).exists():
        f.unlink()
        print(f"Deleted: {f.name}")
        deleted += 1

copied = 0
for src_file in sorted(SRC.glob("*.csv")):
    content = src_file.read_bytes()
    if not content.startswith(BOM):
        content = BOM + content
    (DEST / src_file.name).write_bytes(content)
    print(f"Copied: {src_file.name}")
    copied += 1

if copied == 0:
    print(f"No CSV files found in: {SRC}", file=sys.stderr)
    sys.exit(1)

(DEST / "last_synced.txt").write_text(
    datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ") + "\n"
)

print(f"Done. {copied} file(s) copied, {deleted} file(s) deleted in {DEST}")
