"""SPA fallback: serves the built frontend, refuses to escape ``dist``."""

from pathlib import Path

from app.config import Settings
from app.main import create_app
from fastapi.testclient import TestClient


def _spa_client(dist: Path) -> TestClient:
    dist.mkdir(parents=True, exist_ok=True)
    (dist / "index.html").write_text("<html>shell</html>")
    app = create_app(Settings(database_url="sqlite://", frontend_dist=dist))
    return TestClient(app)


def test_unknown_path_falls_back_to_index(tmp_path: Path) -> None:
    client = _spa_client(tmp_path / "dist")
    response = client.get("/some/client/route")
    assert response.status_code == 200
    assert response.text == "<html>shell</html>"


def test_existing_file_is_served_directly(tmp_path: Path) -> None:
    dist = tmp_path / "dist"
    client = _spa_client(dist)
    (dist / "manifest.webmanifest").write_text('{"name": "Cat Tracker"}')

    response = client.get("/manifest.webmanifest")
    assert response.status_code == 200
    assert response.json() == {"name": "Cat Tracker"}


def test_traversal_path_cannot_escape_dist(tmp_path: Path) -> None:
    # A secret file outside dist — e.g. the sibling SQLite volume in prod.
    outside = tmp_path / "secret.txt"
    outside.write_text("do not serve me")
    dist = tmp_path / "dist"
    client = _spa_client(dist)

    response = client.get("/../secret.txt")
    # httpx/Starlette normalise "/../x" to "/x" before routing, so this also
    # exercises the catch-all; the encoded form below is the real-world vector.
    assert response.text != "do not serve me"

    response = client.get("/%2e%2e/secret.txt")
    assert response.text != "do not serve me"
    assert response.text == "<html>shell</html>"
