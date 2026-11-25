import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrganization } from '@/lib/organization'
import { formatMoney } from '@/lib/money'
import { displayStatus, formatDate, todayISO } from '@/lib/invoices'
import { StatusBadge } from '@/components/status-badge'

const FILTERS = [
    { key: 'all', label: 'Toutes' },
    { key: 'draft', label: 'Brouillons' },
    { key: 'issued', label: 'Émises' },
    { key: 'paid', label: 'Payées' },
    { key: 'overdue', label: 'En retard' },
] as const
type FilterKey = (typeof FILTERS)[number]['key']

export default async function InvoicesPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string }>
}) {
    const { status } = await searchParams
    const filter: FilterKey = FILTERS.some((f) => f.key === status) ? (status as FilterKey) : 'all'

    const org = await getCurrentOrganization()
    if (!org) return null // la mise en page redirige déjà vers /onboarding

    const supabase = await createClient()
    const [invoicesRes, customersRes] = await Promise.all([
        supabase
            .from('invoices')
            .select('id, number, status, due_date, paid_at, total, customer_id')
            .eq('organization_id', org.id)
            .order('created_at', { ascending: false }),
        supabase
            .from('customers')
            .select('id, name, archived_at')
            .eq('organization_id', org.id),
    ])
    if (invoicesRes.error || customersRes.error) {
        throw new Error('Lecture des factures impossible')
    }

    const today = todayISO()
    const customers = customersRes.data ?? []
    const names = new Map(customers.map((c) => [c.id, c.name]))
    const activeCustomers = customers.filter((c) => !c.archived_at).length

    // Indicateurs : encaissé ce mois, en attente (dans les délais), en retard
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    let collected = 0
    let pending = 0
    let late = 0

    const rows = (invoicesRes.data ?? []).map((inv) => {
        const ds = displayStatus(inv, today)
        const total = Number(inv.total)
        if (ds === 'paid' && inv.paid_at && new Date(inv.paid_at).getTime() >= monthStart) {
            collected += total
        }
        if (ds === 'issued') pending += total
        if (ds === 'overdue') late += total
        return { ...inv, ds, total }
    })

    const visible = filter === 'all' ? rows : rows.filter((r) => r.ds === filter)

    return (
        <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold">Factures</h1>
                    <p className="mt-1 text-sm text-gray-600">
                        Suivez ce qui est payé, en attente ou en retard.
                    </p>
                </div>
                <Link
                    href="/invoices/new"
                    className="inline-flex min-h-[44px] items-center rounded-[10px] bg-[#E0A030] px-5 text-[15px] font-bold text-[#1B2A41]"
                >
                    + Nouvelle facture
                </Link>
            </div>

            <div className="mb-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-[14px] border border-gray-200 bg-white p-[18px]">
                    <div className="text-[13px] text-gray-600">Encaissé ce mois</div>
                    <div className="mt-1.5 text-2xl font-extrabold">{formatMoney(collected, org.currency)}</div>
                </div>
                <div className="rounded-[14px] border border-gray-200 bg-white p-[18px]">
                    <div className="text-[13px] text-gray-600">En attente de paiement</div>
                    <div className="mt-1.5 text-2xl font-extrabold">{formatMoney(pending, org.currency)}</div>
                </div>
                <div className="rounded-[14px] border border-gray-200 bg-white p-[18px]">
                    <div className="text-[13px] font-semibold text-red-700">En retard</div>
                    <div className="mt-1.5 text-2xl font-extrabold">{formatMoney(late, org.currency)}</div>
                </div>
            </div>

            <nav aria-label="Filtrer par statut" className="mb-4 flex flex-wrap gap-2">
                {FILTERS.map((f) => {
                    const active = f.key === filter
                    return (
                        <Link
                            key={f.key}
                            href={f.key === 'all' ? '/invoices' : `/invoices?status=${f.key}`}
                            aria-current={active ? 'page' : undefined}
                            className={`inline-flex min-h-[44px] items-center rounded-full border px-3.5 text-[13px] font-medium ${active
                                    ? 'border-[#1B2A41] bg-[#1B2A41] text-white'
                                    : 'border-gray-300 bg-white text-[#1B2A41]'
                                }`}
                        >
                            {f.label}
                        </Link>
                    )
                })}
            </nav>

            <div className="overflow-x-auto rounded-[14px] border border-gray-200 bg-white">
                {visible.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        {rows.length === 0 ? (
                            <>
                                <p className="font-semibold">Vous n’avez pas encore de facture.</p>
                                <p className="mt-1 text-sm text-gray-600">
                                    {activeCustomers === 0 ? (
                                        <>
                                            Commencez par{' '}
                                            <Link href="/customers/new" className="font-semibold underline">
                                                ajouter un client
                                            </Link>
                                            , puis créez votre première facture.
                                        </>
                                    ) : (
                                        'Créez votre première facture avec le bouton ci-dessus.'
                                    )}
                                </p>
                            </>
                        ) : (
                            <p className="font-semibold">Aucune facture dans cette catégorie.</p>
                        )}
                    </div>
                ) : (
                    <table className="w-full min-w-[640px] border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 text-left text-xs font-semibold text-gray-600">
                                <th className="px-4 py-3">N°</th>
                                <th className="px-4 py-3">Client</th>
                                <th className="px-4 py-3">Échéance</th>
                                <th className="px-4 py-3">Statut</th>
                                <th className="px-4 py-3 text-right">Montant</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visible.map((r) => (
                                <tr key={r.id} className="border-b border-gray-100 last:border-0">
                                    <td className="px-4 py-3.5 font-semibold">
                                        <Link href={`/invoices/${r.id}`} className="underline-offset-2 hover:underline">
                                            {r.number ?? <span className="font-normal text-gray-600">Sans numéro</span>}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3.5">{names.get(r.customer_id) ?? '—'}</td>
                                    <td className="px-4 py-3.5">{formatDate(r.due_date)}</td>
                                    <td className="px-4 py-3.5">
                                        <StatusBadge status={r.ds} />
                                    </td>
                                    <td className="px-4 py-3.5 text-right font-semibold tabular-nums">
                                        {r.ds === 'draft' && r.total === 0 ? '—' : formatMoney(r.total, org.currency)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </>
    )
}