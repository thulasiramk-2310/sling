"""Package the checkout and verify a binary patch against the requested origin branch."""
import io
from pathlib import Path
import subprocess
import tempfile
import zipfile

root = Path(__file__).resolve().parents[2]
workspace = root.parent
baseline_ref = 'origin/claude/chat-session-ay91ey'
original_bytes = subprocess.check_output(['git', 'archive', '--format=zip', baseline_ref], cwd=root)
with zipfile.ZipFile(io.BytesIO(original_bytes)) as archive:
    original = {name: archive.read(name) for name in archive.namelist() if not name.endswith('/')}
current = {p.relative_to(root).as_posix(): p for p in root.rglob('*')
           if p.is_file() and not any(part in {'node_modules', 'dist', '.git', '__pycache__'}
                                      for part in p.relative_to(root).parts)
           and not (p.name.startswith('.env') and p.name != '.env.example')}
for name, data in original.items():
    if not name.startswith('portfolio/'):
        assert name in current and current[name].read_bytes() == data, name
changed = [name for name in sorted(set(original) | set(current))
           if original.get(name) != (current[name].read_bytes() if name in current else None)]
assert all(name.startswith('portfolio/') for name in changed)
patch = []
with tempfile.TemporaryDirectory(prefix='ram-source-proof-') as temp:
    baseline = Path(temp)
    for name in changed:
        before = '/dev/null'
        if name in original:
            file = baseline / name
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_bytes(original[name])
            before = str(file)
        after = str(current[name]) if name in current else '/dev/null'
        result = subprocess.run(['git', 'diff', '--no-index', '--binary', '--', before, after], capture_output=True)
        assert result.returncode in (0, 1), result.stderr
        data = result.stdout
        for prefix in (str(baseline), str(root)):
            data = data.replace(('a' + prefix + '/').encode(), b'a/').replace(('b' + prefix + '/').encode(), b'b/')
        patch.append(data)
    patch_path = workspace / 'sling-portfolio-update.patch'
    patch_path.write_bytes(b''.join(patch))
    subprocess.run(['git', 'apply', '--check', str(patch_path)], cwd=baseline, check=True)
output = workspace / 'sling-portfolio-reviewed.zip'
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
    for name, path in sorted(current.items()):
        archive.write(path, root.name + '/' + name)
print(f'{len(changed)} portfolio files changed against {baseline_ref}; unrelated projects unchanged')
print(f'Patch application verified: {patch_path}')
print(f'Source ZIP: {output} ({output.stat().st_size} bytes)')
