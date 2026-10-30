#!/usr/bin/env node
// The check suite. Drives headless Chrome over the DevTools protocol against
// tools/mock-ha.mjs: loads the page as each kiosk, taps, drags and
// long-presses with touch events, checks the mock's states and saves
// screenshots (to screenshots/, which git ignores). With --docs it also
// refreshes the few in docs/images. The checks live in tools/checks/, one
// file per part of the page. Needs Google Chrome (or CHROME=<path>).
// No dependencies.
// Usage: node tools/mock-ha.mjs &  then  node tools/shoot.mjs [--docs] [outdir]
import { reset, finish } from './checks/harness.mjs';
import { bedroomSpot, livingSpot } from './checks/spot.mjs';
import { insideKioskSatellite } from './checks/kiosk-satellite.mjs';
import { bedroomShow5, livingShow8, tilesShow8 } from './checks/show.mjs';
import { lightsOff, mainWithoutMembers, sevenRooms } from './checks/rooms.mjs';
import { noPlayer, ringSizes } from './checks/menus.mjs';
import { signIn, noConfig } from './checks/sign-in.mjs';
import { integration } from './checks/install.mjs';
import { accentFollowsLight, pictures, gradients, themes } from './checks/theme.mjs';
import { settingsSpot, settingsShow } from './checks/settings.mjs';
import { alertsSpot, alertsShow } from './checks/alerts.mjs';
import { eventsSpot, eventsShow } from './checks/events.mjs';
import { musicShow8 } from './checks/music.mjs';

await reset();
await bedroomSpot();
await livingSpot();
await insideKioskSatellite();
await bedroomShow5();
await livingShow8();
await reset();
await tilesShow8();
await reset();
await lightsOff();
await reset();
await mainWithoutMembers();
await reset();
await sevenRooms();
await noPlayer();
await ringSizes();
await signIn();
await noConfig();
await integration();
await reset();
await accentFollowsLight();
await pictures();
await gradients();
await themes();
await reset();
await settingsSpot();
await settingsShow();
await reset();
await alertsSpot();
await alertsShow();
await reset();
await eventsSpot();
await reset();
await eventsShow();
await reset();
await musicShow8();
await finish();
