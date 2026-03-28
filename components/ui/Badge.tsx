import { HTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'blue' | 'purple' | 'teal' | 'amber' | 'green' | 'slate' | 'red';
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span {...props} className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      variant === 'default' && 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
      variant === 'blue' && 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
      variant === 'purple' && 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300',
      variant === 'teal' && 'bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300',
      variant === 'amber' && 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300',
      variant === 'green' && 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
      variant === 'slate' && 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
      variant === 'red' && 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
      className
    )}>
      {children}
    </span>
  );
}
