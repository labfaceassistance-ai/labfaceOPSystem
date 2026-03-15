import { offlineDB, QueuedOperation } from '../utils/offlineDB';
import axios from 'axios';
import { getToken } from '../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_BACKOFF_MS = 1000; // Start with 1 second, exponential backoff

/**
 * Offline Queue Service
 * Manages queuing and processing of offline operations
 */
class OfflineQueueService {
    private isProcessing = false;
    private processingInterval: NodeJS.Timeout | null = null;

    /**
     * Initialize the service
     */
    async init(): Promise<void> {
        await offlineDB.init();
        console.log('✅ Offline Queue Service initialized');
    }

    /**
     * Queue an operation for later processing
     */
    async queueOperation(
        type: QueuedOperation['type'],
        data: any,
        priority: number = 2
    ): Promise<string> {
        try {
            const id = await offlineDB.addToQueue({
                type,
                data,
                timestamp: Date.now(),
                priority
            });

            console.log(`📦 Queued ${type} operation:`, id);
            return id;
        } catch (error) {
            console.error('Failed to queue operation:', error);
            throw error;
        }
    }

    /**
     * Process all pending operations
     */
    async processQueue(): Promise<{
        processed: number;
        succeeded: number;
        failed: number;
    }> {
        if (this.isProcessing) {
            console.log('⏳ Queue processing already in progress');
            return { processed: 0, succeeded: 0, failed: 0 };
        }

        this.isProcessing = true;
        let processed = 0;
        let succeeded = 0;
        let failed = 0;

        try {
            const pending = await offlineDB.getPendingOperations();
            console.log(`🔄 Processing ${pending.length} pending operations`);

            for (const operation of pending) {
                processed++;

                // Check retry limit
                if (operation.retryCount >= MAX_RETRY_ATTEMPTS) {
                    console.log(`❌ Max retries reached for operation ${operation.id}`);
                    await offlineDB.updateOperationStatus(operation.id, 'failed', 'Max retries exceeded');
                    failed++;
                    continue;
                }

                // Update status to syncing
                await offlineDB.updateOperationStatus(operation.id, 'syncing');

                try {
                    // Process based on type
                    await this.processOperation(operation);

                    // Mark as synced
                    await offlineDB.updateOperationStatus(operation.id, 'synced');
                    succeeded++;
                    console.log(`✅ Synced operation ${operation.id}`);
                } catch (error: any) {
                    // Mark as failed and increment retry count
                    await offlineDB.updateOperationStatus(
                        operation.id,
                        'pending',
                        error.message
                    );
                    failed++;
                    console.error(`❌ Failed to sync operation ${operation.id}:`, error.message);

                    // Exponential backoff delay
                    const delay = RETRY_BACKOFF_MS * Math.pow(2, operation.retryCount);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }

            // Clean up old synced operations (older than 24 hours)
            await this.cleanupOldOperations();

        } finally {
            this.isProcessing = false;
        }

        console.log(`📊 Queue processing complete: ${succeeded} succeeded, ${failed} failed`);
        return { processed, succeeded, failed };
    }

    /**
     * Process a single operation based on its type
     */
    private async processOperation(operation: QueuedOperation): Promise<void> {
        const token = getToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        switch (operation.type) {
            case 'attendance':
                await axios.post(
                    `${API_URL}/api/attendance/record`,
                    operation.data,
                    { headers }
                );
                break;

            case 'profile_update':
                await axios.put(
                    `${API_URL}/api/users/profile/${operation.data.userId}`,
                    operation.data,
                    { headers }
                );
                break;

            case 'consent':
                await axios.post(
                    `${API_URL}/api/consent/record`,
                    operation.data,
                    { headers }
                );
                break;

            default:
                throw new Error(`Unknown operation type: ${operation.type}`);
        }
    }

    /**
     * Retry all failed operations
     */
    async retryFailed(): Promise<void> {
        const all = await offlineDB.getAllOperations();
        const failed = all.filter(op => op.status === 'failed' && op.retryCount < MAX_RETRY_ATTEMPTS);

        console.log(`🔄 Retrying ${failed.length} failed operations`);

        for (const operation of failed) {
            await offlineDB.updateOperationStatus(operation.id, 'pending');
        }

        await this.processQueue();
    }

    /**
     * Get queue status
     */
    async getQueueStatus(): Promise<{
        stats: Awaited<ReturnType<typeof offlineDB.getQueueStats>>;
        operations: QueuedOperation[];
    }> {
        const stats = await offlineDB.getQueueStats();
        const operations = await offlineDB.getAllOperations();
        return { stats, operations };
    }

    /**
     * Start automatic queue processing
     */
    startAutoProcessing(intervalMs: number = 30000): void {
        if (this.processingInterval) {
            console.log('⚠️ Auto-processing already started');
            return;
        }

        console.log(`🔄 Starting auto-processing (every ${intervalMs}ms)`);
        this.processingInterval = setInterval(() => {
            if (navigator.onLine) {
                this.processQueue();
            }
        }, intervalMs);
    }

    /**
     * Stop automatic queue processing
     */
    stopAutoProcessing(): void {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
            console.log('⏸️ Auto-processing stopped');
        }
    }

    /**
     * Clean up old synced operations (older than 24 hours)
     */
    private async cleanupOldOperations(): Promise<void> {
        const all = await offlineDB.getAllOperations();
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        let cleaned = 0;

        for (const operation of all) {
            if (operation.status === 'synced' && operation.timestamp < oneDayAgo) {
                await offlineDB.deleteOperation(operation.id);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`🧹 Cleaned up ${cleaned} old operations`);
        }
    }

    /**
     * Clear all queued operations (emergency use)
     */
    async clearAll(): Promise<void> {
        await offlineDB.clearAll();
        console.log('🗑️ All queued operations cleared');
    }
}

// Export singleton instance
export const offlineQueueService = new OfflineQueueService();
