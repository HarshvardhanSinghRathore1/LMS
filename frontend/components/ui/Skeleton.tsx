import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'rectangular' }) => {
  const baseClasses = 'animate-pulse bg-carbon-black/60 dark:bg-silver/10 light:bg-black/5';
  
  let variantClass = 'rounded-md';
  if (variant === 'circular') {
    variantClass = 'rounded-full';
  } else if (variant === 'text') {
    variantClass = 'rounded h-4';
  }

  return <div className={`${baseClasses} ${variantClass} ${className}`} />;
};

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="p-5 rounded-xl border border-silver/15 dark:border-silver/10 light:border-black/10 bg-carbon-black/40 dark:bg-[#161a1d] light:bg-white space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <div className="pt-2 border-t border-silver/10 flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </div>
      ))}
    </>
  );
};

export const MetricSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="p-4 rounded-xl border border-silver/15 dark:border-silver/10 light:border-black/10 bg-carbon-black/40 dark:bg-[#161a1d] light:bg-white space-y-2 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-28" />
        </div>
      ))}
    </div>
  );
};
