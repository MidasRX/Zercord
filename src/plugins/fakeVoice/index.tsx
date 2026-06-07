/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, sendBotMessage } from "@api/Commands";
import definePlugin from "@utils/types";
import { FluxDispatcher, SelectedChannelStore, UserStore } from "@webpack/common";

let isGhostActive = false;
let configFakeMute = true;
let configFakeDeafen = true;

const syncState = () => {
    if (SelectedChannelStore?.getVoiceChannelId()) {
        FluxDispatcher.dispatch({ type: "AUDIO_TOGGLE_SELF_MUTE" });
        FluxDispatcher.dispatch({ type: "AUDIO_TOGGLE_SELF_MUTE" });
    }
};

export default definePlugin({
    name: "FakeVoice",
    description: "Appear muted or deaf while listening. By mushzi.",
    authors: [{ name: "mushzi", id: 449282863582412850n }],
    dependencies: ["CommandsAPI"],
    enabledByDefault: true,

    patches: [
        {
            find: "}voiceStateUpdate(",
            replacement: {
                match: /self_mute:([^,]+),self_deaf:([^,]+),self_video:([^,]+)/,
                replace: "self_mute:$self.toggle($1,'mute'),self_deaf:$self.toggle($2,'deaf'),self_video:$self.toggle($3,'video')"
            }
        }
    ],

    toggle(val: boolean, what: "mute" | "deaf" | "video") {
        if (!isGhostActive) return val;
        switch (what) {
            case "mute": return configFakeMute ? true : val;
            case "deaf": return configFakeDeafen ? true : val;
            case "video": return val;
        }
    },

    toolboxActions: {
        "Toggle FakeVoice"() {
            isGhostActive = !isGhostActive;
            syncState();
        },
        "Toggle Fake Mute"() {
            configFakeMute = !configFakeMute;
            if (!configFakeMute && !configFakeDeafen) isGhostActive = false;
            else isGhostActive = true;
            syncState();
        },
        "Toggle Fake Deafen"() {
            configFakeDeafen = !configFakeDeafen;
            if (!configFakeMute && !configFakeDeafen) isGhostActive = false;
            else isGhostActive = true;
            syncState();
        }
    },

    flux: {
        SPEAKING(event: { userId: string; speakingFlags: number; }) {
            // Suppress the green speaking ring for ourselves when ghost is active
            if (!isGhostActive) return;
            const myId = UserStore.getCurrentUser()?.id;
            if (event.userId === myId) {
                event.speakingFlags = 0;
            }
        }
    },

    commands: [
        {
            inputType: ApplicationCommandInputType.BUILT_IN,
            name: "fakemute",
            description: "Toggle Fake Mute",
            execute: async (_, ctx) => {
                configFakeMute = !configFakeMute;
                isGhostActive = configFakeMute;
                syncState();
                sendBotMessage(ctx.channel.id, { content: `👻 **Fake Mute** is ${isGhostActive ? "enabled" : "disabled"}.` });
            },
        },
        {
            inputType: ApplicationCommandInputType.BUILT_IN,
            name: "fakedeafen",
            description: "Toggle Fake Deafen",
            execute: async (_, ctx) => {
                configFakeDeafen = !configFakeDeafen;
                isGhostActive = configFakeDeafen;
                syncState();
                sendBotMessage(ctx.channel.id, { content: `👻 **Fake Deafen** is ${isGhostActive ? "enabled" : "disabled"}.` });
            },
        },
        {
            inputType: ApplicationCommandInputType.BUILT_IN,
            name: "fakedeafen_mute",
            description: "Toggle Fake Deafen & Mute simultaneously",
            execute: async (_, ctx) => {
                const next = !(configFakeMute && configFakeDeafen);
                configFakeMute = next;
                configFakeDeafen = next;
                isGhostActive = next;
                syncState();
                sendBotMessage(ctx.channel.id, { content: `👻 **Fake Deafen & Mute** are ${isGhostActive ? "enabled" : "disabled"}.` });
            },
        },
    ]
});
