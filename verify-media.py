"""Check restored media against MEDIA-LINKS.json.

Run from the source/ folder, after download-media.py:
    python3 verify-media.py

For every manifest entry it checks that the file exists, its size matches,
and its git blob SHA-1 matches the manifest 'sha'. It exits 1 if anything fails.
"""
import hashlib
import json
import os
import sys
from pathlib import Path

root = Path(__file__).resolve().parent
manifest = json.loads((root / "MEDIA-LINKS.json").read_text(encoding="utf-8"))

ok, missing, mismatched = 0, [], []
for item in manifest:
    target = root / item["path"]
    if not target.exists():
        missing.append(item["path"])
        continue
    data = target.read_bytes()
    sha = hashlib.sha1(b"blob %d\x00" % len(data) + data).hexdigest()
    if len(data) == item["size"] and sha == item["sha"]:
        ok += 1
    else:
        mismatched.append(item["path"])

print(f"manifest entries: {len(manifest)}")
print(f"verified (size + sha): {ok}")
print(f"missing: {len(missing)}")
print(f"mismatched: {len(mismatched)}")
for p in missing[:10]:
    print("  missing:", p)
for p in mismatched[:10]:
    print("  mismatch:", p)
sys.exit(0 if not missing and not mismatched else 1)
