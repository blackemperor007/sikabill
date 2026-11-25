import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrganization } from '@/lib/organization'
import { addDays, todayISO } from '@/lib/invoices'
import { InvoiceForm } from '../invoice-form'
import { currencyDigits } from '@/lib/money'

export default async function NewInvoicePage() {
    const org = await getCurrentOrganization()
    if (!org) return null // la mise en page redirige déjà vers /onboarding

    const supabase = await createClient()
    const { data: customers, error } = await supabase
        .from('customers')
        .select('id, name')
        .eq('organization_id', org.id)
        .is('archived_at', null)
        .order('name')
    if (error) throw new Error('Lecture des clients impossible')

    const defaultTaxRate = String(org.default_tax_rate).replace('.', ',')
    const today = todayISO()

    return (
        <>
            <Link href="/invoices" className="mb-3 inline-block text-sm underline">
                ← Retour aux factures
            </Link>
            <h1 className="mb-6 text-3xl font-extrabold">Nouvelle facture</h1>

            {(customers ?? []).length === 0 ? (
                <div className="rounded-[14px] border border-gray-200 bg-white px-6 py-12 text-center">
                    <p className="font-semibold">Ajoutez d’abord un client.</p>
                    <p className="mt-1 text-sm text-gray-600">
                        Une facture est toujours adressée à un client.
                    </p>
                    <Link
                        href="/customers/new"
                        className="mt-4 inline-flex min-h-[44px] items-center rounded-[10px] bg-[#E0A030] px-5 font-bold text-[#1B2A41]"
                    >
                        + Nouveau client
                    </Link>
                </div>
            ) : (
                <InvoiceForm
                    currency={org.currency}
                    digits={currencyDigits(org.currency)}
                    customers={customers ?? []}
                    initial={{
                        customer_id: '',
                        issue_date: today,
                        due_date: addDays(today, org.payment_terms_days),
                        notes: '',
                        lines: [{ description: '', quantity: '1', unit_price: '', tax_rate: defaultTaxRate }],
                        defaultTaxRate,
                    }}
                />
            )}
        </>
    )
}