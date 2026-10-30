"""Adding the integration: one step, with nothing to fill in."""

from __future__ import annotations

from typing import Any

from homeassistant.config_entries import ConfigFlow, ConfigFlowResult

from . import DOMAIN


class KioskDashboardFlow(ConfigFlow, domain=DOMAIN):
    """The one entry that serves the page (single_config_entry in manifest.json)."""

    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            return self.async_create_entry(title="Kiosk dashboard", data={})
        return self.async_show_form(step_id="user")
