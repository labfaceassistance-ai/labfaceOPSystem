/**
 * Offline Support with Service Worker
 * Caches essential data and queues actions for sync
 */

// Service Worker Registration
export function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker
                .register('/sw.js')
                .then(registration => {
                    console.log('SW registered:', registration);
                })
                .catch(error => {
                    console.log('SW registration failed:', error);
                });
        });
    }
}

// Note: OfflineIndicator component moved to components/OfflineIndicator.tsx

// IndexedDB Helper
class OfflineStorage {
    private dbName = 'LabFaceOffline';
    private version = 1;
    private db: IDBDatabase | null = null;

    async init() {
        return new Promise<void>((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Create stores
                if (!db.objectStoreNames.contains('cache')) {
                    db.createObjectStore('cache', { keyPath: 'key' });
                }
                if (!db.objectStoreNames.contains('queue')) {
                    db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
                }
            };
        });
    }

    async setCache(key: string, data: any) {
        if (!this.db) await this.init();

        const transaction = this.db!.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');

        await store.put({ key, data, timestamp: Date.now() });
    }

    async getCache(key: string) {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['cache'], 'readonly');
            const store = transaction.objectStore('cache');
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result?.data);
            request.onerror = () => reject(request.error);
        });
    }

    async queueAction(action: any) {
        if (!this.db) await this.init();

        const transaction = this.db!.transaction(['queue'], 'readwrite');
        const store = transaction.objectStore('queue');

        await store.add({ action, timestamp: Date.now() });
    }

    async getQueue() {
        if (!this.db) await this.init();

        return new Promise<any[]>((resolve, reject) => {
            const transaction = this.db!.transaction(['queue'], 'readonly');
            const store = transaction.objectStore('queue');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async clearQueue() {
        if (!this.db) await this.init();

        const transaction = this.db!.transaction(['queue'], 'readwrite');
        const store = transaction.objectStore('queue');

        await store.clear();
    }
}

export const offlineStorage = new OfflineStorage();

// Sync Queue when online
export async function syncQueue() {
    const queue = await offlineStorage.getQueue();

    for (const item of queue) {
        try {
            // Execute queued action
            await fetch(item.action.url, {
                method: item.action.method,
                headers: item.action.headers,
                body: item.action.body
            });
        } catch (error) {
            console.error('Failed to sync action:', error);
            // Keep in queue for next sync
            return;
        }
    }

    await offlineStorage.clearQueue();
}

// Auto-sync on reconnect
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        syncQueue();
    });
}
