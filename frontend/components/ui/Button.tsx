import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'brand';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-onyx dark:focus:ring-offset-[#0b090a] light:focus:ring-offset-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg active:scale-[0.98]';

  const variants = {
    primary:
      'bg-mahogany-red hover:bg-mahogany-red-2 text-white border border-mahogany-red-2 focus:ring-strawberry-red shadow-sm shadow-mahogany-red/20',
    brand:
      'bg-gradient-to-r from-mahogany-red to-strawberry-red hover:from-mahogany-red-2 hover:to-strawberry-red text-white border border-strawberry-red/30 focus:ring-strawberry-red shadow-md shadow-mahogany-red/25',
    secondary:
      'bg-carbon-black/80 hover:bg-carbon-black text-white dark:bg-[#161a1d] dark:hover:bg-[#1f2428] light:bg-gray-100 light:hover:bg-gray-200 light:text-gray-900 border border-silver/20 light:border-gray-300 focus:ring-mahogany-red',
    outline:
      'bg-transparent hover:bg-silver/10 text-white-smoke dark:text-white light:text-gray-800 border border-silver/30 dark:border-silver/20 light:border-gray-300 hover:border-silver/60 light:hover:border-gray-400 focus:ring-silver',
    danger:
      'bg-strawberry-red hover:bg-mahogany-red text-white border border-strawberry-red focus:ring-strawberry-red shadow-sm',
    ghost:
      'bg-transparent hover:bg-silver/10 text-silver dark:text-silver light:text-gray-600 hover:text-white dark:hover:text-white light:hover:text-gray-900 focus:ring-silver/20',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-2.5 text-base gap-2.5',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
