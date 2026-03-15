import { offlineQueueService } from './offlineQueueService';
import { offlineDB } from '../utils/offlineDB';

/**
 * Sync Manager
 * Handles automatic synchronization of offline operations
 */
class SyncManager {
    private syncInterval: NodeJS.Timeout | null = null;
    private isSyncing = false;
    private listeners: Set<(status: SyncStatus) => void> = new Set();

    /**
     * Start automatic synchronization
     */
    startAutoSync(intervalMs: number = 30000): void {
        if (this.syncInterval) {
            console.log('⚠️ Auto-sync already running');
            return;
        }

        console.log(`🔄 Starting auto-sync (every ${intervalMs / 1000}s)`);

        // Initial sync
        this.syncNow();

        // Set up interval
        this.syncInterval = setInterval(() => {
            if (navigator.onLine && !this.isSyncing) {
                this.syncNow();
            }
        }, intervalMs);

        // Listen for online event
        window.addEventListener('online', this.handleOnline);
    }

    /**
     * Stop automatic synchronization
     */
    stopAutoSync(): void {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log('⏸️ Auto-sync stopped');
        }

        window.removeEventListener('online', this.handleOnline);
    }

    /**
     * Handle online event
     */
    private handleOnline = () => {
        console.log('🟢 Network restored - triggering sync');
        this.syncNow();
    };

    /**
     * Force immediate synchronization
     */
    async syncNow(): Promise<SyncResult> {
        if (this.isSyncing) {
            console.log('⏳ Sync already in progress');
            return { success: false, message: 'Sync already in progress' };
        }

        if (!navigator.onLine) {
            console.log('🔴 Cannot sync - offline');
            return { success: false, message: 'Device is offline' };
        }

        this.isSyncing = true;
        this.notifyListeners({ status: 'syncing', progress: 0 });

        try {
            const stats = await offlineDB.getQueueStats();

            if (stats.pending === 0) {
                console.log('✅ No pending operations to sync');
                this.notifyListeners({ status: 'idle', progress: 100 });
                return { success: true, message: 'No operations to sync', synced: 0 };
            }

            console.log(`🔄 Syncing ${stats.pending} operations...`);
            const result = await offlineQueueService.processQueue();

            const message = `Synced ${result.succeeded} of ${result.processed} operations`;
            console.log(`✅ ${message}`);

            this.notifyListeners({
                status: result.failed > 0 ? 'error' : 'success',
                progress: 100,
                message
            });

            return {
                success: result.failed === 0,
                message,
                synced: result.succeeded,
                failed: result.failed
            };
        } catch (error: any) {
            console.error('❌ Sync failed:', error);
            this.notifyListeners({
                status: 'error',
                progress: 0,
                message: error.message
            });

            return {
                success: false,
                message: `Sync failed: ${error.message}`
            };
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Subscribe to sync status updates
     */
    onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * Notify all listeners of status change
     */
    private notifyListeners(status: SyncStatus): void {
        this.listeners.forEach(callback => callback(status));
    }

    /**
     * Get current sync status
     */
    async getSyncStatus(): Promise<{
        isSyncing: boolean;
        queueStats: Awaited<ReturnType<typeof offlineDB.getQueueStats>>;
    }> {
        const queueStats = await offlineDB.getQueueStats();
        return {
            isSyncing: this.isSyncing,
            queueStats
        };
    }
}

interface SyncStatus {
    status: 'idle' | 'syncing' | 'success' | 'error';
    progress: number;
    message?: string;
}

interface SyncResult {
    success: boolean;
    message: string;
    synced?: number;
    failed?: number;
}

// Export singleton instance
export const syncManager = new SyncManager();
export type { SyncStatus, SyncResult };
