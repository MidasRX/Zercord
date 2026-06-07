/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { FluxDispatcher, RelationshipStore } from "@webpack/common";

const trollMessages = [
    "PLS GIV ROBUX IM BLACK AFRICA NEED YOU",
    "bro called me for 1 hour straight 💀💀💀",
    "PLS ROBUX I BEG YOU MY FAMILY STARVING",
    "yo i tried calling you for 1 hour why you not picking up",
    "GIVE ROBUX OR I CALL YOU FOR 2 HOURS",
    "i just called you 47 times why no answer",
    "PLS GIV ROBUX IM IN AFRICA NO WIFI ONLY DISCORD",
    "bro stayed on call for 1 hour saying nothing 💀",
    "PLEASE ROBUX MY MOM SAID SHE WILL BEAT ME",
    "i will call you every day for 1 hour until you give robux",
    "PLS PLS PLS ROBUX I NEED 10000 ROBUX FOR MY FAMILY",
    "why did you decline my 1 hour call im crying rn",
    "GIVE ME ROBUX OR I REPORT YOU TO ROBLOX POLICE",
    "bro left me on a 1 hour call on mute 💀💀",
    "IM CALLING YOU RIGHT NOW PICK UP I NEED ROBUX",
];

function getTrollMessage(messageId: string): string {
    const hash = messageId.split("").reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
    }, 0);
    return trollMessages[Math.abs(hash) % trollMessages.length];
}

const settings = definePluginSettings({
    blockCalls: {
        type: OptionType.BOOLEAN,
        description: "Auto-decline incoming calls from ignored users (DMs and group chats)",
        default: true
    }
});

export default definePlugin({
    name: "IgnoredTroll",
    description: "Replaces ignored users messages with troll text and blocks their calls",
    authors: [{ name: "mushzi", id: 449282863582412850n }],

    settings,

    flux: {
        MESSAGE_CREATE({ message }) {
            if (!message?.author?.id) return;
            if (RelationshipStore.isIgnored(message.author.id)) {
                message.content = getTrollMessage(message.id);
                message.embeds = [];
                message.attachments = [];
                message.sticker_items = [];
                message.components = [];
            }
        },
        MESSAGE_UPDATE({ message }) {
            if (!message?.author?.id) return;
            if (RelationshipStore.isIgnored(message.author.id)) {
                message.content = getTrollMessage(message.id);
                message.embeds = [];
                message.attachments = [];
                message.sticker_items = [];
                message.components = [];
            }
        },
        CALL_CREATE(event) {
            if (!settings.store.blockCalls) return;
            const userId = event?.userId ?? event?.ringerId;
            if (userId && RelationshipStore.isIgnored(userId)) {
                try {
                    FluxDispatcher.dispatch({ type: "CALL_DELETE", channelId: event.channelId });
                } catch { }
            }
        },
        CALL_RINGING(event) {
            if (!settings.store.blockCalls) return;
            const userId = event?.userId ?? event?.ringerId;
            if (userId && RelationshipStore.isIgnored(userId)) {
                try {
                    FluxDispatcher.dispatch({ type: "CALL_DELETE", channelId: event.channelId });
                } catch { }
            }
        }
    }
});
