import React from 'react';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label: string;
  isTextarea?: boolean;
  error?: string;
  helperText?: string;
}

export function FormField({ label, isTextarea, error, helperText, className = '', id: externalId, type, ...props }: FormFieldProps) {
  const [showPassword, setShowPassword] = React.useState(false);
  const isPassword = type === 'password';

  const uniqueId = React.useId();
  const generatedId = externalId || `form-field-${uniqueId}`;
  const errorId = error ? `${generatedId}-error` : undefined;

  const togglePassword = () => setShowPassword(!showPassword);
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  const baseClass = [
    "w-full px-4 py-3 rounded-xl border bg-white text-(--encre)",
    "placeholder-gray-400",
    "transition-all duration-200",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) focus-visible:ring-offset-1 focus-visible:border-transparent",
    isPassword ? "pr-12" : "",
    error
      ? "border-(--rouge-erreur)"
      : "border-gray-200",
  ].filter(Boolean).join(' ');

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={generatedId} className="text-sm font-medium text-(--encre)">
        {label}
      </label>
      <div className="relative">
        {isTextarea ? (
          <textarea 
            id={generatedId}
            className={baseClass} 
            aria-invalid={error ? true : undefined}
            aria-describedby={errorId}
            {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)} 
          />
        ) : (
          <input 
            id={generatedId}
            {...(props as React.InputHTMLAttributes<HTMLInputElement>)} 
            type={inputType} 
            className={baseClass} 
            aria-invalid={error ? true : undefined}
            aria-describedby={errorId}
          />
        )}
        {isPassword && (
          <button
            type="button"
            onClick={togglePassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-(--gris-texte) hover:text-(--vert-baol) transition-colors p-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol)"
            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        )}
      </div>
      {helperText && !error && (
        <p className="text-xs text-(--gris-texte) mt-0.5">{helperText}</p>
      )}
      {error && (
        <p id={errorId} className="text-sm text-(--rouge-erreur) mt-0.5" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
