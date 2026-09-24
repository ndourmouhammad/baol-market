import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  fullWidth?: boolean;
}

export function Button({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  ...props 
}: ButtonProps) {
  const baseStyle = "inline-flex items-center justify-center font-medium rounded-xl transition-colors duration-200 px-6 py-3";
  const widthStyle = fullWidth ? "w-full" : "";
  
  const variants = {
    primary: "bg-(--vert-baol) text-white hover:bg-(--vert-baol-fonce)",
    secondary: "bg-(--encre) text-white hover:bg-gray-800",
    danger: "bg-(--rouge-erreur) text-white hover:bg-red-700",
    outline: "border-2 border-(--vert-baol) text-(--vert-baol) hover:bg-(--vert-baol) hover:text-white"
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${widthStyle} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
