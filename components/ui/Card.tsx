import { HTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg' | 'none';
}

export function Card({ hover, padding = 'md', className, children, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={clsx(
        'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700',
        padding === 'sm' && 'p-3',
        padding === 'md' && 'p-5',
        padding === 'lg' && 'p-7',
        hover && 'cursor-pointer hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600 transition-all',
        className
      )}
    >
      {children}
    </div>
  );
}
