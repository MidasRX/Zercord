/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { addMessagePreSendListener, removeMessagePreSendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, FluxDispatcher, Menu, MessageStore, RestAPI, Toasts, UserStore } from "@webpack/common";

import { fetchPublicKey, getBackground, getPairId, registerPublicKey } from "./api";
import { decrypt, deriveSharedKey, encrypt, exportPrivateKey, exportPublicKey, generateKeyPair, importPrivateKey, importPublicKey, isEncryptedMessage } from "./crypto";

interface PrivateChatState {
    keyPair: CryptoKeyPair | null;
    sharedKeys: Map<string, CryptoKey>; // userId -> derived AES key
    enabledChannels: Set<string>; // channelIds where encryption is active
    deviceToken: string;
}

const state: PrivateChatState = {
    keyPair: null,
    sharedKeys: new Map(),
    enabledChannels: new Set(),
    deviceToken: ""
};

function generateDeviceToken(): string {
    const arr = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(arr, b => b.toString(16).padStart(2, "0")).join("");
}

async function initKeys() {
    const stored = settings.store.privateKeyJwk;
    const storedPub = settings.store.publicKeyJwk;

    if (stored && storedPub) {
        try {
            const privateKey = await importPrivateKey(JSON.parse(stored));
            const publicKey = await importPublicKey(JSON.parse(storedPub));
            state.keyPair = { privateKey, publicKey };
        } catch {
            await createNewKeyPair();
        }
    } else {
        await createNewKeyPair();
    }

    if (!settings.store.deviceToken) {
        settings.store.deviceToken = generateDeviceToken();
    }
    state.deviceToken = settings.store.deviceToken;

    // Load enabled channels
    const channels = settings.store.enabledChannelIds;
    if (channels) {
        channels.split(",").filter(Boolean).forEach(id => state.enabledChannels.add(id));
    }
}

async function createNewKeyPair() {
    state.keyPair = await generateKeyPair();
    const pubJwk = await exportPublicKey(state.keyPair.publicKey);
    const privJwk = await exportPrivateKey(state.keyPair.privateKey);
    settings.store.publicKeyJwk = JSON.stringify(pubJwk);
    settings.store.privateKeyJwk = JSON.stringify(privJwk);
}

async function registerKeys() {
    if (!state.keyPair) return;
    const userId = UserStore.getCurrentUser()?.id;
    if (!userId) return;
    const pubJwk = await exportPublicKey(state.keyPair.publicKey);
    await registerPublicKey(userId, pubJwk, state.deviceToken);
}

async function getOrDeriveSharedKey(targetUserId: string): Promise<CryptoKey | null> {
    if (state.sharedKeys.has(targetUserId)) {
        return state.sharedKeys.get(targetUserId)!;
    }

    const theirPubJwk = await fetchPublicKey(targetUserId);
    if (!theirPubJwk || !state.keyPair) return null;

    const theirPubKey = await importPublicKey(theirPubJwk);
    const sharedKey = await deriveSharedKey(state.keyPair.privateKey, theirPubKey);
    state.sharedKeys.set(targetUserId, sharedKey);
    return sharedKey;
}

function getOtherUserId(channelId: string): string | null {
    const channel = ChannelStore.getChannel(channelId);
    if (!channel || !channel.isDM()) return null;
    const myId = UserStore.getCurrentUser()?.id;
    return channel.recipients?.find(id => id !== myId) ?? null;
}

function saveEnabledChannels() {
    settings.store.enabledChannelIds = Array.from(state.enabledChannels).join(",");
}

async function startPrivateChat(userId: string) {
    try {
        // Ensure we have keys
        if (!state.keyPair) await initKeys();
        await registerKeys();

        // Check if other user has registered
        const theirKey = await fetchPublicKey(userId);
        if (!theirKey) {
            Toasts.show({
                message: "❌ This user doesn't have Private Chat! They need to install Zercord and enable the PrivateChat plugin.",
                type: Toasts.Type.FAILURE,
                id: Toasts.genId(),
                options: {
                    duration: 5000,
                    position: Toasts.Position.BOTTOM
                }
            });
            return;
        }

        // Derive shared key
        await getOrDeriveSharedKey(userId);

        // Get or create DM channel
        const channelId = await getOrCreateDM(userId);
        if (!channelId) return;

        // Enable encryption on this channel
        state.enabledChannels.add(channelId);
        saveEnabledChannels();

        Toasts.show({
            message: "🔒 Private Chat enabled! Messages are now E2E encrypted.",
            type: Toasts.Type.SUCCESS,
            id: Toasts.genId(),
            options: {
                duration: 3000,
                position: Toasts.Position.BOTTOM
            }
        });
    } catch (e) {
        console.error("[PrivateChat] startPrivateChat error:", e);
        Toasts.show({
            message: `❌ Private Chat error: ${e instanceof Error ? e.message : "Unknown error"}`,
            type: Toasts.Type.FAILURE,
            id: Toasts.genId(),
            options: {
                duration: 5000,
                position: Toasts.Position.BOTTOM
            }
        });
    }
}

