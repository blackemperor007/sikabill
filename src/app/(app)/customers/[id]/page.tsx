import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrganization } from '@/lib/organization'
import { isUuid } from '@/lib/validators'
import { CustomerForm } from '../customer-form'
import { setCustomerArchived } from '../action'

export default async function EditCustomerPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    if (!isUuid(id)) notFound()

    const org = await getCurrentOrganization()
    if (!org) return null // la mise en page redirige déjà vers /onboarding

    const supabase = await createClient()
    const { data: customer, error } = await supabase
        .from('customers')
        .select('id, name, email, phone, address, tax_id, archived_at')
        .eq('id', id)
        .eq('organization_id', org.id)
        .maybeSingle()
    if (error) throw new Error('Lecture du client impossible')
    if (!customer) notFound()

    const archived = Boolean(customer.archived_at)

    return (
        <>
            <Link
                href={archived ? '/customers?archived=1' : '/customers'}
                className="mb-3 inline-block text-sm underline"
            >
                ← Retour aux clients
            </Link>
            <h1 className="mb-6 text-3xl font-extrabold">{customer.name}</h1>

            <div className="max-w-[720px]">
                {archived && (
                    <div className="mb-4 rounded-xl bg-[#FDF3DF] px-4 py-3.5 text-[13px] leading-relaxed text-[#5C4210]">
                        Ce client est archivé : il n’apparaît plus dans votre liste de clients, mais ses
                        factures sont conservées.
                    </div>
                )}

                <CustomerForm customer={customer} />

                <section className="mt-8 rounded-[14px] border border-gray-200 bg-white p-6">
                    <h2 className="text-base font-bold">{archived ? 'Restaurer ce client' : 'Archiver ce client'}</h2>
                    <p className="mb-4 mt-1 text-[13px] leading-relaxed text-gray-600">
                        {archived
                            ? 'Il réapparaîtra dans votre liste de clients et pourra de nouveau recevoir des factures.'
                            : 'Il disparaîtra de votre liste sans toucher à ses anciennes factures. Vous pourrez le restaurer à tout moment.'}
                    </p>
                    <form action={setCustomerArchived}>
                        <input type="hidden" name="id" value={customer.id} />
                        <input type="hidden" name="archive" value={archived ? '0' : '1'} />
                        <button
                            type="submit"
                            className="min-h-[44px] rounded-[10px] border border-gray-300 px-4 text-sm font-semibold"
                        >
                            {archived ? 'Restaurer le client' : 'Archiver le client'}
                        </button>
                    </form>
                </section>
            </div>
        </>
    )
}