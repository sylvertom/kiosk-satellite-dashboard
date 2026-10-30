"""Kiosk dashboard: Home Assistant serves the kiosk page at /local/kiosk_dashboard/index.html.

The page's files come with the integration, in its www/ folder (the release's zip puts
them there), and an update replaces them all. What is yours stays in /config/www/kiosk/,
where an install by hand keeps it too: config.js, and XP's wallpaper. The page finds them
at the same addresses as if they were next to it.

The address is under /local/ because Kiosk Satellite takes a custom page of Home
Assistant's only there. The page's address, the longer one, answers before Home
Assistant's /local/, the www folder, which has nothing at it.
"""

from __future__ import annotations

from pathlib import Path

from aiohttp import web

from homeassistant.components.http import HomeAssistantView, StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryError

DOMAIN = "kiosk_dashboard"
URL = f"/local/{DOMAIN}"
# Your files, in /config/www/kiosk/, by their address next to the page.
OWN_FILES = ("config.js", "themes/xp/bliss.jpg")


class OwnFileView(HomeAssistantView):
    """One of your files, read again at each request: an edit shows at the kiosk's next reload."""

    requires_auth = False  # as /local/: the page and its configuration come before it signs in

    def __init__(self, hass: HomeAssistant, name: str) -> None:
        self.url = f"{URL}/{name}"
        self.name = f"{DOMAIN}:{name}"
        self.hass = hass
        self.path = Path(hass.config.path("www", "kiosk", name))

    async def get(self, request: web.Request) -> web.StreamResponse:
        if not await self.hass.async_add_executor_job(self.path.is_file):
            raise web.HTTPNotFound()
        return web.FileResponse(self.path, headers={"Cache-Control": "no-cache"})


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Serve the page. Only once: Home Assistant cannot take an address back until it restarts."""
    if DOMAIN not in hass.data:
        www = Path(__file__).parent / "www"
        if not await hass.async_add_executor_job(www.is_dir):  # copied from the repository, not a release
            raise ConfigEntryError(f"{www} is missing: install the integration from a release's kiosk_dashboard.zip")
        for name in OWN_FILES:  # before the page's folder, which would answer for them otherwise
            hass.http.register_view(OwnFileView(hass, name))
        # Without cache headers, the kiosks ask whether index.html has changed: an update
        # shows at their next reload, and its new ?v= versions bring the other files.
        await hass.http.async_register_static_paths(
            [StaticPathConfig(URL, str(www), cache_headers=False)]
        )
        hass.data[DOMAIN] = True
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Nothing to stop: the page stays served until Home Assistant restarts."""
    return True
