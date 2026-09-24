import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      className={`bg-gray-200 rounded-md animate-pulse ${className}`}
      aria-hidden="true"
      {...props}
    />
  );
}
