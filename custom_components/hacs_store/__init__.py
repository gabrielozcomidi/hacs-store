"""HACS Store — a discovery panel for HACS.

This integration does almost nothing on the Python side. It serves a folder of
static frontend files and registers a sidebar panel that loads one of them.
All the real work happens in the browser, talking to HACS over the websocket
connection Home Assistant already has open.
"""

from __future__ import annotations

import logging
import os

from homeassistant.components import frontend
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import (
    DOMAIN,
    PANEL_ELEMENT,
    PANEL_ICON,
    PANEL_TITLE,
    PANEL_URL_PATH,
    URL_BASE,
)

_LOGGER = logging.getLogger(__name__)


def _version(hass: HomeAssistant) -> str:
    """Read our own version, used only to bust the browser cache on upgrade."""
    integration_dir = os.path.dirname(__file__)
    manifest = os.path.join(integration_dir, "manifest.json")
    try:
        import json

        with open(manifest, encoding="utf-8") as file:
            return json.load(file).get("version", "0")
    except Exception:  # noqa: BLE001 - a missing version is not worth failing setup over
        return "0"


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Serve the frontend and put the panel in the sidebar."""
    frontend_dir = os.path.join(os.path.dirname(__file__), "frontend")

    # cache_headers=False: these files change when you edit them, and you will edit them.
    await hass.http.async_register_static_paths(
        [StaticPathConfig(URL_BASE, frontend_dir, False)]
    )

    version = _version(hass)

    frontend.async_register_built_in_panel(
        hass,
        component_name="custom",
        sidebar_title=PANEL_TITLE,
        sidebar_icon=PANEL_ICON,
        frontend_url_path=PANEL_URL_PATH,
        require_admin=True,
        config={
            "_panel_custom": {
                "name": PANEL_ELEMENT,
                "module_url": f"{URL_BASE}/hacs-store-panel.js?v={version}",
                "embed_iframe": False,
                "trust_external": False,
            }
        },
    )

    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = True
    _LOGGER.debug("HACS Store panel registered at /%s", PANEL_URL_PATH)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Remove the sidebar panel again."""
    frontend.async_remove_panel(hass, PANEL_URL_PATH)
    hass.data.get(DOMAIN, {}).pop(entry.entry_id, None)
    return True
