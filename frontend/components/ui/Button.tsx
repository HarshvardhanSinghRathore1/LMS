import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
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
    'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-onyx disabled:opacity-50 disabled:cursor-not-allowed rounded';

  const variants = {
    primary:
      'bg-mahogany-red hover:bg-mahogany-red-2 text-white border border-mahogany-red-2 focus:ring-strawberry-red shadow-sm',
    secondary:
      'bg-carbon-black hover:bg-dark-garnet text-white-smoke border border-dark-garnet focus:ring-mahogany-red',
    outline:
      'bg-transparent hover:bg-carbon-black text-white-smoke border border-silver/30 hover:border-silver/60 focus:ring-silver',
    danger:
      'bg-strawberry-red hover:bg-mahogany-red text-white border border-strawberry-red focus:ring-strawberry-red',
    ghost:
      'bg-transparent hover:bg-carbon-black text-silver hover:text-white focus:ring-silver/20',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
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
