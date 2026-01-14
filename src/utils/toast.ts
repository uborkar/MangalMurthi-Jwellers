// src/utils/toast.ts - Toast helper with built-in de-duplication
import toast from "react-hot-toast";

/**
 * Toast helper that prevents duplicate notifications
 * Automatically generates IDs based on message content
 */

const generateToastId = (message: string): string => {
    // Create a simple hash from the message for use as ID
    return `toast-${message.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50)}`;
};

export const showToast = {
    success: (message: string, options?: any) => {
        const id = options?.id || generateToastId(message);
        return toast.success(message, { ...options, id });
    },

    error: (message: string, options?: any) => {
        const id = options?.id || generateToastId(message);
        return toast.error(message, { ...options, id });
    },

    loading: (message: string, options?: any) => {
        const id = options?.id || generateToastId(message);
        return toast.loading(message, { ...options, id });
    },

    promise: toast.promise,
    custom: toast.custom,
    dismiss: toast.dismiss,
    remove: toast.remove,
};

// Re-export original toast for cases where you need it
export { toast as rawToast };
export default showToast;
