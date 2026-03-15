import axios from 'axios';

// Source of truth for API base URL
export const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * Get the absolute backend URL for image sources or external links.
 * Defaults to the API_URL if set, otherwise falls back to window.location.origin
 */
export const getBackendUrl = () => {
    if (API_URL) return API_URL;
    // Production default: Use the current domain as the base
    return '';
};

/**
 * Get the full URL for a profile picture path.
 * Handles absolute URLs (MinIO), relative paths (local uploads), and null values.
 */
export const getProfilePictureUrl = (path: string | null | undefined): string | null => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }
    // For relative paths, we rely on the Next.js rewrite in next.config.mjs
    // ensuring we don't double-prefix if 'getBackendUrl' returns an absolute URL
    const baseUrl = getBackendUrl();
    if (baseUrl && !path.startsWith(baseUrl)) {
        return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    }
    return path;
};

/**
 * Get the stored authentication token
 * Implements Session Isolation: Prefers sessionStorage to avoid cross-tab contamination.
 * If only available in localStorage (e.g. initial load), hydrates sessionStorage.
 */
export const getToken = (): string | null => {
    if (typeof window === 'undefined') return null;

    // 1. Check if this tab already has a locked session
    let token = sessionStorage.getItem('token');
    if (token) return token;

    // 2. Hydrate from localStorage if available (e.g., from "Remember Me")
    token = localStorage.getItem('token');
    if (token) {
        // Lock it to this tab so other tabs logging in won't affect us
        sessionStorage.setItem('token', token);
        return token;
    }

    return null;
};

/**
 * Get the stored user data
 * Implements Session Isolation: Prefers sessionStorage to avoid cross-tab contamination.
 */
export const getUser = (): any | null => {
    if (typeof window === 'undefined') return null;

    // 1. Check if this tab already has locked user data
    let userStr = sessionStorage.getItem('user');

    if (!userStr) {
        // 2. Hydrate from localStorage
        userStr = localStorage.getItem('user');
        if (userStr) {
            sessionStorage.setItem('user', userStr);
        }
    }

    return userStr ? JSON.parse(userStr) : null;
};

/**
 * Create axios instance with authentication header
 */
export const createAuthAxios = () => {
    const token = getToken();
    return axios.create({
        baseURL: API_URL,
        headers: token ? {
            'Authorization': `Bearer ${token}`
        } : {}
    });
};

/**
 * Fetch current user data from token
 */
export const fetchCurrentUser = async () => {
    const token = getToken();
    if (!token) {
        throw new Error('No authentication token found');
    }

    try {
        const response = await axios.get(`${API_URL}/api/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error: any) {
        if (error.response?.status === 401 || error.response?.status === 403) {
            // Token is invalid or expired, clear it from both storages
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            throw new Error('Session expired');
        }
        throw error;
    }
};

/**
 * Logout user by clearing tokens from both storages
 */
export const logout = (redirectPath: string = '/login') => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    window.location.href = `${redirectPath}?logout=success`;
};
