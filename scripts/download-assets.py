from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import re, requests

root = Path(__file__).resolve().parents[1]
base = 'https://raw.githubusercontent.com/unitreerobotics/unitree_ros/master/'
files = set(re.findall(r'package://go2_description/dae/([^" ]+)', (root/'public/models/go2/go2.urdf').read_text(encoding='utf-8')))
def get(name):
    p = root/'public/models/go2/dae'/name
    if p.exists() and p.stat().st_size > 1000: return
    r = requests.get(base+'robots/go2_description/dae/'+name, timeout=90)
    r.raise_for_status()
    p.write_bytes(r.content)
    print(name, len(r.content), flush=True)
with ThreadPoolExecutor(max_workers=5) as pool: list(pool.map(get, files))
r = requests.get(base+'LICENSE', timeout=30)
if r.ok: (root/'public/models/go2/LICENSE').write_bytes(r.content)
print('Official Go2 assets ready. Fonts are bundled through Fontsource.', flush=True)
