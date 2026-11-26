import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrganization } from '@/lib/organization'
import { currencyDigits, formatMoney } from '@/lib/money'
import { daysBetween, displayStatus, todayISO } from '@/lib/invoices'
import { StatusBadge } from '@/components/status-badge'
import { btn, cardClass } from '@/lib/ui'
import { IconDoc } from '@/components/icon'

/* ----------------------------------------------------------------------------
   Utilitaires
---------------------------------------------------------------------------- */
const plural = (n: number) => (n > 1 ? 's' : '')
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const initials = (name: string) =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join('') || '?'
const shortDate = (iso: string | null) =>
    iso
        ? new Intl.DateTimeFormat('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            timeZone: 'UTC',
        }).format(new Date(`${iso}T00:00:00Z`))
        : null
const pctFmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })

type Tone = 'ok' | 'bad' | 'muted'
type Trend = { badge: string; tone: Tone; note: string }

// Variation d'un montant par rapport au mois dernier
function moneyTrend(cur: number, prev: number): Trend {
    if (prev === 0) {
        return {
            badge: cur > 0 ? 'Nouveau' : '—',
            tone: 'muted',
            note: cur > 0 ? 'Aucun paiement le mois dernier' : 'Aucun paiement ce mois',
        }
    }
    const pct = ((cur - prev) / prev) * 100
    if (pct === 0) return { badge: '0 %', tone: 'muted', note: 'Stable vs mois dernier' }
    return pct > 0
        ? { badge: `+${pctFmt.format(pct)} %`, tone: 'ok', note: 'vs mois dernier' }
        : { badge: `−${pctFmt.format(-pct)} %`, tone: 'bad', note: 'vs mois dernier' }
}

// Arrondit un pas d'axe à une valeur « ronde » (1, 2, 2.5, 5, 10 × 10^n)
function niceCeil(v: number) {
    if (v <= 0) return 1
    const exp = 10 ** Math.floor(Math.log10(v))
    const f = v / exp
    const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10
    return nice * exp
}

/* ----------------------------------------------------------------------------
   Sous-composants d'affichage
---------------------------------------------------------------------------- */
const pillTone: Record<Tone, string> = {
    ok: 'bg-ok-soft text-ok',
    bad: 'bg-[#fde2e2] text-bad',
    muted: 'bg-mist text-muted',
}

const ICONS = {
    wallet: ['M4 7h15a1 1 0 011 1v10a1 1 0 01-1 1H5a2 2 0 01-2-2V6a2 2 0 012-2h11', 'M16 13.5h.01'],
    check: ['M12 21a9 9 0 100-18 9 9 0 000 18z', 'M8.5 12.5l2.5 2.5 4.5-5'],
    alert: ['M12 3l10 18H2z', 'M12 10v5', 'M12 18h.01'],
    users: ['M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2', 'M10 11a4 4 0 100-8 4 4 0 000 8z', 'M21 21v-2a4 4 0 00-3-3.9', 'M16 3.1a4 4 0 010 7.8'],
} as const

function KpiCard({
    icon,
    label,
    value,
    badge,
    tone,
    note,
    dark = false,
}: {
    icon: keyof typeof ICONS
    label: string
    value: string
    badge: string
    tone: Tone
    note: string
    dark?: boolean
}) {
    const dots: CSSProperties = {
        backgroundImage: `radial-gradient(${dark ? 'rgba(255,255,255,.16)' : 'rgba(0,0,0,.08)'} 1.4px, transparent 1.6px)`,
        backgroundSize: '18px 18px',
        WebkitMaskImage: 'linear-gradient(to left, #000, transparent)',
        maskImage: 'linear-gradient(to left, #000, transparent)',
    }
    return (
        <div
            className={`relative overflow-hidden rounded-3xl p-5 ${dark ? 'bg-ink text-white' : `${cardClass} !p-5`
                }`}
        >
            <i aria-hidden className="pointer-events-none absolute right-0 top-0 h-full w-3/5" style={dots} />
            <div className="relative flex items-start justify-between">
                <span
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl ${dark ? 'bg-white text-ink' : 'bg-mist text-ink'
                        }`}
                >
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        {ICONS[icon].map((d) => (
                            <path key={d} d={d} />
                        ))}
                    </svg>
                </span>
                <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${dark ? 'bg-brand text-white' : pillTone[tone]
                        }`}
                >
                    {badge}
                </span>
            </div>
            <p className={`relative mt-4 text-sm ${dark ? 'text-white/75' : 'text-muted'}`}>{label}</p>
            <p className="relative mt-1 font-display text-[28px] font-bold leading-tight tracking-tight">{value}</p>
            <p className={`relative mt-1 text-[13px] ${dark ? 'text-white/70' : 'text-muted'}`}>{note}</p>
        </div>
    )
}

