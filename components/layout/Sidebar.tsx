'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Wand2, LayoutTemplate, Clock, Tag, Settings } from 'lucide-react';
import { clsx } from 'clsx';

const nav = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/generate', label: 'Generate', icon: Wand2 },
  { href: '/templates', label: 'Templates', icon: LayoutTemplate },
  { href: '/history', label: 'History', icon: Clock },
  { href: '/etsy-helper', label: 'Etsy Helper', icon: Tag },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">🛍️ EtsyGen</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Digital Product Generator</p>
      </div>
      <nav className="space-y-1 flex-1">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="text-xs text-gray-400 dark:text-gray-600 mt-4">
        Personal use only
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex z-50">
      {nav.slice(0, 5).map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className={clsx(
          'flex-1 flex flex-col items-center py-2 text-xs gap-1 transition-colors',
          pathname === href ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'
        )}>
          <Icon className="h-5 w-5" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
