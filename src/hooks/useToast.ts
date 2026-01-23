import toast from 'react-hot-toast';

// Track recent toasts to prevent duplicates within a short time window
const recentToasts = new Map<string, number>();
const DUPLICATE_THRESHOLD = 1000; // milliseconds - don't show same toast within 1 second

/**
 * Custom toast hook that prevents duplicate toasts
 * 
 * Usage:
 * ```tsx
 * import { useToast } from '../hooks/useToast';
 * 
 * function MyComponent() {
 *   const toast = useToast();
 *   
 *   const handleSave = async () => {
 *     const loadingId = toast.loading("Saving...");
 *     await saveData();
 *     toast.dismiss(loadingId);
 *     toast.success("Saved successfully!"); // Won't duplicate even if called multiple times quickly
 *   };
 * }
 * ```
 */
export const useToast = () => {
    const showToast = (
        type: 'success' | 'error' | 'loading',
        message: string,
        options: any = {}
    ) => {
        const key = `${type}-${message}`;
        const now = Date.now();
        const lastShown = recentToasts.get(key);

        // If same toast was shown very recently, skip it (prevent duplicates)
        if (lastShown && now - lastShown < DUPLICATE_THRESHOLD) {
            console.log(`[useToast] Skipping duplicate toast: "${message}"`);
            return null;
        }

        // Update timestamp for this toast
        recentToasts.set(key, now);

        // Cleanup old entries after threshold
        setTimeout(() => {
            recentToasts.delete(key);
        }, DUPLICATE_THRESHOLD);

        // Show the toast
        return toast[type](message, {
            ...options,
            // Add unique ID based on message to help with de-duplication
            id: options.id || `${type}-${message.substring(0, 20)}`,
        });
    };

    return {
        /**
         * Show success toast (green)
         * Won't show duplicate if same message shown within 1 second
         */
        success: (message: string, options = {}) =>
            showToast('success', message, options),

        /**
         * Show error toast (red)
         * Won't show duplicate if same message shown within 1 second
         */
        error: (message: string, options = {}) =>
            showToast('error', message, options),

        /**
         * Show loading toast (gray with spinner)
         * Returns toast ID that can be used to dismiss it
         */
        loading: (message: string, options: any = {}) =>
            toast.loading(message, {
                ...options,
                id: options.id || `loading-${message.substring(0, 20)}`,
            }),

        /**
         * Dismiss a specific toast or all toasts
         * @param toastId - Optional ID of toast to dismiss. If not provided, dismisses all
         */
        dismiss: (toastId?: string) => toast.dismiss(toastId),

        /**
         * Show a promise-based toast
         * Automatically shows loading, then success or error based on promise result
         */
        promise: <T,>(
            promise: Promise<T>,
            messages: {
                loading: string;
                success: string | ((data: T) => string);
                error: string | ((err: any) => string);
            },
            options = {}
        ) => toast.promise(promise, messages, options),
    };
};

/**
 * Direct export for non-hook usage (use sparingly, prefer useToast hook)
 */
export const showSuccessToast = (message: string, options = {}) => {
    const key = `success-${message}`;
    const now = Date.now();
    const lastShown = recentToasts.get(key);

    if (lastShown && now - lastShown < DUPLICATE_THRESHOLD) {
        return null;
    }

    recentToasts.set(key, now);
    setTimeout(() => recentToasts.delete(key), DUPLICATE_THRESHOLD);

    return toast.success(message, {
        ...options,
        id: `success-${message.substring(0, 20)}`,
    });
};

export const showErrorToast = (message: string, options = {}) => {
    const key = `error-${message}`;
    const now = Date.now();
    const lastShown = recentToasts.get(key);

    if (lastShown && now - lastShown < DUPLICATE_THRESHOLD) {
        return null;
    }

    recentToasts.set(key, now);
    setTimeout(() => recentToasts.delete(key), DUPLICATE_THRESHOLD);

    return toast.error(message, {
        ...options,
        id: `error-${message.substring(0, 20)}`,
    });
};
