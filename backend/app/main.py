"""FastAPI application factory.

Wires the API routers under ``/api`` and, when a built SPA is present, serves
it from ``/`` with a client-side-routing fallback. Unknown ``/api/*`` routes
always return JSON 404 (never the SPA shell).
"""

from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import Settings, get_settings
from app.routers import cats, foods, health, meals, reports, target
from app.routers import settings as settings_router


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    app = FastAPI(title="Cat Tracker API", version="0.0.0")

    app.include_router(health.router, prefix="/api")
    app.include_router(cats.router, prefix="/api")
    app.include_router(foods.router, prefix="/api")
    app.include_router(meals.router, prefix="/api")
    app.include_router(settings_router.router, prefix="/api")
    app.include_router(reports.router, prefix="/api")
    app.include_router(target.router, prefix="/api")

    _register_api_not_found(app)
    _mount_spa(app, settings.frontend_dist)

    return app


def _register_api_not_found(app: FastAPI) -> None:
    """Return JSON 404 for any unmatched ``/api/*`` path, for all methods.

    Registered after the real API routers, so concrete routes still win; this
    only catches the leftovers and keeps them from falling through to the SPA
    fallback below.
    """

    async def api_not_found(path: str) -> JSONResponse:
        return JSONResponse(status_code=404, content={"detail": "Not Found"})

    app.add_api_route(
        "/api/{path:path}",
        api_not_found,
        methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        include_in_schema=False,
    )


def _mount_spa(app: FastAPI, dist: Path) -> None:
    """Serve the built SPA from ``dist`` with a catch-all fallback to index.html.

    No-op when the build is absent (local API-only dev, tests), so the API and
    OpenAPI docs still work without a frontend build.
    """

    index = dist / "index.html"
    if not index.is_file():
        return

    assets = dist / "assets"
    if assets.is_dir():
        app.mount("/assets", StaticFiles(directory=assets), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa(full_path: str) -> FileResponse:
        candidate = dist / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(index)


app = create_app()
