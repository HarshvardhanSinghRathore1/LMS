import React from 'react';
import Link from 'next/link';
import { LucideIcon, Inbox } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionText,
  actionHref,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`p-8 rounded-xl border border-dashed border-silver/20 dark:border-silver/15 light:border-black/15 bg-carbon-black/20 dark:bg-[#161a1d]/40 light:bg-gray-50/70 text-center flex flex-col items-center justify-center space-y-3 ${className}`}
    >
      <div className="w-12 h-12 rounded-xl bg-dark-garnet/30 dark:bg-dark-garnet/20 light:bg-red-50 text-strawberry-red dark:text-strawberry-red light:text-mahogany-red flex items-center justify-center border border-mahogany-red/30">
        <Icon className="w-6 h-6" />
      </div>
      <div className="max-w-md space-y-1">
        <h4 className="text-sm font-semibold text-white dark:text-white light:text-gray-900">{title}</h4>
        <p className="text-xs text-silver dark:text-silver light:text-gray-500">{description}</p>
      </div>
      {actionText && (
        <div className="pt-2">
          {actionHref ? (
            <Link href={actionHref}>
              <Button size="sm" variant="brand">
                {actionText}
              </Button>
            </Link>
          ) : onAction ? (
            <Button size="sm" variant="brand" onClick={onAction}>
              {actionText}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
};
