import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
}) => {
  const baseStyles = 'inline-flex items-center font-semibold rounded-full uppercase tracking-wider';

  const variants = {
    success: 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50',
    warning: 'bg-amber-950/80 text-amber-400 border border-amber-800/50',
    danger: 'bg-dark-garnet/90 text-strawberry-red border border-mahogany-red/40',
    info: 'bg-sky-950/80 text-sky-400 border border-sky-800/50',
    neutral: 'bg-carbon-black text-silver border border-silver/20',
    brand: 'bg-mahogany-red/30 text-white-smoke border border-mahogany-red',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${sizes[size]}`}>
      {children}
    </span>
  );
};
