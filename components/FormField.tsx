import React from 'react';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label: string;
  isTextarea?: boolean;
}

export function FormField({ label, isTextarea, className = '', ...props }: FormFieldProps) {
  const [showPassword, setShowPassword] = React.useState(false);
  const isPassword = props.type === 'password';

  const togglePassword = () => setShowPassword(!showPassword);
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : props.type;

  const baseClass = "w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-(--encre) focus:outline-none focus:ring-2 focus:ring-(--vert-baol) focus:border-transparent transition-all";

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-sm font-medium text-(--encre)">
        {label}
      </label>
      <div className="relative">
        {isTextarea ? (
          <textarea 
            className={baseClass} 
            {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)} 
          />
        ) : (
          <input 
            type={inputType} 
            className={baseClass} 
            {...(props as React.InputHTMLAttributes<HTMLInputElement>)} 
          />
        )}
        {isPassword && (
          <button
            type="button"
            onClick={togglePassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-(--gris-texte) hover:text-(--vert-baol) transition-colors"
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
