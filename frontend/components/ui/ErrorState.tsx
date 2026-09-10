import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to load content',
  message,
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`p-5 rounded-xl border border-strawberry-red/30 bg-dark-garnet/20 dark:bg-dark-garnet/20 light:bg-red-50/80 text-left flex items-start gap-3.5 ${className}`}
    >
      <div className="p-2 rounded-lg bg-dark-garnet/40 text-strawberry-red shrink-0 mt-0.5">
        <AlertCircle className="w-5 h-5" />
      </div>
      <div className="space-y-1 flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-white dark:text-white light:text-gray-900">{title}</h4>
        <p className="text-xs text-silver dark:text-silver light:text-gray-600 line-clamp-2">{message}</p>
        {onRetry && (
          <div className="pt-2">
            <Button size="sm" variant="outline" onClick={onRetry} className="gap-1.5 text-xs py-1 px-2.5 h-auto">
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
