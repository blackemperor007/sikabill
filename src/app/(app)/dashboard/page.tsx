import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrganization } from '@/lib/organization'
import { currencyDigits, formatMoney } from '@/lib/money'
import { daysBetween, displayStatus, todayISO } from '@/lib/invoices'
import { StatusBadge } from '@/components/status-badge'
import { btn, cardClass } from '@/lib/ui'
import { IconDoc } from '@/components/icon'

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

// Variation d'un montant par rapport au mois dernier
function moneyTrend(cur: number, prev: number): { text: string; cls: string } {
    if (prev === 0) {
        return {
            text: cur > 0 ? 'Aucun paiement le mois dernier' : 'Aucun paiement ce mois',
            cls: 'text-muted',
        }
    }
    const pct = ((cur - prev) / prev) * 100
    if (pct === 0) return { text: 'Stable vs mois dernier', cls: 'text-muted' }
    return pct > 0
        ? { text: `↑ ${pctFmt.format(pct)} % vs mois dernier`, cls: 'text-ok' }
        : { text: `↓ ${pctFmt.format(-pct)} % vs mois dernier`, cls: 'text-bad' }
}

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
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const chartStart = new Date(now.getFullYear(), now.getMonth() - 5, 1)

    const [paidRes, issuedRes, recentRes, countRes, paidCountRes, newCustRes] = await Promise.all([
        supabase
            .from('invoices')
            .select('paid_at, total, customer_id')
            .eq('organization_id', org.id)
            .eq('status', 'paid')
            .gte('paid_at', chartStart.toISOString()),
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
        issuedRes.error ||
        recentRes.error ||
        countRes.error ||
        paidCountRes.error ||
        newCustRes.error
    ) {
        throw new Error('Lecture du tableau de bord impossible')
    }

    // Encaissé : six mois glissants, le dernier est le mois courant
    const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
        return {
            key: `${d.getFullYear()}-${d.getMonth()}`,
            label: capitalize(new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(d)),
            total: 0,
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
    const newTrend =
        newDelta > 0
            ? { text: `↑ ${newDelta} vs mois dernier`, cls: 'text-ok' }
            : newDelta < 0
                ? { text: `↓ ${-newDelta} vs mois dernier`, cls: 'text-bad' }
                : { text: 'Autant que le mois dernier', cls: 'text-muted' }

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

    // Répartition par statut (donut)
    const paidCount = paidCountRes.count ?? 0
    const lateCount = overdue.length
    const pendingCount = issued.length - lateCount
    const donutTotal = paidCount + pendingCount + lateCount
    const pct = (n: number) => (donutTotal ? Math.round((n / donutTotal) * 100) : 0)
    const a = donutTotal ? (paidCount / donutTotal) * 100 : 0
    const b = donutTotal ? a + (pendingCount / donutTotal) * 100 : 0
    const ring = donutTotal
        ? `conic-gradient(#ff6b00 0 ${a}%, #ffc58f ${a}% ${b}%, #262626 ${b}% 100%)`
        : 'conic-gradient(#e8e8ea 0 100%)'

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

    // Graphique
    const compact = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 })
    const barLabel = (minor: number) => (minor === 0 ? '0' : compact.format(minor / 10 ** digits))
    const maxTotal = Math.max(...months.map((m) => m.total), 1)

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
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
                    <p className="mt-1 text-muted">
                        {firstName ? `Bonjour ${firstName}. ` : ''}Suivez vos factures et vos paiements.
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

            {/* Indicateurs */}
            <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-3xl bg-ink p-5 text-white">
                    <p className="text-sm text-white/75">À encaisser</p>
                    <p className="mt-2 font-display text-[28px] font-bold leading-tight tracking-tight">
                        {money(toCollect)}
                    </p>
                    <p className="mt-1.5 text-sm text-white/75">
                        {issued.length === 0
                            ? 'Aucune facture en attente'
                            : `${issued.length} facture${plural(issued.length)} à encaisser`}
                    </p>
                </div>
                <div className={`${cardClass} p-5`}>
                    <p className="text-sm text-muted">Payées ce mois</p>
                    <p className="mt-2 font-display text-[28px] font-bold leading-tight tracking-tight">
                        {money(collected)}
                    </p>
                    <p className={`mt-1.5 text-sm font-semibold ${paidTrend.cls}`}>{paidTrend.text}</p>
                </div>
                <div className={`${cardClass} p-5`}>
                    <p className="text-sm text-muted">En retard</p>
                    <p className="mt-2 font-display text-[28px] font-bold leading-tight tracking-tight">
                        {money(late)}
                    </p>
                    <p className={`mt-1.5 text-sm font-semibold ${lateCount > 0 ? 'text-bad' : 'text-muted'}`}>
                        {lateCount > 0
                            ? `${lateCount} facture${plural(lateCount)} en retard`
                            : 'Aucune facture en retard'}
                    </p>
                </div>
                <div className={`${cardClass} p-5`}>
                    <p className="text-sm text-muted">Nouveaux clients</p>
                    <p className="mt-2 font-display text-[28px] font-bold leading-tight tracking-tight">
                        {newThisMonth}
                    </p>
                    <p className={`mt-1.5 text-sm font-semibold ${newTrend.cls}`}>{newTrend.text}</p>
                </div>
            </div>

            {/* Revenus et répartition */}
            <div className="mb-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
                <section className={cardClass}>
                    <h2 className="text-lg font-bold">Revenus encaissés</h2>
                    <p className="mb-5 mt-1 text-sm text-muted">
                        6 derniers mois, en {org.currency} (k = milliers, M = millions)
                    </p>
                    <div className="flex h-[220px] items-end gap-3">
                        {months.map((m) => (
                            <div key={m.key} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                                <span className="text-xs tabular-nums text-muted">{barLabel(m.total)}</span>
                                <div
                                    className={`w-full max-w-14 rounded-xl ${m.total === 0 ? 'bg-[#e8e8ea]' : m.current ? 'bg-brand' : 'bg-[#ffc58f]'
                                        }`}
                                    style={{
                                        height: m.total === 0 ? 4 : Math.max(8, Math.round((m.total / maxTotal) * 150)),
                                    }}
                                />
                                <span className={`text-xs ${m.current ? 'font-bold' : 'text-muted'}`}>{m.label}</span>
                            </div>
                        ))}
                    </div>
                </section>

                <section className={cardClass}>
                    <h2 className="text-lg font-bold">Factures par statut</h2>
                    <div className="my-5 flex justify-center">
                        <div
                            className="relative h-44 w-44 rounded-full"
                            style={{ background: ring }}
                            role="img"
                            aria-label={`${donutTotal} facture${plural(donutTotal)} : ${paidCount} payée${plural(paidCount)}, ${pendingCount} en attente, ${lateCount} en retard`}
                        >
                            <div className="absolute inset-[22%] flex flex-col items-center justify-center rounded-full bg-paper">
                                <span className="font-display text-3xl font-bold leading-none">{donutTotal}</span>
                                <span className="mt-1 text-xs text-muted">facture{plural(donutTotal)}</span>
                            </div>
                        </div>
                    </div>
                    <ul className="space-y-2.5 text-sm">
                        <li className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2.5">
                                <i className="inline-block h-3 w-3 rounded-full bg-brand" />
                                Payées
                            </span>
                            <b>{pct(paidCount)} %</b>
                        </li>
                        <li className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2.5">
                                <i className="inline-block h-3 w-3 rounded-full bg-[#ffc58f]" />
                                En attente
                            </span>
                            <b>{pct(pendingCount)} %</b>
                        </li>
                        <li className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2.5">
                                <i className="inline-block h-3 w-3 rounded-full bg-ink" />
                                En retard
                            </span>
                            <b>{pct(lateCount)} %</b>
                        </li>
                    </ul>
                    {donutTotal === 0 && (
                        <p className="mt-4 text-xs text-muted">Les factures émises apparaîtront ici.</p>
                    )}
                </section>
            </div>

            {/* Dernières factures, relances et meilleurs clients */}
            <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
                <section className={cardClass}>
                    <div className="mb-2 flex items-center justify-between">
                        <h2 className="text-lg font-bold">Dernières factures</h2>
                        <Link href="/invoices" className="text-sm font-bold underline underline-offset-2">
                            Voir tout
                        </Link>
                    </div>
                    {recent.length === 0 ? (
                        <p className="border-t border-mist pt-4 text-sm text-muted">
                            Vos factures apparaîtront ici.
                        </p>
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
                                        <b
                                            className={`font-display tabular-nums ${ds === 'paid' ? 'text-ok' : ''}`}
                                        >
                                            {ds === 'draft' && total === 0
                                                ? '—'
                                                : `${ds === 'paid' ? '+' : ''}${money(total)}`}
                                        </b>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </section>

                <div className="flex flex-col gap-4">
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

                    <section className={cardClass}>
                        <h2 className="mb-1 text-lg font-bold">Meilleurs clients</h2>
                        <p className="mb-3 text-sm text-muted">Payé sur les 6 derniers mois</p>
                        {topClients.length === 0 ? (
                            <p className="border-t border-mist pt-4 text-sm text-muted">
                                Vos clients les plus fidèles apparaîtront ici.
                            </p>
                        ) : (
                            topClients.map(([id, total]) => {
                                const name = names.get(id) ?? '—'
                                return (
                                    <div
                                        key={id}
                                        className="flex items-center justify-between gap-3 border-t border-mist py-3"
                                    >
                                        <span className="flex min-w-0 items-center gap-3">
                                            <span
                                                aria-hidden="true"
                                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warn-soft text-sm font-bold text-warn"
                                            >
                                                {initials(name)}
                                            </span>
                                            <span className="truncate font-bold">{name}</span>
                                        </span>
                                        <span className="shrink-0 text-sm font-semibold tabular-nums">{money(total)}</span>
                                    </div>
                                )
                            })
                        )}
                    </section>
                </div>
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

// const plural = (n: number) => (n > 1 ? 's' : '')
// const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

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
//     const chartStart = new Date(now.getFullYear(), now.getMonth() - 5, 1)

//     const [paidRes, issuedRes, recentRes, countRes] = await Promise.all([
//         supabase
//             .from('invoices')
//             .select('paid_at, total')
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
//             .select('id, number, status, customer_id, due_date, total')
//             .eq('organization_id', org.id)
//             .order('created_at', { ascending: false })
//             .limit(5),
//         supabase
//             .from('invoices')
//             .select('id', { count: 'exact', head: true })
//             .eq('organization_id', org.id),
//     ])
//     if (paidRes.error || issuedRes.error || recentRes.error || countRes.error) {
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
//     for (const p of paidRes.data ?? []) {
//         if (!p.paid_at) continue
//         const d = new Date(p.paid_at)
//         const m = months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`)
//         if (m) m.total += Number(p.total)
//     }
//     const collected = months[5].total

//     // En attente (dans les délais) et en retard
//     let pending = 0
//     let late = 0
//     const overdue: { id: string; number: string | null; customer_id: string; due_date: string; total: number }[] = []
//     for (const inv of issuedRes.data ?? []) {
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
//     const recent = recentRes.data ?? []

//     // Noms des clients, en une seule requête
//     const ids = Array.from(new Set([...toChase.map((o) => o.customer_id), ...recent.map((r) => r.customer_id)]))
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
//         { done: setupDone, label: 'Complétez les informations de votre entreprise (NIU, RCCM, adresse)', href: '/settings', cta: 'Ouvrir les paramètres' },
//         { done: hasCustomer, label: 'Ajoutez votre premier client', href: '/customers/new', cta: 'Ajouter un client' },
//         { done: false, label: 'Créez votre première facture', href: '/invoices/new', cta: 'Créer une facture' },
//     ]

//     return (
//         <>
//             <div className="mb-6">
//                 <h1 className="text-3xl font-extrabold">{firstName ? `Bonjour ${firstName}` : 'Bonjour'}</h1>
//                 <p className="mt-1 text-sm text-gray-600">Voici où en sont vos factures aujourd’hui.</p>
//             </div>

//             {noInvoices && (
//                 <section className="mb-6 rounded-[14px] border border-gray-200 bg-white p-5">
//                     <h2 className="text-base font-bold">Pour bien démarrer</h2>
//                     <p className="mb-3 mt-1 text-[13px] text-gray-600">
//                         Trois étapes pour envoyer votre première facture.
//                     </p>
//                     <ol className="space-y-2.5">
//                         {steps.map((s, i) => (
//                             <li key={s.href} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
//                                 <span
//                                     className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold ${s.done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
//                                         }`}
//                                 >
//                                     {s.done ? 'Fait' : i + 1}
//                                 </span>
//                                 <span className={s.done ? 'text-gray-500 line-through' : 'font-medium'}>{s.label}</span>
//                                 {!s.done && (
//                                     <Link href={s.href} className="font-semibold underline">
//                                         {s.cta}
//                                     </Link>
//                                 )}
//                             </li>
//                         ))}
//                     </ol>
//                 </section>
//             )}

//             <div className="mb-6 grid gap-4 sm:grid-cols-3">
//                 <div className="rounded-[14px] border border-gray-200 bg-white p-[18px]">
//                     <div className="text-[13px] text-gray-600">Encaissé ce mois</div>
//                     <div className="mt-1.5 text-2xl font-extrabold">{money(collected)}</div>
//                 </div>
//                 <div className="rounded-[14px] border border-gray-200 bg-white p-[18px]">
//                     <div className="text-[13px] text-gray-600">En attente de paiement</div>
//                     <div className="mt-1.5 text-2xl font-extrabold">{money(pending)}</div>
//                 </div>
//                 <div className="rounded-[14px] border border-gray-200 bg-white p-[18px]">
//                     <div className="text-[13px] font-semibold text-red-700">En retard</div>
//                     <div className="mt-1.5 text-2xl font-extrabold">{money(late)}</div>
//                 </div>
//             </div>

//             <div className="mb-6 flex flex-wrap items-stretch gap-6">
//                 <section className="min-w-0 flex-[2_1_520px] rounded-[14px] border border-gray-200 bg-white p-5">
//                     <h2 className="text-base font-bold">Encaissé sur 6 mois</h2>
//                     <p className="mb-4 mt-1 text-[13px] text-gray-600">
//                         Par mois, en {org.currency} (k = milliers, M = millions)
//                     </p>
//                     <div className="flex h-[200px] items-end gap-3">
//                         {months.map((m) => (
//                             <div key={m.key} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
//                                 <span className="text-xs tabular-nums text-gray-600">{barLabel(m.total)}</span>
//                                 <div
//                                     className={`w-full max-w-14 rounded-t-lg ${m.total === 0 ? 'bg-gray-200' : m.current ? 'bg-[#E0A030]' : 'bg-[#1B2A41]'
//                                         }`}
//                                     style={{ height: m.total === 0 ? 2 : Math.max(6, Math.round((m.total / maxTotal) * 150)) }}
//                                 />
//                                 <span className={`text-xs ${m.current ? 'font-semibold' : ''}`}>{m.label}</span>
//                             </div>
//                         ))}
//                     </div>
//                 </section>

//                 <section className="min-w-0 flex-[1_1_300px] rounded-[14px] border border-gray-200 bg-white p-5">
//                     <h2 className="text-base font-bold">À relancer</h2>
//                     <p className="mb-3 mt-1 text-[13px] text-gray-600">Factures dont l’échéance est dépassée</p>
//                     {toChase.length === 0 ? (
//                         <p className="border-t border-gray-100 pt-4 text-sm text-gray-600">
//                             Aucune facture en retard. Bravo, tout est à jour.
//                         </p>
//                     ) : (
//                         <>
//                             {toChase.map((o) => {
//                                 const days = daysBetween(o.due_date, today)
//                                 return (
//                                     <div key={o.id} className="border-t border-gray-100 py-3.5">
//                                         <b className="text-sm">
//                                             {o.number ?? 'Sans numéro'} · {names.get(o.customer_id) ?? '—'}
//                                         </b>
//                                         <div className="mb-2.5 mt-0.5 text-[13px] text-red-700">
//                                             {days} jour{plural(days)} de retard · {money(o.total)}
//                                         </div>
//                                         <Link
//                                             href={`/invoices/${o.id}`}
//                                             className="inline-flex min-h-[44px] items-center rounded-[10px] border border-gray-300 bg-white px-4 text-sm font-semibold"
//                                         >
//                                             Voir la facture
//                                         </Link>
//                                     </div>
//                                 )
//                             })}
//                             {overdue.length > toChase.length && (
//                                 <Link
//                                     href="/invoices?status=overdue"
//                                     className="mt-1 inline-block text-[13px] font-semibold underline"
//                                 >
//                                     Voir les {overdue.length - toChase.length} autre{plural(overdue.length - toChase.length)}
//                                 </Link>
//                             )}
//                         </>
//                     )}
//                 </section>
//             </div>

//             <section className="rounded-[14px] border border-gray-200 bg-white p-5">
//                 <div className="mb-1 flex items-center justify-between">
//                     <h2 className="text-base font-bold">Dernières factures</h2>
//                     <Link href="/invoices" className="text-sm font-semibold underline">
//                         Tout voir
//                     </Link>
//                 </div>
//                 {recent.length === 0 ? (
//                     <p className="border-t border-gray-100 pt-4 text-sm text-gray-600">
//                         Vos factures apparaîtront ici.
//                     </p>
//                 ) : (
//                     recent.map((r) => {
//                         const ds = displayStatus(r, today)
//                         const total = Number(r.total)
//                         return (
//                             <div
//                                 key={r.id}
//                                 className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 py-3.5"
//                             >
//                                 <div>
//                                     <Link href={`/invoices/${r.id}`} className="text-sm font-bold underline-offset-2 hover:underline">
//                                         {r.number ?? 'Sans numéro'}
//                                     </Link>
//                                     <div className="text-[13px] text-gray-600">{names.get(r.customer_id) ?? '—'}</div>
//                                 </div>
//                                 <div className="flex items-center gap-3">
//                                     <StatusBadge status={ds} />
//                                     <b className="text-sm tabular-nums">
//                                         {ds === 'draft' && total === 0 ? '—' : money(total)}
//                                     </b>
//                                 </div>
//                             </div>
//                         )
//                     })
//                 )}
//             </section>
//         </>
//     )
// }