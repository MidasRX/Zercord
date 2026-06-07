/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const ENCRYPTION_PREFIX = "\u{1F512} ";

export async function generateKeyPair(): Promise<CryptoKeyPair> {
    return crypto.subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveKey"]
    );
}

export async function exportPublicKey(key: CryptoKey): Promise<JsonWebKey> {
    return crypto.subtle.exportKey("jwk", key);
}

export async function exportPrivateKey(key: CryptoKey): Promise<JsonWebKey> {
    return crypto.subtle.exportKey("jwk", key);
}

export async function importPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
    return crypto.subtle.importKey(
        "jwk",
        jwk,
        { name: "ECDH", namedCurve: "P-256" },
        true,
        []
    );
}

export async function importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
    return crypto.subtle.importKey(
        "jwk",
        jwk,
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveKey"]
    );
}

export async function deriveSharedKey(privateKey: CryptoKey, publicKey: CryptoKey): Promise<CryptoKey> {
    return crypto.subtle.deriveKey(
        { name: "ECDH", public: publicKey },
        privateKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

export async function encrypt(sharedKey: CryptoKey, plaintext: string): Promise<string> {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = encoder.encode(plaintext);

    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        sharedKey,
        data
    );

    // Combine IV + ciphertext into one buffer
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return ENCRYPTION_PREFIX + arrayBufferToBase64(combined.buffer);
}

export async function decrypt(sharedKey: CryptoKey, message: string): Promise<string | null> {
    if (!isEncryptedMessage(message)) return null;

    try {
        const payload = message.slice(ENCRYPTION_PREFIX.length);
        const combined = base64ToArrayBuffer(payload);
        const iv = combined.slice(0, 12);
        const ciphertext = combined.slice(12);

        const plaintext = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: new Uint8Array(iv) },
            sharedKey,
            ciphertext
        );

        return new TextDecoder().decode(plaintext);
    } catch {
        return null;
    }
}

export function isEncryptedMessage(content: string): boolean {
    return content.startsWith(ENCRYPTION_PREFIX);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}
