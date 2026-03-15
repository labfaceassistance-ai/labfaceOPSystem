'use client';

import { useEffect, useRef } from 'react';

/**
 * Custom hook to detect horizontal swipe gestures.
 * 
 * @param onSwipeLeft Callback triggered when swiping from right to left (next)
 * @param onSwipeRight Callback triggered when swiping from left to right (previous)
 * @param threshold Minimum distance in pixels for a swipe to be recognized
 */
export const useSwipe = (onSwipeLeft?: () => void, onSwipeRight?: () => void, threshold = 70) => {
    const touchStart = useRef<{ x: number; y: number } | null>(null);
    const callbacks = useRef({ onSwipeLeft, onSwipeRight });

    // Keep callbacks up to date without re-triggering listener setup
    useEffect(() => {
        callbacks.current = { onSwipeLeft, onSwipeRight };
    }, [onSwipeLeft, onSwipeRight]);

    useEffect(() => {
        const handleTouchStart = (e: TouchEvent) => {
            // We record the start position for all touches
            touchStart.current = {
                x: e.targetTouches[0].clientX,
                y: e.targetTouches[0].clientY
            };
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if (!touchStart.current) return;

            const touchEnd = {
                x: e.changedTouches[0].clientX,
                y: e.changedTouches[0].clientY
            };

            const dx = touchStart.current.x - touchEnd.x;
            const dy = touchStart.current.y - touchEnd.y;

            // Ensure horizontal movement is significantly greater than vertical movement
            // to avoid accidental triggers during vertical scrolling.
            // Math.abs(dx) > Math.abs(dy) * 1.5 is a common heuristic.
            if (Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > threshold) {
                if (dx > 0 && callbacks.current.onSwipeLeft) {
                    callbacks.current.onSwipeLeft();
                } else if (dx < 0 && callbacks.current.onSwipeRight) {
                    callbacks.current.onSwipeRight();
                }
            }

            touchStart.current = null;
        };

        window.addEventListener('touchstart', handleTouchStart, { passive: true });
        window.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [threshold]);
};
