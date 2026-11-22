"""Optional: populate missing public assets for this exported source."""
from pathlib import Path
import json
import urllib.request

root = Path(__file__).resolve().parent
for item in json.loads((root / 'MEDIA-LINKS.json').read_text()):
    target = (root / item['path']).resolve()
    if not target.is_relative_to(root):
        raise ValueError('Asset path outside export')
    if target.exists():
        continue
    target.parent.mkdir(parents=True, exist_ok=True)
    print('Downloading', item['path'], flush=True)
    with urllib.request.urlopen(item['url'], timeout=45) as response:
        target.write_bytes(response.read())
print('Public assets ready.')
