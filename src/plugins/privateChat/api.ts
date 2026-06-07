/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const SERVER_URL = "https://zerdium.com";

export async function registerPublicKey(userId: string, publicKeyJwk: JsonWebKey, deviceToken: string): Promise<boolean> {
    const res = await fetch(`${SERVER_URL}/api/keys/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Device-Token": deviceToken
        },
        body: JSON.stringify({ userId, publicKey: publicKeyJwk })
    });
    return res.ok;
}

export async function fetchPublicKey(userId: string): Promise<JsonWebKey | null> {
    const res = await fetch(`${SERVER_URL}/api/keys/${userId}`);
    if (!res.ok) return null;
    const data = await res.json();
    // Server may return publicKey as a JSON string or as an object
    const key = data.publicKey;
    if (typeof key === "string") {
        try {
            return JSON.parse(key);
        } catch {
            return null;
        }
    }
    return key;
}

export async function setBackground(pairId: string, imageUrl: string, deviceToken: string): Promise<boolean> {
    const res = await fetch(`${SERVER_URL}/api/settings/background`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Device-Token": deviceToken
        },
        body: JSON.stringify({ pairId, imageUrl })
    });
    return res.ok;
}

export async function getBackground(pairId: string): Promise<string | null> {
    const res = await fetch(`${SERVER_URL}/api/settings/background/${pairId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.imageUrl;
}

export function getPairId(userId1: string, userId2: string): string {
    return [userId1, userId2].sort().join("-");
}
