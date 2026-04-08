import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

// This declares the value of `injectionPoint` to TypeScript.
// `injectionPoint` is the string that gets replaced by the actual precache manifest.
declare global {
    interface WorkerGlobalScope extends SerwistGlobalConfig {
        __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
    precacheEntries: self.__SW_MANIFEST,
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: true,
    runtimeCaching: defaultCache,
});

serwist.addEventListeners();

// Push Notification Listeners
self.addEventListener('push', (event) => {
    const data = event.data?.json() ?? {};
    const title = data.title || 'Reforma';
    const body = data.body || 'You have a new notification';
    const icon = data.icon || '/icon.png';
    const badge = data.badge || '/icon.png';
    const payloadData = data.data || {};

    event.waitUntil(
        self.registration.showNotification(title, {
            body,
            icon,
            badge,
            data: payloadData,
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    // Default URL to open
    let urlToOpen = '/';
    
    // Try to extract URL from payload data
    if (event.notification.data) {
        if (event.notification.data.url) urlToOpen = event.notification.data.url;
        else if (event.notification.data.matterId) urlToOpen = `/calendar?matterId=${event.notification.data.matterId}`;
        else if (event.notification.data.briefId) urlToOpen = `/briefs/${event.notification.data.briefId}`;
        else if (event.notification.data.taskId) urlToOpen = `/briefs`;
    }

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Check if there is already a window/tab open with the target URL
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                // If so, just focus it
                if (client.url.includes(urlToOpen) && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not, open a new window/tab
            if (self.clients.openWindow) {
                return self.clients.openWindow(urlToOpen);
            }
        })
    );
});
