import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
}

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  fullWidth = false, 
  loading = false,
  disabled,
  className = '', 
  ...props 
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const baseStyle = [
    "inline-flex items-center justify-center font-medium rounded-xl",
    "transition-colors duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-(--vert-baol)",
  ].join(' ');

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  const variants = {
    primary: "bg-(--vert-baol) text-white hover:bg-(--vert-baol-fonce) active:bg-(--vert-baol-fonce)",
    secondary: "bg-(--encre) text-white hover:bg-gray-800 active:bg-gray-900",
    danger: "bg-(--rouge-erreur) text-white hover:bg-red-700 active:bg-red-800",
    outline: "border-2 border-(--vert-baol) text-(--vert-baol) hover:bg-(--vert-baol) hover:text-white active:bg-(--vert-baol-fonce) active:border-(--vert-baol-fonce)",
    ghost: "text-(--gris-texte) hover:bg-gray-100 hover:text-(--encre) active:bg-gray-200",
  };

  const disabledStyle = "opacity-50 cursor-not-allowed pointer-events-none";
  const widthStyle = fullWidth ? "w-full" : "";

  return (
    <button 
      className={`${baseStyle} ${sizes[size]} ${variants[variant]} ${isDisabled ? disabledStyle : ''} ${widthStyle} ${className}`}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
      )}
      {children}
    </button>
  );
}
