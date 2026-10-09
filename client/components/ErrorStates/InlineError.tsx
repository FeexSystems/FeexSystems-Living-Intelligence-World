import 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineErrorProps {
  message: string;
  className?: string;
}

/**
 * Inline error component for displaying errors within content flow
 */
export function InlineError({ message, className }: InlineErrorProps) {
  return (
    <div className={cn('flex items-start gap-2 text-destructive text-sm', className)}>
      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}
