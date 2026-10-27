"""Package the runnable portfolio source and an already-built static deployment."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import zipfile

parser = argparse.ArgumentParser()
parser.add_argument('--out-dir', required=True)
args = parser.parse_args()
app = Path(__file__).resolve().parents[1]
out = Path(args.out_dir).resolve()
out.mkdir(parents=True, exist_ok=True)
assert (app / 'dist/index.html').is_file(), 'Run npm run build before packaging'


def allowed(path):
    return not any(part in {'node_modules', 'dist', '.git', '__pycache__'} for part in path.parts) and not (
        path.name.startswith('.env') and path.name != '.env.example')


source = out / 'ram-portfolio-source.zip'
with zipfile.ZipFile(source, 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(app.rglob('*')):
        relative = path.relative_to(app)
        if path.is_file() and allowed(relative):
            archive.write(path, 'portfolio/' + relative.as_posix())
static = out / 'ram-portfolio-dist.zip'
with zipfile.ZipFile(static, 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in sorted((app / 'dist').rglob('*')):
        if path.is_file():
            archive.write(path, path.relative_to(app / 'dist').as_posix())
try:
    revision = {'commit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=app, stderr=subprocess.DEVNULL).decode().strip(),
                'branch': subprocess.check_output(['git', 'branch', '--show-current'], cwd=app, stderr=subprocess.DEVNULL).decode().strip(),
                'workingTreeClean': not subprocess.check_output(['git', 'status', '--porcelain', '--', '.'], cwd=app, stderr=subprocess.DEVNULL).strip()}
except (OSError, subprocess.CalledProcessError):
    revision = None  # A standalone source ZIP intentionally has no Git history.
result = {'sourceRevision': revision, 'artifacts': [{'file': path.name, 'bytes': path.stat().st_size,
                        'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
                       for path in [source, static]],
          'deployment': 'Serve the contents of ram-portfolio-dist.zip from a static HTTP(S) host',
          'buildEntrySha256': hashlib.sha256((app / 'dist/index.html').read_bytes()).hexdigest()}
(out / 'ram-portfolio-release.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
