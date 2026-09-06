"""Package only public website files; no Git history, test tools or local caches."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import json

root = Path(__file__).resolve().parents[1]
output = root / ".cache" / "deploy"
output.mkdir(parents=True, exist_ok=True)
archive_path = output / "playchessclub-website.zip"
folders = ("assets", "ai", "gallery", "mail", "pration", "session-closed", "status", "插件")
files = list(root.glob("*.html"))
for folder in folders:
    files.extend(file for file in (root / folder).rglob("*") if file.is_file())
files.sort(key=lambda file: file.relative_to(root).as_posix())

with ZipFile(archive_path, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
    for file in files:
        if file.is_symlink() or not file.resolve().is_relative_to(root):
            raise ValueError(f"Unexpected file outside the website: {file}")
        archive.write(file, file.relative_to(root).as_posix())

with ZipFile(archive_path) as archive:
    assert archive.testzip() is None
    names = set(archive.namelist())
    for required in ("index.html", "assets/models/home/pcc-riverside.glb", "assets/scripts/home-scene-renderer.js", "assets/images/home/cover-day.webp", "assets/images/home/cover-night.webp", "assets/vendor/three/LICENSE", "mail/index.html", "gallery/index.html"):
        assert required in names, f"Missing website asset: {required}"
    assert not any(name.startswith((".git/", ".cache/", "tools/", "node_modules/")) for name in names)

summary = {
    "archive": archive_path.name,
    "files": len(files),
    "bytes": archive_path.stat().st_size,
    "sha256": hashlib.sha256(archive_path.read_bytes()).hexdigest(),
}
(output / "manifest.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
print(json.dumps(summary, indent=2))
