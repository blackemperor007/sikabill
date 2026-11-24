'use client'

import { signOut } from '@/app/(auth)/action'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
    { href: '/dashboard', label: 'Tableau de bord' },
    { href: '/invoices', label: 'Factures' },
    { href: '/customers', label: 'Clients' },
    { href: '/settings', label: 'Paramètres' },
]

function initials(name: string) {
    return (
        name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase())
            .join('') || '?'
    )
}

export function AppHeader({ orgName }: { orgName: string }) {
    const pathname = usePathname()

    return (
        <header className="flex flex-wrap items-center gap-x-8 gap-y-3 bg-[#1B2A41] px-8 py-3 text-white">
            <Link href="/dashboard" className="flex items-center gap-2.5 text-[22px] font-extrabold">
                <span className="inline-block h-7 w-7 rounded-lg bg-[#E0A030]" />
                Sikabill
            </Link>

            <nav className="flex flex-1 flex-wrap gap-1">
                {NAV.map((item) => {
                    const active = pathname.startsWith(item.href)
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={active ? 'page' : undefined}
                            className={`px-3.5 py-3 text-sm ${active
                                ? 'border-b-2 border-[#E0A030] font-semibold text-white'
                                : 'text-[#C9D1DC] hover:text-white'
                                }`}
                        >
                            {item.label}
                        </Link>
                    )
                })}
            </nav>

            <div className="flex items-center gap-3">
                <span
                    title={orgName}
                    aria-label={`Entreprise : ${orgName}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2E4263] text-[13px] font-semibold"
                >
                    {initials(orgName)}
                </span>
                <form action={signOut}>
                    <button
                        type="submit"
                        className="min-h-[44px] rounded-[10px] border border-[#2E4263] px-3 text-sm text-[#C9D1DC] hover:text-white"
                    >
                        Se déconnecter
                    </button>
                </form>
            </div>
        </header>
    )
}