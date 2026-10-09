import 'react';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';

interface ToastErrorProps {
  message: string;
  description?: string;
}

/**
 * Toast error component for displaying errors in toast notifications
 */
export function ToastError({ message, description }: ToastErrorProps) {
  toast.error(message, {
    description,
    icon: <AlertCircle className="h-4 w-4" />,
  });
}

// Convenience function to show error toast
export const showErrorToast = (message: string, description?: string) => {
  ToastError({ message, description });
};
