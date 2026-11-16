import json, pathlib, re, subprocess, sys
ROOT=pathlib.Path('incoming')
EXTS=('.zip','.rar','.7z','.tar','.tar.gz','.tgz','.gz','.bz2','.xz')

def run(*args):
    subprocess.run(args,check=True)

def valid_magic(data, name):
    n=name.lower()
    if n.endswith('.zip'): return data.startswith((b'PK\x03\x04',b'PK\x05\x06',b'PK\x07\x08'))
    if n.endswith('.rar'): return data.startswith((b'Rar!\x1a\x07\x00',b'Rar!\x1a\x07\x01\x00'))
    if n.endswith('.7z'): return data.startswith(b'7z\xbc\xaf\x27\x1c')
    if n.endswith(('.gz','.tgz','.tar.gz')): return data.startswith(b'\x1f\x8b')
    if n.endswith('.bz2'): return data.startswith(b'BZh')
    if n.endswith('.xz'): return data.startswith(b'\xfd7zXZ\x00')
    if n.endswith('.tar'): return len(data)>262 and data[257:262]==b'ustar'
    return False

if not ROOT.exists():
    print('No staged files');sys.exit(0)
for meta in sorted(ROOT.glob('*/manifest.json')):
    m=json.loads(meta.read_text())
    for key in ('tag','series','model','kind','version','comments','filename','asset_path'):
        if not isinstance(m.get(key),str) or not m[key].strip(): raise ValueError(f'Missing {key}')
    expected=f"{m['series']}-{m['model'].replace('+','')}-{m['kind']}-v{m['version']}"
    if m['tag']!=expected or not re.fullmatch(r'[A-Za-z0-9_-]+-[0-9]+W[0-9]+S-(HMI|PLC)-v[0-9]+\.[0-9]+\.[0-9]+',m['tag']):
        raise ValueError('Invalid release tag')
    asset=pathlib.Path(m['asset_path'])
    if asset.parent!=meta.parent or asset.name!=m['filename'] or not asset.is_file():raise ValueError('Unsafe or missing asset path')
    if not any(asset.name.lower().endswith(ext) for ext in EXTS):raise ValueError('Unsupported archive extension')
    data=asset.read_bytes()
    if not data or len(data)>10*1024*1024 or not valid_magic(data,asset.name):raise ValueError('Archive size/signature invalid')
    check=subprocess.run(['gh','release','view',m['tag']],capture_output=True)
    if check.returncode==0:raise ValueError('Duplicate release '+m['tag'])
    notes=meta.parent/'notes.txt';notes.write_text(m['comments'])
    run('gh','release','create',m['tag'],str(asset),'--title',f"{m['series']} Series | {m['model']} | {m['kind']} | v{m['version']}",'--notes-file',str(notes),'--target','main')
    print('Published',m['tag'])