async function getOrCreateDM(userId: string): Promise<string | null> {
    try {
        const res = await RestAPI.post({
            url: "/users/@me/channels",
            body: { recipients: [userId] }
        });
        return res.body.id;
    } catch {
        return null;
    }
}

async function autoDeleteMessage(channelId: string, messageId: string, delayMs: number) {
    setTimeout(async () => {
        try {
            await RestAPI.del({
                url: `/channels/${channelId}/messages/${messageId}`
            });
        } catch { }
    }, delayMs);
}

function getDeleteDelay(): number {
    switch (settings.store.autoDeleteTime) {
        case "1h": return 60 * 60 * 1000;
        case "24h": return 24 * 60 * 60 * 1000;
        case "7d": return 7 * 24 * 60 * 60 * 1000;
        default: return 0; // never
    }
}

const settings = definePluginSettings({
    autoDeleteTime: {
        type: OptionType.SELECT,
        description: "Auto-delete your messages after:",
        options: [
            { label: "Never", value: "never", default: true },
            { label: "1 hour", value: "1h" },
            { label: "24 hours", value: "24h" },
            { label: "7 days", value: "7d" }
        ]
    },
    backgroundUrl: {
        type: OptionType.STRING,
        description: "Custom background image URL for private chats",
        default: ""
    },
    privateKeyJwk: {
        type: OptionType.STRING,
        description: "Your private key (DO NOT SHARE)",
        default: "",
        hidden: true
    },
    publicKeyJwk: {
        type: OptionType.STRING,
        description: "Your public key",
        default: "",
        hidden: true
    },
    deviceToken: {
        type: OptionType.STRING,
        description: "Device authentication token",
        default: "",
        hidden: true
    },
    enabledChannelIds: {
        type: OptionType.STRING,
        description: "Channels with encryption enabled",
        default: "",
        hidden: true
    }
});

export default definePlugin({
    name: "PrivateChat",
    description: "End-to-end encrypted private DMs with auto-delete. Right-click a user to start.",
    authors: [{ name: "mushzi", id: 449282863582412850n }],
    settings,

    contextMenus: {
        "user-context": (children, { user }) => {
            if (!user || user.id === UserStore.getCurrentUser()?.id) return;
            children.splice(-1, 0,
                <Menu.MenuGroup>
                    <Menu.MenuItem
                        id="vc-private-chat-start"
                        label="🔒 Start Private Chat"
                        action={() => startPrivateChat(user.id)}
                    />
                </Menu.MenuGroup>
            );
        }
    },

    async start() {
        await initKeys();
        await registerKeys();

        this.preSend = addMessagePreSendListener(async (channelId, messageObj) => {
            if (!state.enabledChannels.has(channelId)) return;

            const otherUserId = getOtherUserId(channelId);
            if (!otherUserId) return;

            const sharedKey = await getOrDeriveSharedKey(otherUserId);
            if (!sharedKey) {
                Toasts.show({
                    message: "❌ Can't encrypt: the other user hasn't registered their key. They need Zercord with PrivateChat enabled.",
                    type: Toasts.Type.FAILURE,
                    id: Toasts.genId(),
                    options: {
                        duration: 5000,
                        position: Toasts.Position.BOTTOM
                    }
                });
                // Block the message from sending unencrypted
                messageObj.content = "";
                return { cancel: true };
            }

            const encrypted = await encrypt(sharedKey, messageObj.content);
            messageObj.content = encrypted;
        });
    },

    stop() {
        removeMessagePreSendListener(this.preSend);
    },

    flux: {
        async MESSAGE_CREATE({ message, channelId }) {
            if (!state.enabledChannels.has(channelId)) return;
            if (!message?.content || !isEncryptedMessage(message.content)) return;

            const otherUserId = getOtherUserId(channelId);
            if (!otherUserId) return;

            const sharedKey = await getOrDeriveSharedKey(otherUserId);
            if (!sharedKey) return;

            const decrypted = await decrypt(sharedKey, message.content);
            if (decrypted !== null) {
                message.content = decrypted;

                // Force re-render
                FluxDispatcher.dispatch({
                    type: "MESSAGE_UPDATE",
                    message: { ...message, content: decrypted }
                });
            }

            // Auto-delete if configured
            const delay = getDeleteDelay();
            if (delay > 0 && message.author.id === UserStore.getCurrentUser()?.id) {
                autoDeleteMessage(channelId, message.id, delay);
            }
        },

        async MESSAGE_UPDATE({ message }) {
            if (!message?.channel_id || !state.enabledChannels.has(message.channel_id)) return;
            if (!message.content || !isEncryptedMessage(message.content)) return;

            const otherUserId = getOtherUserId(message.channel_id);
            if (!otherUserId) return;

            const sharedKey = await getOrDeriveSharedKey(otherUserId);
            if (!sharedKey) return;

            const decrypted = await decrypt(sharedKey, message.content);
            if (decrypted !== null) {
                message.content = decrypted;
            }
        }
    }
});
