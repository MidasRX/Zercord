/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { RelationshipStore } from "@webpack/common";

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
        description: "Auto-decline incoming calls from ignored users",
        default: true
    }
});

export default definePlugin({
    name: "IgnoredTroll",
    description: "Replaces ignored users messages with troll text and blocks their calls",
    authors: [{ name: "mushzi", id: 449282863582412850n }],

    settings,

    patches: [
        {
            find: "renderContentOnly:",
            replacement: {
                match: /let{message:(\i),.{0,100}renderContentOnly:/,
                replace: "$self.trollMessage($1);$&"
            }
        },
        {
            find: '"CALL_CREATE"',
            replacement: {
                match: /case"CALL_CREATE":(\i)=/,
                replace: "case\"CALL_CREATE\":if($self.shouldBlockCall(arguments[0]))return;$1="
            }
        }
    ],

    trollMessage(message: any) {
        if (!message?.author?.id) return;
        if (RelationshipStore.isIgnored(message.author.id)) {
            message.content = getTrollMessage(message.id);
            if (message.embeds) message.embeds = [];
            if (message.attachments) message.attachments = [];
        }
    },

    shouldBlockCall(event: any): boolean {
        if (!settings.store.blockCalls) return false;
        const userId = event?.userId ?? event?.message?.author?.id;
        if (!userId) return false;
        return RelationshipStore.isIgnored(userId);
    }
});
