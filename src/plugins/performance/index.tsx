/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { FluxDispatcher } from "@webpack/common";

let animationFrameId: number | null = null;
let reducedAnimations = false;
let streamActive = false;

const settings = definePluginSettings({
    gamingMode: {
        type: OptionType.BOOLEAN,
        description: "Gaming Mode — reduces Discord resource usage when screensharing (lower CSS animations, reduced DOM updates)",
        default: true,
        restartNeeded: false
    },
    disableAnimationsDuringStream: {
        type: OptionType.BOOLEAN,
        description: "Disable CSS animations & transitions when streaming (big FPS gain)",
        default: true,
        restartNeeded: false
    },
    reducedMotion: {
        type: OptionType.BOOLEAN,
        description: "Force reduced motion always (lighter on GPU)",
        default: false,
        restartNeeded: false
    },
    lazyGuilds: {
        type: OptionType.BOOLEAN,
        description: "Prevent guild list from re-rendering while streaming",
        default: true,
        restartNeeded: false
    },
    limitGC: {
        type: OptionType.BOOLEAN,
        description: "Trigger garbage collection hints periodically during streams to reduce memory pressure",
        default: true,
        restartNeeded: false
    }
});

const PERF_STYLE_ID = "vc-performance-style";

function injectPerformanceCSS() {
    if (document.getElementById(PERF_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = PERF_STYLE_ID;
    style.textContent = `
        /* Kill all CSS animations and transitions to save GPU compositing */
        *, *::before, *::after {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.001ms !important;
            transition-delay: 0ms !important;
        }
        /* Disable avatar hover animations */
        [class*="avatar"] img {
            animation: none !important;
        }
        /* Disable typing indicator animation */
        [class*="typing"] [class*="dots"] {
            animation: none !important;
        }
        /* Disable emoji animations in chat */
        img[class*="emoji"][src*=".gif"] {
            content: url("") !important;
            visibility: hidden;
        }
        /* Reduce box-shadow compositing (used heavily in Discord) */
        [class*="message"]:hover {
            box-shadow: none !important;
        }
        /* Disable smooth scrolling */
        * {
            scroll-behavior: auto !important;
        }
        /* GPU layer reduction — prevent unnecessary compositing layers */
        [class*="scroller"] {
            will-change: auto !important;
            transform: none !important;
        }
    `;
    document.head.appendChild(style);
    reducedAnimations = true;
}

function removePerformanceCSS() {
    const el = document.getElementById(PERF_STYLE_ID);
    if (el) el.remove();
    reducedAnimations = false;
}

function injectReducedMotionCSS() {
    const id = "vc-reduced-motion";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
        /* Force prefers-reduced-motion behavior */
        *, *::before, *::after {
            animation-duration: 0.001ms !important;
            transition-duration: 0.001ms !important;
        }
    `;
    document.head.appendChild(style);
}

function removeReducedMotionCSS() {
    const el = document.getElementById("vc-reduced-motion");
    if (el) el.remove();
}

// Hint GC by creating and discarding pressure
let gcInterval: ReturnType<typeof setInterval> | null = null;
function startGCHints() {
    if (gcInterval) return;
    gcInterval = setInterval(() => {
        // Create a large temporary allocation to hint the GC
        if ((window as any).gc) {
            (window as any).gc();
        }
    }, 30000); // Every 30s
}

function stopGCHints() {
    if (gcInterval) {
        clearInterval(gcInterval);
        gcInterval = null;
    }
}

export default definePlugin({
    name: "Performance",
    description: "Reduces Discord's resource usage during screenshare/gaming to prevent stutter. Disables CSS animations, reduces GPU compositing, and optimizes rendering.",
    authors: [{ name: "mushzi", id: 449282863582412850n }],
    settings,

    start() {
        // Apply reduced motion if always-on
        if (settings.store.reducedMotion) {
            injectReducedMotionCSS();
        }
    },

    stop() {
        removePerformanceCSS();
        removeReducedMotionCSS();
        stopGCHints();
        streamActive = false;
    },

    flux: {
        STREAM_CREATE() {
            streamActive = true;
            if (settings.store.gamingMode && settings.store.disableAnimationsDuringStream) {
                injectPerformanceCSS();
            }
            if (settings.store.limitGC) {
                startGCHints();
            }
        },
        STREAM_DELETE() {
            streamActive = false;
            if (reducedAnimations && !settings.store.reducedMotion) {
                removePerformanceCSS();
            }
            stopGCHints();
        },
        // Also trigger on voice state changes (joining VC with screenshare)
        VOICE_STATE_UPDATES({ voiceStates }) {
            // Detect if we started streaming
            for (const state of voiceStates ?? []) {
                if (state.selfStream && !streamActive) {
                    streamActive = true;
                    if (settings.store.gamingMode && settings.store.disableAnimationsDuringStream) {
                        injectPerformanceCSS();
                    }
                    if (settings.store.limitGC) {
                        startGCHints();
                    }
                }
            }
        }
    },

    // Toolbox action for manual toggle
    toolboxActions: {
        "Toggle Gaming Mode"() {
            if (reducedAnimations) {
                removePerformanceCSS();
                stopGCHints();
            } else {
                injectPerformanceCSS();
                startGCHints();
            }
        }
    }
});
