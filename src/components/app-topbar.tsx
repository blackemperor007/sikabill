'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const initials = (name: string) =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join('') || '?'

const circle =
    'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-mist bg-paper text-ink transition-colors hover:bg-mist focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

function Svg({ children }: { children: React.ReactNode }) {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {children}
        </svg>
    )
}

export function AppTopbar({
    userName,
    orgName,
    alertCount,
}: {
    userName: string
    orgName: string
    /** Nombre de factures en retard (affiché sur la cloche) */
    alertCount: number
}) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [q, setQ] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (open) inputRef.current?.focus()
    }, [open])

    function submit(e: React.FormEvent) {
        e.preventDefault()
        const term = q.trim()
        if (!term) return
        // À adapter : page de recherche / paramètre de filtre de votre liste de factures
        router.push(`/invoices?q=${encodeURIComponent(term)}`)
        setOpen(false)
        setQ('')
    }

    return (
        <div className="mb-4 flex items-center justify-end gap-2.5">
            {/* Recherche */}
            {open ? (
                <form onSubmit={submit} role="search" className="flex items-center">
                    <label htmlFor="topbar-search" className="sr-only">
                        Rechercher une facture
                    </label>
                    <input
                        id="topbar-search"
                        ref={inputRef}
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
                        onBlur={() => !q && setOpen(false)}
                        placeholder="Rechercher une facture…"
                        className="h-10 w-48 rounded-full border border-mist bg-paper px-4 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 sm:w-64"
                    />
                </form>
            ) : (
                <button type="button" onClick={() => setOpen(true)} className={circle} aria-label="Rechercher">
                    <Svg>
                        <circle cx="11" cy="11" r="7" />
                        <path d="M20 20l-3.5-3.5" />
                    </Svg>
                </button>
            )}

            {/* Notifications : factures en retard */}
            <Link
                href="/invoices?status=overdue"
                className={circle}
                aria-label={
                    alertCount > 0
                        ? `${alertCount} facture${alertCount > 1 ? 's' : ''} en retard`
                        : 'Notifications : aucune facture en retard'
                }
            >
                <Svg>
                    <path d="M6 8a6 6 0 1112 0c0 7 3 8 3 8H3s3-1 3-8" />
                    <path d="M10.3 20a2 2 0 003.4 0" />
                </Svg>
                {alertCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold leading-none text-white">
                        {alertCount > 99 ? '99+' : alertCount}
                    </span>
                )}
            </Link>

            {/* Profil */}
            <Link
                href="/settings"
                className="flex items-center gap-2.5 rounded-full border border-mist bg-paper py-1 pl-1 pr-1 transition-colors hover:bg-mist focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:pr-4"
                aria-label="Mon profil et paramètres"
            >
                <span
                    aria-hidden="true"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-bold text-white"
                >
                    {initials(userName)}
                </span>
                <span className="hidden min-w-0 text-left leading-tight sm:block">
                    <span className="block max-w-[160px] truncate text-sm font-bold">{userName}</span>
                    <span className="block max-w-[160px] truncate text-xs text-muted">{orgName}</span>
                </span>
            </Link>
        </div>
    )
}