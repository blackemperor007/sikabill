import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrganization } from '@/lib/organization'
import { formatMoney } from '@/lib/money'
import { daysBetween, displayStatus, todayISO } from '@/lib/invoices'
import { initials, plural, shortDate, shortTimestamp } from '@/lib/format'
import { isUuid } from '@/lib/validators'
import { btn, cardClass } from '@/lib/ui'
import { StatusBadge, type DisplayStatus } from '@/components/status-badge'
import { CustomerForm } from '../customer-form'
import { setCustomerArchived } from '../action'
import { IconDoc } from '@/components/icon'

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!isUuid(id)) notFound()

    const org = await getCurrentOrganization()
    if (!org) return null // la mise en page redirige déjà vers /onboarding

    const supabase = await createClient()
    const [custRes, invRes] = await Promise.all([
        supabase
            .from('customers')
            .select('id, name, email, phone, address, tax_id, archived_at')
            .eq('id', id)
            .eq('organization_id', org.id)
            .maybeSingle(),
        supabase
            .from('invoices')
            .select('id, number, status, issue_date, due_date, paid_at, total')
            .eq('customer_id', id)
            .eq('organization_id', org.id)
            .order('created_at', { ascending: false }),
    ])
    if (custRes.error || invRes.error) throw new Error('Lecture du client impossible')
    const customer = custRes.data
    if (!customer) notFound()

    const money = (n: number) => formatMoney(n, org.currency)
    const today = todayISO()
    const archived = Boolean(customer.archived_at)
    const invoices = invRes.data ?? []

    // Statistiques du client
    let billed = 0
    let billedCount = 0
    let due = 0
    let pendingCount = 0
    let overdue = false
    let paidCount = 0
    const paidDelays: number[] = []
    let lastPaid: string | null = null
    for (const inv of invoices) {
        const total = Number(inv.total)
        if (inv.status === 'issued' || inv.status === 'paid') {
            billed += total
            billedCount += 1
        }
        if (inv.status === 'issued') {
            due += total
            pendingCount += 1
            if (inv.due_date && inv.due_date < today) overdue = true
        }
        if (inv.status === 'paid') {
            paidCount += 1
            if (inv.paid_at && inv.issue_date) {
                paidDelays.push(Math.max(0, daysBetween(inv.issue_date, inv.paid_at.slice(0, 10))))
            }
            if (inv.paid_at && (!lastPaid || inv.paid_at > lastPaid)) lastPaid = inv.paid_at
        }
    }
    const avgDelay = paidDelays.length
        ? Math.round(paidDelays.reduce((a, b) => a + b, 0) / paidDelays.length)
        : null
    const status: DisplayStatus | null = overdue
        ? 'overdue'
        : due > 0
            ? 'issued'
            : paidCount > 0
                ? 'paid'
                : null

    return (
        <>
            <Link
                href={archived ? '/customers?archived=1' : '/customers'}
                className="mb-3 inline-block text-sm font-semibold underline underline-offset-2"
            >
                ← Retour aux clients
            </Link>

            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{customer.name}</h1>
                    <p className="mt-1 text-muted">Fiche client</p>
                </div>
                {!archived && (
                    <Link href={`/invoices/new?customer=${customer.id}`} className={btn('primary')}>
                        + Créer une facture
                    </Link>
                )}
            </div>

            {archived && (
                <div className="mb-4 rounded-2xl bg-warn-soft px-4 py-3.5 text-sm text-warn">
                    Ce client est archivé : il n’apparaît plus dans votre liste de clients, mais ses factures
                    sont conservées.
                </div>
            )}

            <section className={`${cardClass} mb-4`}>
                <div className="flex flex-wrap items-start gap-6">
                    <div className="flex items-center gap-4">
                        <span
                            aria-hidden="true"
                            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-warn-soft text-lg font-bold text-warn"
                        >
                            {initials(customer.name)}
                        </span>
                        <div>
                            <p className="font-display text-xl font-bold">{customer.name}</p>
                            {status && (
                                <div className="mt-1.5">
                                    <StatusBadge status={status} />
                                </div>
                            )}
                        </div>
                    </div>
                    <dl className="grid flex-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                        <div>
                            <dt className="text-muted">E-mail</dt>
                            <dd className="font-semibold">{customer.email ?? '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-muted">Téléphone</dt>
                            <dd className="font-semibold">{customer.phone ?? '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-muted">Adresse</dt>
                            <dd className="whitespace-pre-line font-semibold">{customer.address ?? '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-muted">NIU</dt>
                            <dd className="font-semibold">{customer.tax_id ?? '—'}</dd>
                        </div>
                    </dl>
                </div>
            </section>

            <div className="mb-4 grid gap-4 md:grid-cols-3">
                <div className={cardClass}>
                    <p className="text-sm text-muted">Total facturé</p>
                    <p className="mt-2 font-display text-[28px] font-bold leading-tight tracking-tight">
                        {money(billed)}
                    </p>
                    <p className="mt-1.5 text-sm font-semibold text-muted">
                        {billedCount} facture{plural(billedCount)}
                    </p>
                </div>
                <div className="rounded-3xl bg-ink p-6 text-white">
                    <p className="text-sm text-white/75">Solde dû</p>
                    <p className="mt-2 font-display text-[28px] font-bold leading-tight tracking-tight">
                        {money(due)}
                    </p>
                    <p className="mt-1.5 text-sm text-white/75">
                        {pendingCount === 0
                            ? 'Aucune facture en attente'
                            : `${pendingCount} facture${plural(pendingCount)} en attente`}
                    </p>
                </div>
                <div className={cardClass}>
                    <p className="text-sm text-muted">Délai moyen de paiement</p>
                    <p className="mt-2 font-display text-[28px] font-bold leading-tight tracking-tight">
                        {avgDelay === null ? '—' : `${avgDelay} jour${plural(avgDelay)}`}
                    </p>
                    <p className="mt-1.5 text-sm font-semibold text-muted">
                        {lastPaid
                            ? `Dernier paiement le ${shortTimestamp(lastPaid)}`
                            : 'Aucun paiement pour le moment'}
                    </p>
                </div>
            </div>

            <section className={`${cardClass} mb-4`}>
                <h2 className="mb-2 font-display text-lg font-bold">Factures du client</h2>
                {invoices.length === 0 ? (
                    <p className="border-t border-mist pt-4 text-sm text-muted">
                        Aucune facture pour ce client.
                    </p>
                ) : (
                    invoices.map((inv) => {
                        const ds = displayStatus(inv, today)
                        const total = Number(inv.total)
                        return (
                            <div
                                key={inv.id}
                                className="flex flex-wrap items-center justify-between gap-3 border-t border-mist py-3.5"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mist">
                                        <IconDoc width={18} height={18} />
                                    </span>
                                    <div>
                                        <Link
                                            href={`/invoices/${inv.id}`}
                                            className="font-bold underline-offset-2 hover:underline"
                                        >
                                            {inv.number ? `Facture ${inv.number}` : 'Brouillon'}
                                        </Link>
                                        <p className="text-sm text-muted">{shortDate(inv.issue_date) ?? 'Pas encore émise'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <StatusBadge status={ds} />
                                    <b className="font-display tabular-nums">
                                        {ds === 'draft' && total === 0 ? '—' : money(total)}
                                    </b>
                                </div>
                            </div>
                        )
                    })
                )}
            </section>

            <section className={`${cardClass} mb-4 max-w-[720px]`}>
                <h2 className="mb-4 font-display text-lg font-bold">Modifier le client</h2>
                <CustomerForm customer={customer} />
            </section>

            <section className={`${cardClass} max-w-[720px]`}>
                <h2 className="font-display text-lg font-bold">
                    {archived ? 'Restaurer ce client' : 'Archiver ce client'}
                </h2>
                <p className="mb-4 mt-1 text-sm leading-relaxed text-muted">
                    {archived
                        ? 'Il réapparaîtra dans votre liste de clients et pourra de nouveau recevoir des factures.'
                        : 'Il disparaîtra de votre liste sans toucher à ses anciennes factures. Vous pourrez le restaurer à tout moment.'}
                </p>
                <form action={setCustomerArchived}>
                    <input type="hidden" name="id" value={customer.id} />
                    <input type="hidden" name="archive" value={archived ? '0' : '1'} />
                    <button type="submit" className={btn('outline', 'sm')}>
                        {archived ? 'Restaurer le client' : 'Archiver le client'}
                    </button>
                </form>
            </section>
        </>
    )
}

// import Link from 'next/link'
// import { notFound } from 'next/navigation'
// import { createClient } from '@/lib/supabase/server'
// import { getCurrentOrganization } from '@/lib/organization'
// import { isUuid } from '@/lib/validators'
// import { CustomerForm } from '../customer-form'
// import { setCustomerArchived } from '../action'

// export default async function EditCustomerPage({
//     params,
// }: {
//     params: Promise<{ id: string }>
// }) {
//     const { id } = await params
//     if (!isUuid(id)) notFound()

//     const org = await getCurrentOrganization()
//     if (!org) return null // la mise en page redirige déjà vers /onboarding

//     const supabase = await createClient()
//     const { data: customer, error } = await supabase
//         .from('customers')
//         .select('id, name, email, phone, address, tax_id, archived_at')
//         .eq('id', id)
//         .eq('organization_id', org.id)
//         .maybeSingle()
//     if (error) throw new Error('Lecture du client impossible')
//     if (!customer) notFound()

//     const archived = Boolean(customer.archived_at)

//     return (
//         <>
//             <Link
//                 href={archived ? '/customers?archived=1' : '/customers'}
//                 className="mb-3 inline-block text-sm underline"
//             >
//                 ← Retour aux clients
//             </Link>
//             <h1 className="mb-6 text-3xl font-extrabold">{customer.name}</h1>

//             <div className="max-w-[720px]">
//                 {archived && (
//                     <div className="mb-4 rounded-xl bg-[#FDF3DF] px-4 py-3.5 text-[13px] leading-relaxed text-[#5C4210]">
//                         Ce client est archivé : il n’apparaît plus dans votre liste de clients, mais ses
//                         factures sont conservées.
//                     </div>
//                 )}

//                 <CustomerForm customer={customer} />

//                 <section className="mt-8 rounded-[14px] border border-gray-200 bg-white p-6">
//                     <h2 className="text-base font-bold">{archived ? 'Restaurer ce client' : 'Archiver ce client'}</h2>
//                     <p className="mb-4 mt-1 text-[13px] leading-relaxed text-gray-600">
//                         {archived
//                             ? 'Il réapparaîtra dans votre liste de clients et pourra de nouveau recevoir des factures.'
//                             : 'Il disparaîtra de votre liste sans toucher à ses anciennes factures. Vous pourrez le restaurer à tout moment.'}
//                     </p>
//                     <form action={setCustomerArchived}>
//                         <input type="hidden" name="id" value={customer.id} />
//                         <input type="hidden" name="archive" value={archived ? '0' : '1'} />
//                         <button
//                             type="submit"
//                             className="min-h-[44px] rounded-[10px] border border-gray-300 px-4 text-sm font-semibold"
//                         >
//                             {archived ? 'Restaurer le client' : 'Archiver le client'}
//                         </button>
//                     </form>
//                 </section>
//             </div>
//         </>
//     )
// }