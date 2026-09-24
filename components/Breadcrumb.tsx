import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  return (
    <nav aria-label="Fil d'ariane" className={className}>
      <ol className="flex items-center flex-wrap gap-2 text-sm text-(--gris-texte)">
        <li>
          <Link 
            href="/" 
            className="flex items-center hover:text-(--encre) transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) rounded-sm"
            aria-label="Accueil"
          >
            <Home className="w-4 h-4" />
          </Link>
        </li>
        
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          return (
            <React.Fragment key={index}>
              <li className="flex items-center" aria-hidden="true">
                <ChevronRight className="w-4 h-4 text-gray-400 mx-1" />
              </li>
              <li>
                {isLast || !item.href ? (
                  <span 
                    className="font-medium text-(--encre)"
                    aria-current={isLast ? "page" : undefined}
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link 
                    href={item.href}
                    className="hover:text-(--encre) transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) rounded-sm"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
