'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from '@/components/logo'
import { IconDoc, IconGrid, IconLogout, IconSliders, IconUsers } from './icon'
import { signOut } from '@/app/(auth)/action'

const NAV = [
    { href: '/dashboard', label: 'Tableau de bord', Icon: IconGrid },
    { href: '/invoices', label: 'Factures', Icon: IconDoc },
    { href: '/customers', label: 'Clients', Icon: IconUsers },
    { href: '/settings', label: 'Paramètres', Icon: IconSliders },
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

export function AppSidebar({ orgName, userName }: { orgName: string; userName: string }) {
    const pathname = usePathname()

    return (
        <aside className="dark-zone flex flex-col rounded-3xl bg-ink p-4 text-white lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:w-60 lg:shrink-0 lg:p-5">
            <div className="flex items-center justify-between gap-3 lg:px-2 lg:pb-6 lg:pt-1">
                <Link href="/dashboard" className="rounded-lg text-2xl">
                    <Logo onDark />
                </Link>

                {/* Petit écran : la déconnexion est ici, le bloc du bas est masqué */}
                <form action={signOut} className="lg:hidden">
                    <button
                        type="submit"
                        aria-label="Se déconnecter"
                        className="flex h-11 w-11 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
                    >
                        <IconLogout />
                    </button>
                </form>
            </div>

            <nav
                aria-label="Navigation principale"
                className="mt-3 flex gap-1 overflow-x-auto lg:mt-0 lg:flex-col lg:overflow-visible"
            >
                {NAV.map(({ href, label, Icon }) => {
                    const active = pathname === href || pathname.startsWith(href + '/')
                    return (
                        <Link
                            key={href}
                            href={href}
                            aria-current={active ? 'page' : undefined}
                            className={`flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] ${active
                                ? 'bg-brand font-bold text-ink'
                                : 'font-semibold text-white/80 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            <Icon />
                            {label}
                        </Link>
                    )
                })}
            </nav>

            <div className="mt-4 hidden border-t border-white/15 pt-4 lg:mt-auto lg:block">
                <div className="mb-3 flex items-center gap-3 px-1">
                    <span
                        aria-hidden="true"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-ink"
                    >
                        {initials(userName)}
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{userName}</p>
                        <p className="truncate text-xs text-white/70">{orgName}</p>
                    </div>
                </div>
                <form action={signOut}>
                    <button
                        type="submit"
                        className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 text-[15px] font-semibold text-white/80 hover:bg-white/10 hover:text-white"
                    >
                        <IconLogout />
                        Se déconnecter
                    </button>
                </form>
            </div>
        </aside>
    )
}