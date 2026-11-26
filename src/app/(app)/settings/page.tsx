import { createClient } from '@/lib/supabase/server'
import { getCurrentOrganization } from '@/lib/organization'
import { SettingsForm } from './settings-form'
import { LogoCard } from './logo-card'

function joinFrench(items: string[]) {
    if (items.length <= 1) return items.join('')
    return items.slice(0, -1).join(', ') + ' et ' + items[items.length - 1]
}

export default async function SettingsPage() {
    const current = await getCurrentOrganization()
    if (!current) return null // la mise en page redirige déjà vers /onboarding

    const supabase = await createClient()
    const [orgRes, invoicesRes] = await Promise.all([
        supabase
            .from('organizations')
            .select(
                'name, legal_name, address, phone, email, tax_id, registration_number, country, currency, default_tax_rate, payment_terms_days, invoice_prefix, next_invoice_number, payment_instructions, logo_url'
            )
            .eq('id', current.id)
            .single(),
        supabase
            .from('invoices')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', current.id),
    ])
    if (orgRes.error || !orgRes.data || invoicesRes.error) {
        throw new Error('Lecture des paramètres impossible')
    }
    const o = orgRes.data

    const missing: string[] = []
    if (!o.tax_id?.trim()) missing.push('le NIU')
    if (!o.registration_number?.trim()) missing.push('le RCCM')
    if (!o.address?.trim()) missing.push('l’adresse')

    return (
        <>
            <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
            <p className="mb-6 mt-1 text-muted">Personnalisez votre compte et vos factures.</p>

            {missing.length > 0 && (
                <div className="mb-4 rounded-2xl bg-warn-soft px-4 py-3.5 text-sm leading-relaxed text-warn">
                    <strong>Presque prêt.</strong> Il vous manque {joinFrench(missing)} pour pouvoir émettre
                    votre première facture.
                </div>
            )}

            <LogoCard logoUrl={o.logo_url ?? null} orgName={o.name} />

            <SettingsForm
                initial={{
                    name: o.name,
                    legal_name: o.legal_name ?? '',
                    address: o.address ?? '',
                    phone: o.phone ?? '',
                    email: o.email ?? '',
                    tax_id: o.tax_id ?? '',
                    registration_number: o.registration_number ?? '',
                    country: o.country,
                    currency: o.currency,
                    default_tax_rate: String(o.default_tax_rate).replace('.', ','),
                    payment_terms_days: String(o.payment_terms_days),
                    invoice_prefix: o.invoice_prefix,
                    payment_instructions: o.payment_instructions ?? '',
                }}
                currencyLocked={(invoicesRes.count ?? 0) > 0}
                year={new Date().getFullYear()}
                nextNumber={o.next_invoice_number}
            />
        </>
    )
}

// import { createClient } from '@/lib/supabase/server'
// import { getCurrentOrganization } from '@/lib/organization'
// import { SettingsForm } from './settings-form'
// import { LogoCard } from './logo-card'

// function joinFrench(items: string[]) {
//     if (items.length <= 1) return items.join('')
//     return items.slice(0, -1).join(', ') + ' et ' + items[items.length - 1]
// }

// export default async function SettingsPage() {
//     const current = await getCurrentOrganization()
//     if (!current) return null // la mise en page redirige déjà vers /onboarding

//     const supabase = await createClient()
//     const [orgRes, invoicesRes] = await Promise.all([
//         supabase
//             .from('organizations')
//             .select(
//                 'name, legal_name, address, phone, email, tax_id, registration_number, country, currency, default_tax_rate, payment_terms_days, invoice_prefix, next_invoice_number, payment_instructions, logo_url'
//             )
//             .eq('id', current.id)
//             .single(),
//         supabase
//             .from('invoices')
//             .select('id', { count: 'exact', head: true })
//             .eq('organization_id', current.id),
//     ])
//     if (orgRes.error || !orgRes.data || invoicesRes.error) {
//         throw new Error('Lecture des paramètres impossible')
//     }
//     const o = orgRes.data

//     const missing: string[] = []
//     if (!o.tax_id?.trim()) missing.push('le NIU')
//     if (!o.registration_number?.trim()) missing.push('le RCCM')
//     if (!o.address?.trim()) missing.push('l’adresse')

//     return (
//         <div className="max-w-[820px]">
//             <h1 className="text-3xl font-extrabold">Paramètres</h1>
//             <p className="mb-6 mt-1 text-sm text-gray-600">
//                 Les informations de votre entreprise et vos réglages de facturation.
//             </p>

//             {missing.length > 0 && (
//                 <div className="mb-6 rounded-xl bg-[#FDF3DF] px-4 py-3.5 text-[13px] leading-relaxed text-[#5C4210]">
//                     <strong>Presque prêt.</strong> Il vous manque {joinFrench(missing)} pour pouvoir émettre
//                     votre première facture.
//                 </div>
//             )}

//             <LogoCard logoUrl={o.logo_url ?? null} orgName={o.name} />

//             <SettingsForm
//                 initial={{
//                     name: o.name,
//                     legal_name: o.legal_name ?? '',
//                     address: o.address ?? '',
//                     phone: o.phone ?? '',
//                     email: o.email ?? '',
//                     tax_id: o.tax_id ?? '',
//                     registration_number: o.registration_number ?? '',
//                     country: o.country,
//                     currency: o.currency,
//                     default_tax_rate: String(o.default_tax_rate).replace('.', ','),
//                     payment_terms_days: String(o.payment_terms_days),
//                     invoice_prefix: o.invoice_prefix,
//                     payment_instructions: o.payment_instructions ?? '',
//                 }}
//                 currencyLocked={(invoicesRes.count ?? 0) > 0}
//                 year={new Date().getFullYear()}
//                 nextNumber={o.next_invoice_number}
//             />
//         </div>
//     )
// }