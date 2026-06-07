/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    maxFPS: {
        description: "Max FPS to use when screensharing",
        default: 60,
        type: OptionType.NUMBER,
    },
    maxResolution: {
        description: "Max Resolution to use when screensharing",
        default: 1080,
        type: OptionType.NUMBER,
    }
});

export default definePlugin({
    name: "LimitlessScreenshare",
    description: "Bypasses screenshare quality restrictions. Use FakeNitro's 'Stream Quality Bypass' for the full unlock — this plugin adds the resolution/fps override.",
    authors: [{ name: "KawaiianPizza", id: 0n }],
    settings,
    patches: [
        {
            find: '"canStreamWithSettings"',
            replacement: {
                match: /(?=if\(\i===\i\.\i.PRESET_AUTO\))/,
                replace: "return !0;"
            }
        },
    ],
});
