'use client';
import Link from 'next/link';
import { NICHES, NICHE_LIGHT_COLORS, NICHE_TEXT_COLORS } from '@/lib/niches';

export default function TemplatesPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">Template Library</h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
        Click any template to start generating that product with pre-filled settings.
      </p>

      <div className="space-y-8">
        {NICHES.map((niche) => (
          <div key={niche.id}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{niche.icon}</span>
              <h2 className={`text-lg font-semibold ${NICHE_TEXT_COLORS[niche.color]}`}>{niche.name}</h2>
              <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">— {niche.description}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {niche.products.map((product) => (
                <Link
                  key={product.id}
                  href={`/generate?niche=${niche.id}&product=${product.id}`}
                  className={`flex flex-col gap-2 p-4 rounded-xl border-2 transition-all hover:shadow-md ${NICHE_LIGHT_COLORS[niche.color]}`}
                >
                  <span className="text-xl">{product.icon}</span>
                  <div>
                    <p className={`text-sm font-semibold ${NICHE_TEXT_COLORS[niche.color]}`}>{product.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{product.description}</p>
                  </div>
                  <p className="text-xs text-indigo-500 mt-auto">{product.pages}p · Start →</p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
