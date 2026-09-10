import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  variant?: 'default' | 'interactive' | 'flat';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  action,
  variant = 'default',
}) => {
  let variantClasses = 'bg-carbon-black/80 dark:bg-[#161a1d] light:bg-white border border-silver/15 dark:border-white/10 light:border-gray-200/80 shadow-md light:shadow-sm';
  
  if (variant === 'interactive') {
    variantClasses = 'glass-panel-interactive';
  } else if (variant === 'flat') {
    variantClasses = 'bg-carbon-black/40 dark:bg-[#161a1d]/60 light:bg-gray-50 border border-silver/10 dark:border-silver/10 light:border-gray-200';
  }

  return (
    <div
      className={`backdrop-blur-md rounded-xl p-5 relative overflow-hidden transition-all duration-200 ${variantClasses} ${className}`}
    >
      {(title || subtitle || action) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 mb-4 border-b border-silver/10 dark:border-silver/10 light:border-gray-100 gap-2">
          <div>
            {title && (
              <h3 className="text-sm sm:text-base font-semibold text-white dark:text-white light:text-gray-900 tracking-tight flex items-center gap-2">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-silver dark:text-silver light:text-gray-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
