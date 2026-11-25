import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrganization } from '@/lib/organization'
import { currencyDigits, formatMoney } from '@/lib/money'
import { computeLine, minorToInput, prettyRate } from '@/lib/invoice-math'
import { daysBetween, displayStatus, formatDate, formatTimestamp, todayISO } from '@/lib/invoices'
import { isUuid } from '@/lib/validators'
import { StatusBadge } from '@/components/status-badge'
import { InvoiceForm } from '../invoice-form'
import { DeleteDraftButton } from '../delete-draft-button'
import { PayButton, VoidButton } from '../invoice-actions'

type Snapshot = Record<string, string | null | undefined>
const plural = (n: number) => (n > 1 ? 's' : '')

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!isUuid(id)) notFound()

    const org = await getCurrentOrganization()
    if (!org) return null // la mise en page redirige déjà vers /onboarding

    const supabase = await createClient()
    const { data: inv, error } = await supabase
        .from('invoices')
        .select(
            'id, number, status, customer_id, issue_date, due_date, paid_at, notes, subtotal, tax_total, total, seller_snapshot, customer_snapshot, created_at, updated_at'
        )
        .eq('id', id)
        .eq('organization_id', org.id)
        .maybeSingle()
    if (error) throw new Error('Lecture de la facture impossible')
    if (!inv) notFound()

    const digits = currencyDigits(org.currency)
    const defaultTaxRate = String(org.default_tax_rate).replace('.', ',')

    // ---------- Brouillon : éditeur ----------
    if (inv.status === 'draft') {
        const [itemsRes, customersRes] = await Promise.all([
            supabase
                .from('invoice_items')
                .select('description, quantity, unit_price, tax_rate')
                .eq('invoice_id', inv.id)
                .order('position'),
            supabase
                .from('customers')
                .select('id, name')
                .eq('organization_id', org.id)
                .is('archived_at', null)
                .order('name'),
        ])
        if (itemsRes.error || customersRes.error) throw new Error('Lecture du brouillon impossible')

        const customers = customersRes.data ?? []
        const lines = (itemsRes.data ?? []).map((it) => ({
            description: it.description,
            quantity: String(Number(it.quantity)).replace('.', ','),
            unit_price: minorToInput(Number(it.unit_price), digits),
            tax_rate: String(Number(it.tax_rate)).replace('.', ','),
        }))

        return (
            <>
                <Link href="/invoices" className="mb-3 inline-block text-sm underline">
                    ← Retour aux factures
                </Link>
                <div className="mb-6 flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-extrabold">Brouillon de facture</h1>
                    <StatusBadge status="draft" />
                </div>

                {!customers.some((c) => c.id === inv.customer_id) && (
                    <div className="mb-4 rounded-xl bg-[#FDF3DF] px-4 py-3.5 text-[13px] leading-relaxed text-[#5C4210]">
                        Le client de ce brouillon est archivé. Choisissez un client actif pour pouvoir
                        enregistrer.
                    </div>
                )}

                <InvoiceForm
                    invoiceId={inv.id}
                    currency={org.currency}
                    digits={digits}
                    customers={customers}
                    initial={{
                        customer_id: customers.some((c) => c.id === inv.customer_id) ? inv.customer_id : '',
                        issue_date: inv.issue_date ?? '',
                        due_date: inv.due_date ?? '',
                        notes: inv.notes ?? '',
                        lines: lines.length
                            ? lines
                            : [{ description: '', quantity: '1', unit_price: '', tax_rate: defaultTaxRate }],
                        defaultTaxRate,
                    }}
                />

                <div className="mt-8">
                    <DeleteDraftButton id={inv.id} />
                </div>
            </>
        )
    }

    // ---------- Facture émise, payée ou annulée : détail ----------
    const itemsRes = await supabase
        .from('invoice_items')
        .select('description, quantity, unit_price, tax_rate')
        .eq('invoice_id', inv.id)
        .order('position')
    if (itemsRes.error) throw new Error('Lecture des lignes impossible')

    const today = todayISO()
    const ds = displayStatus(inv, today)
    const money = (n: number) => formatMoney(n, org.currency)
    const seller = (inv.seller_snapshot ?? {}) as Snapshot
    const buyer = (inv.customer_snapshot ?? {}) as Snapshot

    const lines = (itemsRes.data ?? []).map((it) => {
        const { line } = computeLine(
            {
                description: it.description,
                quantity: String(Number(it.quantity)),
                unit_price: minorToInput(Number(it.unit_price), digits),
                tax_rate: String(Number(it.tax_rate)),
            },
            digits
        )
        return {
            description: it.description,
            qty: String(Number(it.quantity)).replace('.', ','),
            unit: Number(it.unit_price),
            rate: line ? prettyRate(line.rate100) : String(Number(it.tax_rate)).replace('.', ','),
            ht: line ? Number(line.ht) : 0,
        }
    })
    const rates = Array.from(new Set(lines.map((l) => l.rate)))
    const taxLabel = rates.length === 1 ? `TVA (${rates[0]} %)` : 'TVA'

    // Texte d'échéance selon la situation
    let dueText = formatDate(inv.due_date)
    if (inv.status === 'paid') dueText = `Payée le ${formatTimestamp(inv.paid_at)}`
    else if (inv.status === 'void') dueText = 'Annulée'
    else if (inv.due_date) {
        const days = daysBetween(today, inv.due_date)
        if (days < 0) dueText += `, en retard de ${-days} jour${plural(-days)}`
        else if (days === 0) dueText += ', aujourd’hui'
        else dueText += `, dans ${days} jour${plural(days)}`
    }

    const history: { date: string; text: string }[] = [
        { date: formatTimestamp(inv.created_at), text: 'Brouillon créé' },
    ]
    if (inv.number)
        history.push({
            date: formatDate(inv.issue_date),
            text: `Facture émise, numéro ${inv.number} attribué`,
        })
    if (inv.paid_at) history.push({ date: formatTimestamp(inv.paid_at), text: 'Paiement enregistré' })
    if (inv.status === 'void')
        history.push({ date: formatTimestamp(inv.updated_at), text: 'Facture annulée' })
    history.reverse()

    const idLine = [
        seller.tax_id && `NIU : ${seller.tax_id}`,
        seller.registration_number && `RCCM : ${seller.registration_number}`,
    ]
        .filter(Boolean)
        .join(' · ')

    return (
        <>
            <Link href="/invoices" className="mb-3 inline-block text-sm underline">
                ← Retour aux factures
            </Link>

            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-extrabold">Facture {inv.number}</h1>
                    <StatusBadge status={ds} />
                </div>
                <div className="flex flex-wrap items-start gap-2.5">
                    <a
                        href={`/invoices/${inv.id}/pdf`}
                        className="inline-flex min-h-[44px] items-center rounded-[10px] border border-gray-300 bg-white px-[18px] text-sm font-semibold"
                    >
                        Télécharger le PDF
                    </a>
                    {inv.status === 'issued' && <PayButton id={inv.id} />}
                </div>
            </div>

            <div className="flex flex-wrap items-start gap-6">
                <section className="min-w-0 flex-[2_1_560px] rounded-[14px] border border-gray-200 bg-white p-8">
                    <div className="mb-7 flex flex-wrap justify-between gap-5">
                        <div>
                            <div className="text-xl font-extrabold">{seller.name ?? org.name}</div>
                            <div className="text-[13px] leading-relaxed text-gray-600">
                                {seller.legal_name && seller.legal_name !== seller.name && (
                                    <div>{seller.legal_name}</div>
                                )}
                                {seller.address && <div className="whitespace-pre-line">{seller.address}</div>}
                                {(seller.phone || seller.email) && (
                                    <div>{[seller.phone, seller.email].filter(Boolean).join(' · ')}</div>
                                )}
                                {idLine && <div>{idLine}</div>}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-[22px] font-extrabold">FACTURE</div>
                            <div className="text-[13px] leading-relaxed text-gray-600">
                                <div>N° {inv.number}</div>
                                <div>Émise le {formatDate(inv.issue_date)}</div>
                                <div>Échéance : {formatDate(inv.due_date)}</div>
                            </div>
                        </div>
                    </div>

                    <div className="mb-6">
                        <p className="mb-0.5 text-xs font-medium text-gray-600">Facturé à</p>
                        <div className="text-sm leading-relaxed">
                            <b>{buyer.name ?? '—'}</b>
                            {buyer.address && <div className="whitespace-pre-line">{buyer.address}</div>}
                            {buyer.tax_id && <div>NIU : {buyer.tax_id}</div>}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[480px] border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 text-left text-xs font-semibold text-gray-600">
                                    <th className="py-2.5">Description</th>
                                    <th className="py-2.5 text-right">Qté</th>
                                    <th className="py-2.5 text-right">Prix unitaire</th>
                                    <th className="py-2.5 text-right">TVA</th>
                                    <th className="py-2.5 text-right">Total HT</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lines.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-4 text-gray-600">
                                            Aucune ligne enregistrée pour cette facture.
                                        </td>
                                    </tr>
                                ) : (
                                    lines.map((l, i) => (
                                        <tr key={i} className="border-b border-gray-100">
                                            <td className="py-3">{l.description}</td>
                                            <td className="py-3 text-right tabular-nums">{l.qty}</td>
                                            <td className="py-3 text-right tabular-nums">{money(l.unit)}</td>
                                            <td className="py-3 text-right tabular-nums">{l.rate} %</td>
                                            <td className="py-3 text-right tabular-nums">{money(l.ht)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="ml-auto mt-5 max-w-[320px]">
                        <div className="my-2 flex justify-between text-sm tabular-nums">
                            <span>Total HT</span>
                            <span>{money(Number(inv.subtotal))}</span>
                        </div>
                        <div className="my-2 flex justify-between text-sm tabular-nums">
                            <span>{taxLabel}</span>
                            <span>{money(Number(inv.tax_total))}</span>
                        </div>
                        <div className="mt-3 flex justify-between border-t border-gray-200 pt-3 text-lg font-extrabold tabular-nums">
                            <span>Total TTC</span>
                            <span>{money(Number(inv.total))}</span>
                        </div>
                    </div>

                    {(inv.notes || seller.payment_instructions) && (
                        <div className="mt-7 space-y-2 text-[13px] leading-relaxed text-gray-600">
                            {inv.notes && <p className="whitespace-pre-line">{inv.notes}</p>}
                            {seller.payment_instructions && (
                                <p className="whitespace-pre-line">{seller.payment_instructions}</p>
                            )}
                        </div>
                    )}
                </section>

                <aside className="flex min-w-0 flex-[1_1_280px] flex-col gap-6">
                    <section className="rounded-[14px] border border-gray-200 bg-white p-5">
                        <h2 className="mb-3.5 text-base font-bold">Informations</h2>
                        <p className="text-xs font-medium text-gray-600">Client</p>
                        <p className="mb-3.5 text-sm font-medium">{buyer.name ?? '—'}</p>
                        <p className="text-xs font-medium text-gray-600">
                            {inv.status === 'paid' ? 'Paiement' : 'Échéance'}
                        </p>
                        <p className={`text-sm font-medium ${ds === 'overdue' ? 'text-red-700' : ''}`}>
                            {dueText}
                        </p>
                        {inv.status !== 'void' && (
                            <>
                                <p className="mt-3.5 text-xs font-medium text-gray-600">
                                    {inv.status === 'paid' ? 'Montant encaissé' : 'Montant à encaisser'}
                                </p>
                                <p className="text-lg font-extrabold">{money(Number(inv.total))}</p>
                            </>
                        )}
                    </section>

                    <section className="rounded-[14px] border border-gray-200 bg-white p-5">
                        <h2 className="mb-3.5 text-base font-bold">Historique</h2>
                        {history.map((h, i) => (
                            <div key={i} className={i < history.length - 1 ? 'mb-3.5' : ''}>
                                <p className="text-xs font-medium text-gray-600">{h.date}</p>
                                <p className="text-sm">{h.text}</p>
                            </div>
                        ))}
                    </section>

                    <section className="rounded-[14px] border border-gray-200 bg-white p-5">
                        {inv.status === 'issued' ? (
                            <>
                                <p className="mb-3 text-[13px] leading-relaxed text-gray-600">
                                    Cette facture est émise, elle n’est plus modifiable. En cas d’erreur, annulez-la
                                    puis créez-en une nouvelle.
                                </p>
                                <VoidButton id={inv.id} />
                            </>
                        ) : inv.status === 'paid' ? (
                            <p className="text-[13px] leading-relaxed text-gray-600">
                                Cette facture est payée : elle ne peut plus être modifiée ni annulée.
                            </p>
                        ) : (
                            <p className="text-[13px] leading-relaxed text-gray-600">
                                Cette facture est annulée. Elle reste conservée avec son numéro, pour que votre
                                numérotation reste continue.
                            </p>
                        )}
                    </section>
                </aside>
            </div>
        </>
    )
}