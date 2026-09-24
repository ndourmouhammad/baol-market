import React from 'react';
import Link from 'next/link';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  href?: string;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, actionText, onAction, href, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
      {icon && <div className="mb-4 text-gray-400">{icon}</div>}
      <h3 className="text-xl font-bold text-(--encre) mb-2">{title}</h3>
      <p className="text-(--gris-texte) mb-6 max-w-md">{description}</p>
      
      {actionText && (
        <>
          {href ? (
            <Link href={href}>
              <Button>{actionText}</Button>
            </Link>
          ) : onAction ? (
            <Button onClick={onAction}>{actionText}</Button>
          ) : null}
        </>
      )}
    </div>
  );
}
