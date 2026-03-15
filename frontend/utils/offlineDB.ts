/**
 * IndexedDB Wrapper for Offline Storage
 * Stores queued operations when network is unavailable
 */

interface QueuedOperation {
    id: string;
    type: 'attendance' | 'profile_update' | 'consent';
    data: any;
    timestamp: number;
    retryCount: number;
    status: 'pending' | 'syncing' | 'failed' | 'synced';
    error?: string;
    priority: number; // 1 = high, 2 = medium, 3 = low
}

interface ConflictRecord {
    id: string;
    operationId: string;
    localData: any;
    remoteData: any;
    timestamp: number;
    resolved: boolean;
    resolution?: 'local' | 'remote' | 'merged';
}

const DB_NAME = 'LabFaceOfflineDB';
const DB_VERSION = 1;
const QUEUE_STORE = 'operationQueue';
const CONFLICT_STORE = 'conflicts';

class OfflineDB {
    private db: IDBDatabase | null = null;

    /**
     * Initialize IndexedDB
     */
    async init(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Create operation queue store
                if (!db.objectStoreNames.contains(QUEUE_STORE)) {
                    const queueStore = db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
                    queueStore.createIndex('status', 'status', { unique: false });
                    queueStore.createIndex('type', 'type', { unique: false });
                    queueStore.createIndex('timestamp', 'timestamp', { unique: false });
                    queueStore.createIndex('priority', 'priority', { unique: false });
                }

                // Create conflicts store
                if (!db.objectStoreNames.contains(CONFLICT_STORE)) {
                    const conflictStore = db.createObjectStore(CONFLICT_STORE, { keyPath: 'id' });
                    conflictStore.createIndex('resolved', 'resolved', { unique: false });
                    conflictStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    /**
     * Add operation to queue
     */
    async addToQueue(operation: Omit<QueuedOperation, 'id' | 'retryCount' | 'status'>): Promise<string> {
        if (!this.db) await this.init();

        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const queuedOp: QueuedOperation = {
            ...operation,
            id,
            retryCount: 0,
            status: 'pending'
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([QUEUE_STORE], 'readwrite');
            const store = transaction.objectStore(QUEUE_STORE);
            const request = store.add(queuedOp);

            request.onsuccess = () => resolve(id);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all pending operations
     */
    async getPendingOperations(): Promise<QueuedOperation[]> {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([QUEUE_STORE], 'readonly');
            const store = transaction.objectStore(QUEUE_STORE);
            const index = store.index('status');
            const request = index.getAll('pending');

            request.onsuccess = () => {
                const operations = request.result as QueuedOperation[];
                // Sort by priority (1 = high first) then timestamp (oldest first)
                operations.sort((a, b) => {
                    if (a.priority !== b.priority) return a.priority - b.priority;
                    return a.timestamp - b.timestamp;
                });
                resolve(operations);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all operations (for debugging)
     */
    async getAllOperations(): Promise<QueuedOperation[]> {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([QUEUE_STORE], 'readonly');
            const store = transaction.objectStore(QUEUE_STORE);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Update operation status
     */
    async updateOperationStatus(
        id: string,
        status: QueuedOperation['status'],
        error?: string
    ): Promise<void> {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([QUEUE_STORE], 'readwrite');
            const store = transaction.objectStore(QUEUE_STORE);
            const getRequest = store.get(id);

            getRequest.onsuccess = () => {
                const operation = getRequest.result as QueuedOperation;
                if (!operation) {
                    reject(new Error('Operation not found'));
                    return;
                }

                operation.status = status;
                if (error) operation.error = error;
                if (status === 'failed') operation.retryCount++;

                const updateRequest = store.put(operation);
                updateRequest.onsuccess = () => resolve();
                updateRequest.onerror = () => reject(updateRequest.error);
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    /**
     * Delete operation from queue
     */
    async deleteOperation(id: string): Promise<void> {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([QUEUE_STORE], 'readwrite');
            const store = transaction.objectStore(QUEUE_STORE);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clear all synced operations
     */
    async clearSyncedOperations(): Promise<number> {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([QUEUE_STORE], 'readwrite');
            const store = transaction.objectStore(QUEUE_STORE);
            const index = store.index('status');
            const request = index.openCursor(IDBKeyRange.only('synced'));
            let count = 0;

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                    cursor.delete();
                    count++;
                    cursor.continue();
                } else {
                    resolve(count);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get queue statistics
     */
    async getQueueStats(): Promise<{
        total: number;
        pending: number;
        syncing: number;
        failed: number;
        synced: number;
    }> {
        if (!this.db) await this.init();

        const all = await this.getAllOperations();
        return {
            total: all.length,
            pending: all.filter(op => op.status === 'pending').length,
            syncing: all.filter(op => op.status === 'syncing').length,
            failed: all.filter(op => op.status === 'failed').length,
            synced: all.filter(op => op.status === 'synced').length
        };
    }

    /**
     * Add conflict record
     */
    async addConflict(conflict: Omit<ConflictRecord, 'id'>): Promise<string> {
        if (!this.db) await this.init();

        const id = `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const conflictRecord: ConflictRecord = { ...conflict, id };

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([CONFLICT_STORE], 'readwrite');
            const store = transaction.objectStore(CONFLICT_STORE);
            const request = store.add(conflictRecord);

            request.onsuccess = () => resolve(id);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get unresolved conflicts
     */
    async getUnresolvedConflicts(): Promise<ConflictRecord[]> {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([CONFLICT_STORE], 'readonly');
            const store = transaction.objectStore(CONFLICT_STORE);
            const index = store.index('resolved');
            const request = index.getAll(false as any);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clear all data (emergency use only)
     */
    async clearAll(): Promise<void> {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([QUEUE_STORE, CONFLICT_STORE], 'readwrite');

            transaction.objectStore(QUEUE_STORE).clear();
            transaction.objectStore(CONFLICT_STORE).clear();

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }
}

// Export singleton instance
export const offlineDB = new OfflineDB();
export type { QueuedOperation, ConflictRecord };
