import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrganization } from '@/lib/organization'
import { displayStatus, formatDate, todayISO } from '@/lib/invoices'
import { isUuid } from '@/lib/validators'
import { StatusBadge } from '@/components/status-badge'
import { currencyDigits, formatMoney } from '@/lib/money'
import { InvoiceForm } from '../invoice-form'
import { DeleteDraftButton } from '../delete-draft-button'
import { minorToInput } from '@/lib/invoice-math'

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!isUuid(id)) notFound()

    const org = await getCurrentOrganization()
    if (!org) return null // la mise en page redirige déjà vers /onboarding

    const supabase = await createClient()
    const { data: inv, error } = await supabase
        .from('invoices')
        .select('id, number, status, customer_id, issue_date, due_date, notes, total')
        .eq('id', id)
        .eq('organization_id', org.id)
        .maybeSingle()
    if (error) throw new Error('Lecture de la facture impossible')
    if (!inv) notFound()

    // Facture émise, payée ou annulée : le détail arrive à l'étape 6.7
    if (inv.status !== 'draft') {
        return (
            <>
                <Link href="/invoices" className="mb-3 inline-block text-sm underline">
                    ← Retour aux factures
                </Link>
                <div className="mb-6 flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-extrabold">Facture {inv.number}</h1>
                    <StatusBadge status={displayStatus(inv, todayISO())} />
                </div>
                <div className="max-w-[720px] rounded-[14px] border border-gray-200 bg-white p-6 text-sm text-gray-600">
                    <p>
                        Échéance : {formatDate(inv.due_date)} · Montant :{' '}
                        <strong className="text-[#1B2A41]">{formatMoney(Number(inv.total), org.currency)}</strong>
                    </p>
                    <p className="mt-3">
                        Le détail des factures émises (aperçu, PDF, paiement, annulation) sera construit à
                        l’étape suivante.
                    </p>
                </div>
            </>
        )
    }

    const digits = currencyDigits(org.currency)
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

    const defaultTaxRate = String(org.default_tax_rate).replace('.', ',')
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