function CardHead({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
    return (
        <div className="mb-4 flex items-start justify-between gap-3">
            <div>
                <h2 className="text-lg font-bold">{title}</h2>
                {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
            </div>
            {right}
        </div>
    )
}

/* ----------------------------------------------------------------------------
   Page
---------------------------------------------------------------------------- */
export default async function DashboardPage() {
    const org = await getCurrentOrganization()
    if (!org) return null // la mise en page redirige déjà vers /onboarding

    const supabase = await createClient()
    const { data: claimsData } = await supabase.auth.getClaims()
    const fullName = (claimsData?.claims?.user_metadata as { full_name?: unknown } | undefined)
        ?.full_name
    const firstName = typeof fullName === 'string' ? fullName.trim().split(/\s+/)[0] : ''

    const digits = currencyDigits(org.currency)
    const money = (n: number) => formatMoney(n, org.currency)
    const now = new Date()
    const today = todayISO()
    const dateLabel = capitalize(
        new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now)
    )
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const chartStart = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const chartStartISO = `${chartStart.getFullYear()}-${String(chartStart.getMonth() + 1).padStart(2, '0')}-01`

    const [paidRes, billedRes, issuedRes, recentRes, countRes, paidCountRes, newCustRes] = await Promise.all([
        supabase
            .from('invoices')
            .select('paid_at, total, customer_id')
            .eq('organization_id', org.id)
            .eq('status', 'paid')
            .gte('paid_at', chartStart.toISOString()),
        // Facturé (émis ou payé) sur 6 mois, pour la 2e série du graphique
        supabase
            .from('invoices')
            .select('issue_date, total')
            .eq('organization_id', org.id)
            .in('status', ['issued', 'paid'])
            .gte('issue_date', chartStartISO),
        supabase
            .from('invoices')
            .select('id, number, customer_id, due_date, status, total')
            .eq('organization_id', org.id)
            .eq('status', 'issued'),
        supabase
            .from('invoices')
            .select('id, number, status, customer_id, issue_date, due_date, total')
            .eq('organization_id', org.id)
            .order('created_at', { ascending: false })
            .limit(5),
        supabase
            .from('invoices')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', org.id),
        supabase
            .from('invoices')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', org.id)
            .eq('status', 'paid'),
        supabase
            .from('customers')
            .select('created_at')
            .eq('organization_id', org.id)
            .gte('created_at', prevMonthStart.toISOString()),
    ])
    if (
        paidRes.error ||
        billedRes.error ||
        issuedRes.error ||
        recentRes.error ||
        countRes.error ||
        paidCountRes.error ||
        newCustRes.error
    ) {
        throw new Error('Lecture du tableau de bord impossible')
    }

    // Six mois glissants, le dernier est le mois courant
    const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
        return {
            key: `${d.getFullYear()}-${d.getMonth()}`,
            label: capitalize(new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(d)),
            total: 0, // encaissé
            billed: 0, // facturé
            current: i === 5,
        }
    })
    const paidByCustomer = new Map<string, number>()
    for (const p of paidRes.data ?? []) {
        if (!p.paid_at) continue
        const d = new Date(p.paid_at)
        const m = months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`)
        if (m) m.total += Number(p.total)
        paidByCustomer.set(p.customer_id, (paidByCustomer.get(p.customer_id) ?? 0) + Number(p.total))
    }
    for (const inv of billedRes.data ?? []) {
        if (!inv.issue_date) continue
        const [y, mo] = inv.issue_date.split('-').map(Number)
        const m = months.find((x) => x.key === `${y}-${mo - 1}`)
        if (m) m.billed += Number(inv.total)
    }
    const collected = months[5].total
    const collectedPrev = months[4].total
    const paidTrend = moneyTrend(collected, collectedPrev)

    // Factures émises non payées : dans les délais, ou en retard
    const issued = issuedRes.data ?? []
    let pending = 0
    let late = 0
    const overdue: { id: string; number: string | null; customer_id: string; due_date: string; total: number }[] = []
    for (const inv of issued) {
        if (displayStatus(inv, today) === 'overdue' && inv.due_date) {
            late += Number(inv.total)
            overdue.push({
                id: inv.id,
                number: inv.number,
                customer_id: inv.customer_id,
                due_date: inv.due_date,
                total: Number(inv.total),
            })
        } else {
            pending += Number(inv.total)
        }
    }
    overdue.sort((a, b) => (a.due_date < b.due_date ? -1 : 1))
    const toChase = overdue.slice(0, 3)
    const toCollect = pending + late

    // Nouveaux clients : ce mois-ci et le mois dernier
    let newThisMonth = 0
    let newLastMonth = 0
    for (const c of newCustRes.data ?? []) {
        if (new Date(c.created_at).getTime() >= monthStart) newThisMonth += 1
        else newLastMonth += 1
    }
    const newDelta = newThisMonth - newLastMonth
    const newTrend: Trend =
        newDelta > 0
            ? { badge: `+${newDelta}`, tone: 'ok', note: 'vs mois dernier' }
            : newDelta < 0
                ? { badge: `−${-newDelta}`, tone: 'bad', note: 'vs mois dernier' }
                : { badge: '=', tone: 'muted', note: 'Autant que le mois dernier' }

    // Meilleurs clients (montant payé sur 6 mois)
    const topClients = Array.from(paidByCustomer.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)

    const recent = recentRes.data ?? []

    // Noms des clients, en une seule requête
    const ids = Array.from(
        new Set([
            ...toChase.map((o) => o.customer_id),
            ...recent.map((r) => r.customer_id),
            ...topClients.map(([id]) => id),
        ])
    )
    const names = new Map<string, string>()
    if (ids.length > 0) {
        const { data, error } = await supabase
            .from('customers')
            .select('id, name')
            .eq('organization_id', org.id)
            .in('id', ids)
        if (error) throw new Error('Lecture des clients impossible')
        for (const c of data ?? []) names.set(c.id, c.name)
    }

    // Répartition par statut (camembert)
    const paidCount = paidCountRes.count ?? 0
    const lateCount = overdue.length
    const pendingCount = issued.length - lateCount
    const pieTotal = paidCount + pendingCount + lateCount
    const pct = (n: number) => (pieTotal ? Math.round((n / pieTotal) * 100) : 0)
    const a = pieTotal ? (paidCount / pieTotal) * 100 : 0
    const b = pieTotal ? a + (pendingCount / pieTotal) * 100 : 0
    const pie = pieTotal
        ? `conic-gradient(#ff6b00 0 ${a}%, #ffc58f ${a}% ${b}%, #262626 ${b}% 100%)`
        : 'conic-gradient(#e8e8ea 0 100%)'
    const statusRows = [
        { label: 'Payées', count: paidCount, dot: 'bg-brand', tone: 'ok' as Tone },
        { label: 'En attente', count: pendingCount, dot: 'bg-[#ffc58f]', tone: 'muted' as Tone },
        { label: 'En retard', count: lateCount, dot: 'bg-ink', tone: 'bad' as Tone },
    ]

    // Bulles des meilleurs clients
    const topSum = topClients.reduce((s, [, t]) => s + t, 0)
    const shares = topClients.map(([, t]) => (topSum ? t / topSum : 0))
    const maxShare = Math.max(...shares, 0.0001)
    const bubbleCenters = [
        [50, 50],
        [108, 100],
        [44, 130],
        [112, 34],
    ]
    const bubbleStyles = [
        'bg-brand text-white',
        'bg-[#ffc58f] text-ink',
        'bg-ink text-white',
        'bg-[#ff9a4d] text-white',
    ]

    // Aide au démarrage : seulement tant qu'il n'y a aucune facture
    const noInvoices = (countRes.count ?? 0) === 0
    let setupDone = false
    let hasCustomer = false
    if (noInvoices) {
        const [setupRes, custRes] = await Promise.all([
            supabase
                .from('organizations')
                .select('tax_id, registration_number, address')
                .eq('id', org.id)
                .single(),
            supabase
                .from('customers')
                .select('id', { count: 'exact', head: true })
                .eq('organization_id', org.id)
                .is('archived_at', null),
        ])
        if (setupRes.error || custRes.error) throw new Error('Lecture de la configuration impossible')
        const s = setupRes.data
        setupDone = Boolean(s?.tax_id?.trim() && s?.registration_number?.trim() && s?.address?.trim())
        hasCustomer = (custRes.count ?? 0) > 0
    }

    // Graphique à barres jumelées (facturé / encaissé)
    const compact = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 })
    const axisLabel = (minor: number) => (minor === 0 ? '0' : compact.format(minor / 10 ** digits))
    const rawMax = Math.max(...months.flatMap((m) => [m.total, m.billed]), 1)
    const step = niceCeil(rawMax / 4)
    const axisMax = step * 4
    const ticks = [4, 3, 2, 1, 0].map((i) => step * i)
    const barH = (v: number) => (v === 0 ? 4 : `${Math.max(3, (v / axisMax) * 100)}%`)

    const steps = [
        {
            done: setupDone,
            label: 'Complétez les informations de votre entreprise (NIU, RCCM, adresse)',
            href: '/settings',
            cta: 'Ouvrir les paramètres',
        },
        { done: hasCustomer, label: 'Ajoutez votre premier client', href: '/customers/new', cta: 'Ajouter un client' },
        { done: false, label: 'Créez votre première facture', href: '/invoices/new', cta: 'Créer une facture' },
    ]

    return (
        <>
            {/* En-tête */}
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
                    <p className="mt-1 text-muted">
                        {firstName ? `Bonjour ${firstName} · ` : ''}
                        {dateLabel}
                    </p>
                </div>
                <Link href="/invoices/new" className={btn('primary')}>
                    + Créer une facture
                </Link>
            </div>

            {noInvoices && (
                <section className={`${cardClass} mb-4`}>
                    <h2 className="text-lg font-bold">Pour bien démarrer</h2>
                    <p className="mb-4 mt-1 text-sm text-muted">Trois étapes pour envoyer votre première facture.</p>
                    <ol className="space-y-3">
                        {steps.map((s, i) => (
                            <li key={s.href} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                                <span
                                    className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-bold ${s.done ? 'bg-ok-soft text-ok' : 'bg-mist text-ink'
                                        }`}
                                >
                                    {s.done ? 'Fait' : i + 1}
                                </span>
                                <span className={s.done ? 'text-muted line-through' : 'font-semibold'}>{s.label}</span>
                                {!s.done && (
                                    <Link href={s.href} className="font-bold underline underline-offset-2">
                                        {s.cta}
                                    </Link>
                                )}
                            </li>
                        ))}
                    </ol>
                </section>
            )}

            {/* Colonne gauche : indicateurs + graphique | Colonne droite : statuts + meilleurs clients */}
            <div className="mb-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
                <div className="flex min-w-0 flex-col gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <KpiCard
                            dark
                            icon="wallet"
                            label="À encaisser"
                            value={money(toCollect)}
                            badge={`${issued.length} facture${plural(issued.length)}`}
                            tone="muted"
                            note={late > 0 ? `dont ${money(late)} en retard` : 'Aucun retard'}
                        />
                        <KpiCard
                            icon="check"
                            label="Payées ce mois"
                            value={money(collected)}
                            badge={paidTrend.badge}
                            tone={paidTrend.tone}
                            note={paidTrend.note}
                        />
                        <KpiCard
                            icon="alert"
                            label="En retard"
                            value={money(late)}
                            badge={lateCount > 0 ? `${lateCount}` : 'OK'}
                            tone={lateCount > 0 ? 'bad' : 'ok'}
                            note={lateCount > 0 ? `facture${plural(lateCount)} en retard` : 'Aucune facture en retard'}
                        />
                        <KpiCard
                            icon="users"
                            label="Nouveaux clients"
                            value={String(newThisMonth)}
                            badge={newTrend.badge}
                            tone={newTrend.tone}
                            note={newTrend.note}
                        />
                    </div>

                    <section className={`${cardClass} flex-1`}>
                        <CardHead
                            title="Revenus"
                            subtitle={`Facturé et encaissé, en ${org.currency} (k = milliers, M = millions)`}
                            right={<span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold">6 derniers mois</span>}
                        />
                        <div className="mb-4 flex items-center gap-5 text-xs text-muted">
                            <span className="flex items-center gap-2">
                                <i className="inline-block h-2.5 w-2.5 rounded-full bg-[#ffc58f]" /> Facturé
                            </span>
                            <span className="flex items-center gap-2">
                                <i className="inline-block h-2.5 w-2.5 rounded-full bg-brand" /> Encaissé
                            </span>
                        </div>

                        <div className="flex gap-3">
                            <div className="flex h-[220px] shrink-0 flex-col justify-between text-xs tabular-nums text-muted">
                                {ticks.map((t) => (
                                    <span key={t} className="leading-none">
                                        {axisLabel(t)}
                                    </span>
                                ))}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="relative h-[220px]">
                                    <div aria-hidden className="absolute inset-0 flex flex-col justify-between">
                                        {ticks.map((t) => (
                                            <div key={t} className="border-t border-mist" />
                                        ))}
                                    </div>
                                    <div className="absolute inset-0 flex items-end">
                                        {months.map((m) => (
                                            <div
                                                key={m.key}
                                                className="flex h-full flex-1 items-end justify-center gap-1.5"
                                                title={`${m.label} · facturé ${money(m.billed)} · encaissé ${money(m.total)}`}
                                            >
                                                <div
                                                    className="w-3.5 rounded-full bg-[#ffc58f] sm:w-5"
                                                    style={{ height: barH(m.billed) }}
                                                />
                                                <div
                                                    className="w-3.5 rounded-full bg-brand sm:w-5"
                                                    style={{ height: barH(m.total) }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-2 flex">
                                    {months.map((m) => (
                                        <span
                                            key={m.key}
                                            className={`flex-1 text-center text-xs ${m.current ? 'font-bold' : 'text-muted'}`}
                                        >
                                            {m.label}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="flex min-w-0 flex-col gap-4">
                    <section className={`${cardClass} bg-[linear-gradient(180deg,#ffe9d9_0%,transparent_75%)]`}>
                        <CardHead title="Factures par statut" subtitle="Répartition de toutes vos factures" />
                        <div className="my-5 flex justify-center">
                            <div
                                className="h-44 w-44 rounded-full shadow-[0_10px_30px_rgba(255,107,0,.2)]"
                                style={{ background: pie }}
                                role="img"
                                aria-label={`${pieTotal} facture${plural(pieTotal)} : ${paidCount} payée${plural(paidCount)}, ${pendingCount} en attente, ${lateCount} en retard`}
                            />
                        </div>
                        <ul className="space-y-2.5 text-sm">
                            {statusRows.map((r) => (
                                <li key={r.label} className="flex items-center justify-between gap-3">
                                    <span className="flex items-center gap-2.5">
                                        <i className={`inline-block h-3 w-3 rounded-full ${r.dot}`} />
                                        {r.label}
                                    </span>
                                    <span className="flex items-center gap-3">
                                        <b className="tabular-nums">{r.count}</b>
                                        <span
                                            className={`min-w-12 rounded-full px-2 py-0.5 text-center text-xs font-bold ${r.label === 'Payées'
                                                ? pillTone.ok
                                                : r.label === 'En retard' && r.count > 0
                                                    ? pillTone.bad
                                                    : pillTone.muted
                                                }`}
                                        >
                                            {pct(r.count)} %
                                        </span>
                                    </span>
                                </li>
                            ))}
                        </ul>
                        {pieTotal === 0 && (
                            <p className="mt-4 text-xs text-muted">Les factures émises apparaîtront ici.</p>
                        )}
                    </section>

                    <section className={`${cardClass} flex-1`}>
                        <CardHead title="Meilleurs clients" subtitle="Payé sur les 6 derniers mois" />
                        {topClients.length === 0 ? (
                            <p className="border-t border-mist pt-4 text-sm text-muted">
                                Vos clients les plus fidèles apparaîtront ici.
                            </p>
                        ) : (
                            <div className="flex items-center gap-4">
                                <div className="relative h-[170px] w-[160px] shrink-0" aria-hidden="true">
                                    {topClients.map(([id], i) => {
                                        const size = Math.round(44 + 36 * (shares[i] / maxShare))
                                        const [cx, cy] = bubbleCenters[i]
                                        return (
                                            <span
                                                key={id}
                                                className={`absolute flex items-center justify-center rounded-full text-sm font-bold shadow-sm ${bubbleStyles[i]}`}
                                                style={{ width: size, height: size, left: cx - size / 2, top: cy - size / 2 }}
                                            >
                                                {Math.round(shares[i] * 100)}%
                                            </span>
                                        )
                                    })}
                                </div>
                                <ul className="min-w-0 flex-1 space-y-3.5">
                                    {topClients.map(([id, total], i) => {
                                        const name = names.get(id) ?? '—'
                                        return (
                                            <li key={id}>
                                                <div className="flex items-center justify-between gap-2 text-sm">
                                                    <span className="flex min-w-0 items-center gap-2">
                                                        <span
                                                            aria-hidden="true"
                                                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warn-soft text-[10px] font-bold text-warn"
                                                        >
                                                            {initials(name)}
                                                        </span>
                                                        <span className="truncate font-semibold">{name}</span>
                                                    </span>
                                                </div>
                                                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-mist">
                                                    <div
                                                        className="h-full rounded-full bg-brand"
                                                        style={{ width: `${Math.max(6, Math.round(shares[i] * 100))}%` }}
                                                    />
                                                </div>
                                                <p className="mt-1 text-xs tabular-nums text-muted">{money(total)}</p>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </div>
                        )}
                    </section>
                </div>
            </div>

            {/* Dernières factures et relances */}
            <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
                <section className={cardClass}>
                    <div className="mb-2 flex items-center justify-between">
                        <h2 className="text-lg font-bold">Dernières factures</h2>
                        <Link href="/invoices" className="text-sm font-bold underline underline-offset-2">
                            Voir tout
                        </Link>
                    </div>
                    {recent.length === 0 ? (
                        <p className="border-t border-mist pt-4 text-sm text-muted">Vos factures apparaîtront ici.</p>
                    ) : (
                        recent.map((r) => {
                            const ds = displayStatus(r, today)
                            const total = Number(r.total)
                            const date = shortDate(r.issue_date)
                            return (
                                <div
                                    key={r.id}
                                    className="flex flex-wrap items-center justify-between gap-3 border-t border-mist py-3.5"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mist">
                                            <IconDoc width={18} height={18} />
                                        </span>
                                        <div>
                                            <Link
                                                href={`/invoices/${r.id}`}
                                                className="font-bold underline-offset-2 hover:underline"
                                            >
                                                {r.number ? `Facture ${r.number}` : 'Brouillon'} · {names.get(r.customer_id) ?? '—'}
                                            </Link>
                                            <p className="text-sm text-muted">{date ?? 'Pas encore émise'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <StatusBadge status={ds} />
                                        <b className={`font-display tabular-nums ${ds === 'paid' ? 'text-ok' : ''}`}>
                                            {ds === 'draft' && total === 0 ? '—' : `${ds === 'paid' ? '+' : ''}${money(total)}`}
                                        </b>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </section>

                <section className={cardClass}>
                    <h2 className="text-lg font-bold">À relancer</h2>
                    <p className="mb-3 mt-1 text-sm text-muted">Factures dont l’échéance est dépassée</p>
                    {toChase.length === 0 ? (
                        <p className="border-t border-mist pt-4 text-sm text-muted">
                            Aucune facture en retard. Bravo, tout est à jour.
                        </p>
                    ) : (
                        <>
                            {toChase.map((o) => {
                                const days = daysBetween(o.due_date, today)
                                return (
                                    <div key={o.id} className="border-t border-mist py-3.5">
                                        <b className="text-sm">
                                            {o.number ?? 'Sans numéro'} · {names.get(o.customer_id) ?? '—'}
                                        </b>
                                        <p className="mb-2.5 mt-0.5 text-[13px] font-semibold text-bad">
                                            {days} jour{plural(days)} de retard · {money(o.total)}
                                        </p>
                                        <Link href={`/invoices/${o.id}`} className={btn('outline', 'sm')}>
                                            Voir la facture
                                        </Link>
                                    </div>
                                )
                            })}
                            {overdue.length > toChase.length && (
                                <Link
                                    href="/invoices?status=overdue"
                                    className="mt-1 inline-block text-[13px] font-bold underline underline-offset-2"
                                >
                                    Voir les {overdue.length - toChase.length} autre
                                    {plural(overdue.length - toChase.length)}
                                </Link>
                            )}
                        </>
                    )}
                </section>
            </div>
        </>
    )
}

// import Link from 'next/link'
// import { createClient } from '@/lib/supabase/server'
// import { getCurrentOrganization } from '@/lib/organization'
// import { currencyDigits, formatMoney } from '@/lib/money'
// import { daysBetween, displayStatus, todayISO } from '@/lib/invoices'
// import { StatusBadge } from '@/components/status-badge'
// import { btn, cardClass } from '@/lib/ui'
// import { IconDoc } from '@/components/icon'

// const plural = (n: number) => (n > 1 ? 's' : '')
// const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
// const initials = (name: string) =>
//     name
//         .split(/\s+/)
//         .filter(Boolean)
//         .slice(0, 2)
//         .map((w) => w[0]?.toUpperCase())
//         .join('') || '?'
// const shortDate = (iso: string | null) =>
//     iso
//         ? new Intl.DateTimeFormat('fr-FR', {
//             day: '2-digit',
//             month: 'short',
//             year: 'numeric',
//             timeZone: 'UTC',
//         }).format(new Date(`${iso}T00:00:00Z`))
//         : null
// const pctFmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })

// // Variation d'un montant par rapport au mois dernier
// function moneyTrend(cur: number, prev: number): { text: string; cls: string } {
//     if (prev === 0) {
//         return {
//             text: cur > 0 ? 'Aucun paiement le mois dernier' : 'Aucun paiement ce mois',
//             cls: 'text-muted',
//         }
//     }
//     const pct = ((cur - prev) / prev) * 100
//     if (pct === 0) return { text: 'Stable vs mois dernier', cls: 'text-muted' }
//     return pct > 0
//         ? { text: `↑ ${pctFmt.format(pct)} % vs mois dernier`, cls: 'text-ok' }
//         : { text: `↓ ${pctFmt.format(-pct)} % vs mois dernier`, cls: 'text-bad' }
// }

// export default async function DashboardPage() {
//     const org = await getCurrentOrganization()
//     if (!org) return null // la mise en page redirige déjà vers /onboarding

//     const supabase = await createClient()
//     const { data: claimsData } = await supabase.auth.getClaims()
//     const fullName = (claimsData?.claims?.user_metadata as { full_name?: unknown } | undefined)
//         ?.full_name
//     const firstName = typeof fullName === 'string' ? fullName.trim().split(/\s+/)[0] : ''

//     const digits = currencyDigits(org.currency)
//     const money = (n: number) => formatMoney(n, org.currency)
//     const now = new Date()
//     const today = todayISO()
//     const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
//     const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
//     const chartStart = new Date(now.getFullYear(), now.getMonth() - 5, 1)

//     const [paidRes, issuedRes, recentRes, countRes, paidCountRes, newCustRes] = await Promise.all([
//         supabase
//             .from('invoices')
//             .select('paid_at, total, customer_id')
//             .eq('organization_id', org.id)
//             .eq('status', 'paid')
//             .gte('paid_at', chartStart.toISOString()),
//         supabase
//             .from('invoices')
//             .select('id, number, customer_id, due_date, status, total')
//             .eq('organization_id', org.id)
//             .eq('status', 'issued'),
//         supabase
//             .from('invoices')
//             .select('id, number, status, customer_id, issue_date, due_date, total')
//             .eq('organization_id', org.id)
//             .order('created_at', { ascending: false })
//             .limit(5),
//         supabase
//             .from('invoices')
//             .select('id', { count: 'exact', head: true })
//             .eq('organization_id', org.id),
//         supabase
//             .from('invoices')
//             .select('id', { count: 'exact', head: true })
//             .eq('organization_id', org.id)
//             .eq('status', 'paid'),
//         supabase
//             .from('customers')
//             .select('created_at')
//             .eq('organization_id', org.id)
//             .gte('created_at', prevMonthStart.toISOString()),
//     ])
//     if (
//         paidRes.error ||
//         issuedRes.error ||
//         recentRes.error ||
//         countRes.error ||
//         paidCountRes.error ||
//         newCustRes.error
//     ) {
//         throw new Error('Lecture du tableau de bord impossible')
//     }

//     // Encaissé : six mois glissants, le dernier est le mois courant
//     const months = Array.from({ length: 6 }, (_, i) => {
//         const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
//         return {
//             key: `${d.getFullYear()}-${d.getMonth()}`,
//             label: capitalize(new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(d)),
//             total: 0,
//             current: i === 5,
//         }
//     })
//     const paidByCustomer = new Map<string, number>()
//     for (const p of paidRes.data ?? []) {
//         if (!p.paid_at) continue
//         const d = new Date(p.paid_at)
//         const m = months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`)
//         if (m) m.total += Number(p.total)
//         paidByCustomer.set(p.customer_id, (paidByCustomer.get(p.customer_id) ?? 0) + Number(p.total))
//     }
//     const collected = months[5].total
//     const collectedPrev = months[4].total
//     const paidTrend = moneyTrend(collected, collectedPrev)

//     // Factures émises non payées : dans les délais, ou en retard
//     const issued = issuedRes.data ?? []
//     let pending = 0
//     let late = 0
//     const overdue: { id: string; number: string | null; customer_id: string; due_date: string; total: number }[] = []
//     for (const inv of issued) {
//         if (displayStatus(inv, today) === 'overdue' && inv.due_date) {
//             late += Number(inv.total)
//             overdue.push({
//                 id: inv.id,
//                 number: inv.number,
//                 customer_id: inv.customer_id,
//                 due_date: inv.due_date,
//                 total: Number(inv.total),
//             })
//         } else {
//             pending += Number(inv.total)
//         }
//     }
//     overdue.sort((a, b) => (a.due_date < b.due_date ? -1 : 1))
//     const toChase = overdue.slice(0, 3)
//     const toCollect = pending + late

//     // Nouveaux clients : ce mois-ci et le mois dernier
//     let newThisMonth = 0
//     let newLastMonth = 0
//     for (const c of newCustRes.data ?? []) {
//         if (new Date(c.created_at).getTime() >= monthStart) newThisMonth += 1
//         else newLastMonth += 1
//     }
//     const newDelta = newThisMonth - newLastMonth
//     const newTrend =
//         newDelta > 0
//             ? { text: `↑ ${newDelta} vs mois dernier`, cls: 'text-ok' }
//             : newDelta < 0
//                 ? { text: `↓ ${-newDelta} vs mois dernier`, cls: 'text-bad' }
//                 : { text: 'Autant que le mois dernier', cls: 'text-muted' }

//     // Meilleurs clients (montant payé sur 6 mois)
//     const topClients = Array.from(paidByCustomer.entries())
//         .sort((a, b) => b[1] - a[1])
//         .slice(0, 4)

//     const recent = recentRes.data ?? []

//     // Noms des clients, en une seule requête
//     const ids = Array.from(
//         new Set([
//             ...toChase.map((o) => o.customer_id),
//             ...recent.map((r) => r.customer_id),
//             ...topClients.map(([id]) => id),
//         ])
//     )
//     const names = new Map<string, string>()
//     if (ids.length > 0) {
//         const { data, error } = await supabase
//             .from('customers')
//             .select('id, name')
//             .eq('organization_id', org.id)
//             .in('id', ids)
//         if (error) throw new Error('Lecture des clients impossible')
//         for (const c of data ?? []) names.set(c.id, c.name)
//     }

//     // Répartition par statut (donut)
//     const paidCount = paidCountRes.count ?? 0
//     const lateCount = overdue.length
//     const pendingCount = issued.length - lateCount
//     const donutTotal = paidCount + pendingCount + lateCount
//     const pct = (n: number) => (donutTotal ? Math.round((n / donutTotal) * 100) : 0)
//     const a = donutTotal ? (paidCount / donutTotal) * 100 : 0
//     const b = donutTotal ? a + (pendingCount / donutTotal) * 100 : 0
//     const ring = donutTotal
//         ? `conic-gradient(#ff6b00 0 ${a}%, #ffc58f ${a}% ${b}%, #262626 ${b}% 100%)`
//         : 'conic-gradient(#e8e8ea 0 100%)'

//     // Aide au démarrage : seulement tant qu'il n'y a aucune facture
//     const noInvoices = (countRes.count ?? 0) === 0
//     let setupDone = false
//     let hasCustomer = false
//     if (noInvoices) {
//         const [setupRes, custRes] = await Promise.all([
//             supabase
//                 .from('organizations')
//                 .select('tax_id, registration_number, address')
//                 .eq('id', org.id)
//                 .single(),
//             supabase
//                 .from('customers')
//                 .select('id', { count: 'exact', head: true })
//                 .eq('organization_id', org.id)
//                 .is('archived_at', null),
//         ])
//         if (setupRes.error || custRes.error) throw new Error('Lecture de la configuration impossible')
//         const s = setupRes.data
//         setupDone = Boolean(s?.tax_id?.trim() && s?.registration_number?.trim() && s?.address?.trim())
//         hasCustomer = (custRes.count ?? 0) > 0
//     }

//     // Graphique
//     const compact = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 })
//     const barLabel = (minor: number) => (minor === 0 ? '0' : compact.format(minor / 10 ** digits))
//     const maxTotal = Math.max(...months.map((m) => m.total), 1)

//     const steps = [
//         {
//             done: setupDone,
//             label: 'Complétez les informations de votre entreprise (NIU, RCCM, adresse)',
//             href: '/settings',
//             cta: 'Ouvrir les paramètres',
//         },
//         { done: hasCustomer, label: 'Ajoutez votre premier client', href: '/customers/new', cta: 'Ajouter un client' },
//         { done: false, label: 'Créez votre première facture', href: '/invoices/new', cta: 'Créer une facture' },
//     ]

//     return (
//         <>
//             <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
//                 <div>
//                     <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
//                     <p className="mt-1 text-muted">
//                         {firstName ? `Bonjour ${firstName}. ` : ''}Suivez vos factures et vos paiements.
//                     </p>
//                 </div>
//                 <Link href="/invoices/new" className={btn('primary')}>
//                     + Créer une facture
//                 </Link>
//             </div>

//             {noInvoices && (
//                 <section className={`${cardClass} mb-4`}>
//                     <h2 className="text-lg font-bold">Pour bien démarrer</h2>
//                     <p className="mb-4 mt-1 text-sm text-muted">Trois étapes pour envoyer votre première facture.</p>
//                     <ol className="space-y-3">
//                         {steps.map((s, i) => (
//                             <li key={s.href} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
//                                 <span
//                                     className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-bold ${s.done ? 'bg-ok-soft text-ok' : 'bg-mist text-ink'
//                                         }`}
//                                 >
//                                     {s.done ? 'Fait' : i + 1}
//                                 </span>
//                                 <span className={s.done ? 'text-muted line-through' : 'font-semibold'}>{s.label}</span>
//                                 {!s.done && (
//                                     <Link href={s.href} className="font-bold underline underline-offset-2">
//                                         {s.cta}
//                                     </Link>
//                                 )}
//                             </li>
//                         ))}
//                     </ol>
//                 </section>
//             )}

//             {/* Indicateurs */}
//             <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
//                 <div className="rounded-3xl bg-ink p-5 text-white">
//                     <p className="text-sm text-white/75">À encaisser</p>
//                     <p className="mt-2 font-display text-[28px] font-bold leading-tight tracking-tight">
//                         {money(toCollect)}
//                     </p>
//                     <p className="mt-1.5 text-sm text-white/75">
//                         {issued.length === 0
//                             ? 'Aucune facture en attente'
//                             : `${issued.length} facture${plural(issued.length)} à encaisser`}
//                     </p>
//                 </div>
//                 <div className={`${cardClass} p-5`}>
//                     <p className="text-sm text-muted">Payées ce mois</p>
//                     <p className="mt-2 font-display text-[28px] font-bold leading-tight tracking-tight">
//                         {money(collected)}
//                     </p>
//                     <p className={`mt-1.5 text-sm font-semibold ${paidTrend.cls}`}>{paidTrend.text}</p>
//                 </div>
//                 <div className={`${cardClass} p-5`}>
//                     <p className="text-sm text-muted">En retard</p>
//                     <p className="mt-2 font-display text-[28px] font-bold leading-tight tracking-tight">
//                         {money(late)}
//                     </p>
//                     <p className={`mt-1.5 text-sm font-semibold ${lateCount > 0 ? 'text-bad' : 'text-muted'}`}>
//                         {lateCount > 0
//                             ? `${lateCount} facture${plural(lateCount)} en retard`
//                             : 'Aucune facture en retard'}
//                     </p>
//                 </div>
//                 <div className={`${cardClass} p-5`}>
//                     <p className="text-sm text-muted">Nouveaux clients</p>
//                     <p className="mt-2 font-display text-[28px] font-bold leading-tight tracking-tight">
//                         {newThisMonth}
//                     </p>
//                     <p className={`mt-1.5 text-sm font-semibold ${newTrend.cls}`}>{newTrend.text}</p>
//                 </div>
//             </div>

//             {/* Revenus et répartition */}
//             <div className="mb-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
//                 <section className={cardClass}>
//                     <h2 className="text-lg font-bold">Revenus encaissés</h2>
//                     <p className="mb-5 mt-1 text-sm text-muted">
//                         6 derniers mois, en {org.currency} (k = milliers, M = millions)
//                     </p>
//                     <div className="flex h-[220px] items-end gap-3">
//                         {months.map((m) => (
//                             <div key={m.key} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
//                                 <span className="text-xs tabular-nums text-muted">{barLabel(m.total)}</span>
//                                 <div
//                                     className={`w-full max-w-14 rounded-xl ${m.total === 0 ? 'bg-[#e8e8ea]' : m.current ? 'bg-brand' : 'bg-[#ffc58f]'
//                                         }`}
//                                     style={{
//                                         height: m.total === 0 ? 4 : Math.max(8, Math.round((m.total / maxTotal) * 150)),
//                                     }}
//                                 />
//                                 <span className={`text-xs ${m.current ? 'font-bold' : 'text-muted'}`}>{m.label}</span>
//                             </div>
//                         ))}
//                     </div>
//                 </section>

//                 <section className={cardClass}>
//                     <h2 className="text-lg font-bold">Factures par statut</h2>
//                     <div className="my-5 flex justify-center">
//                         <div
//                             className="relative h-44 w-44 rounded-full"
//                             style={{ background: ring }}
//                             role="img"
//                             aria-label={`${donutTotal} facture${plural(donutTotal)} : ${paidCount} payée${plural(paidCount)}, ${pendingCount} en attente, ${lateCount} en retard`}
//                         >
//                             <div className="absolute inset-[22%] flex flex-col items-center justify-center rounded-full bg-paper">
//                                 <span className="font-display text-3xl font-bold leading-none">{donutTotal}</span>
//                                 <span className="mt-1 text-xs text-muted">facture{plural(donutTotal)}</span>
//                             </div>
//                         </div>
//                     </div>
//                     <ul className="space-y-2.5 text-sm">
//                         <li className="flex items-center justify-between gap-3">
//                             <span className="flex items-center gap-2.5">
//                                 <i className="inline-block h-3 w-3 rounded-full bg-brand" />
//                                 Payées
//                             </span>
//                             <b>{pct(paidCount)} %</b>
//                         </li>
//                         <li className="flex items-center justify-between gap-3">
//                             <span className="flex items-center gap-2.5">
//                                 <i className="inline-block h-3 w-3 rounded-full bg-[#ffc58f]" />
//                                 En attente
//                             </span>
//                             <b>{pct(pendingCount)} %</b>
//                         </li>
//                         <li className="flex items-center justify-between gap-3">
//                             <span className="flex items-center gap-2.5">
//                                 <i className="inline-block h-3 w-3 rounded-full bg-ink" />
//                                 En retard
//                             </span>
//                             <b>{pct(lateCount)} %</b>
//                         </li>
//                     </ul>
//                     {donutTotal === 0 && (
//                         <p className="mt-4 text-xs text-muted">Les factures émises apparaîtront ici.</p>
//                     )}
//                 </section>
//             </div>

//             {/* Dernières factures, relances et meilleurs clients */}
//             <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
//                 <section className={cardClass}>
//                     <div className="mb-2 flex items-center justify-between">
//                         <h2 className="text-lg font-bold">Dernières factures</h2>
//                         <Link href="/invoices" className="text-sm font-bold underline underline-offset-2">
//                             Voir tout
//                         </Link>
//                     </div>
//                     {recent.length === 0 ? (
//                         <p className="border-t border-mist pt-4 text-sm text-muted">
//                             Vos factures apparaîtront ici.
//                         </p>
//                     ) : (
//                         recent.map((r) => {
//                             const ds = displayStatus(r, today)
//                             const total = Number(r.total)
//                             const date = shortDate(r.issue_date)
//                             return (
//                                 <div
//                                     key={r.id}
//                                     className="flex flex-wrap items-center justify-between gap-3 border-t border-mist py-3.5"
//                                 >
//                                     <div className="flex items-center gap-3">
//                                         <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mist">
//                                             <IconDoc width={18} height={18} />
//                                         </span>
//                                         <div>
//                                             <Link
//                                                 href={`/invoices/${r.id}`}
//                                                 className="font-bold underline-offset-2 hover:underline"
//                                             >
//                                                 {r.number ? `Facture ${r.number}` : 'Brouillon'} · {names.get(r.customer_id) ?? '—'}
//                                             </Link>
//                                             <p className="text-sm text-muted">{date ?? 'Pas encore émise'}</p>
//                                         </div>
//                                     </div>
//                                     <div className="flex items-center gap-4">
//                                         <StatusBadge status={ds} />
//                                         <b
//                                             className={`font-display tabular-nums ${ds === 'paid' ? 'text-ok' : ''}`}
//                                         >
//                                             {ds === 'draft' && total === 0
//                                                 ? '—'
//                                                 : `${ds === 'paid' ? '+' : ''}${money(total)}`}
//                                         </b>
//                                     </div>
//                                 </div>
//                             )
//                         })
//                     )}
//                 </section>

//                 <div className="flex flex-col gap-4">
//                     <section className={cardClass}>
//                         <h2 className="text-lg font-bold">À relancer</h2>
//                         <p className="mb-3 mt-1 text-sm text-muted">Factures dont l’échéance est dépassée</p>
//                         {toChase.length === 0 ? (
//                             <p className="border-t border-mist pt-4 text-sm text-muted">
//                                 Aucune facture en retard. Bravo, tout est à jour.
//                             </p>
//                         ) : (
//                             <>
//                                 {toChase.map((o) => {
//                                     const days = daysBetween(o.due_date, today)
//                                     return (
//                                         <div key={o.id} className="border-t border-mist py-3.5">
//                                             <b className="text-sm">
//                                                 {o.number ?? 'Sans numéro'} · {names.get(o.customer_id) ?? '—'}
//                                             </b>
//                                             <p className="mb-2.5 mt-0.5 text-[13px] font-semibold text-bad">
//                                                 {days} jour{plural(days)} de retard · {money(o.total)}
//                                             </p>
//                                             <Link href={`/invoices/${o.id}`} className={btn('outline', 'sm')}>
//                                                 Voir la facture
//                                             </Link>
//                                         </div>
//                                     )
//                                 })}
//                                 {overdue.length > toChase.length && (
//                                     <Link
//                                         href="/invoices?status=overdue"
//                                         className="mt-1 inline-block text-[13px] font-bold underline underline-offset-2"
//                                     >
//                                         Voir les {overdue.length - toChase.length} autre
//                                         {plural(overdue.length - toChase.length)}
//                                     </Link>
//                                 )}
//                             </>
//                         )}
//                     </section>

//                     <section className={cardClass}>
//                         <h2 className="mb-1 text-lg font-bold">Meilleurs clients</h2>
//                         <p className="mb-3 text-sm text-muted">Payé sur les 6 derniers mois</p>
//                         {topClients.length === 0 ? (
//                             <p className="border-t border-mist pt-4 text-sm text-muted">
//                                 Vos clients les plus fidèles apparaîtront ici.
//                             </p>
//                         ) : (
//                             topClients.map(([id, total]) => {
//                                 const name = names.get(id) ?? '—'
//                                 return (
//                                     <div
//                                         key={id}
//                                         className="flex items-center justify-between gap-3 border-t border-mist py-3"
//                                     >
//                                         <span className="flex min-w-0 items-center gap-3">
//                                             <span
//                                                 aria-hidden="true"
//                                                 className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warn-soft text-sm font-bold text-warn"
//                                             >
//                                                 {initials(name)}
//                                             </span>
//                                             <span className="truncate font-bold">{name}</span>
//                                         </span>
//                                         <span className="shrink-0 text-sm font-semibold tabular-nums">{money(total)}</span>
//                                     </div>
//                                 )
//                             })
//                         )}
//                     </section>
//                 </div>
//             </div>
//         </>
//     )
// }
