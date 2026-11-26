'use client'

import { useActionState, useState } from 'react'
import { saveSettings, type SettingsState, type SettingsValues } from './actions'
import { COUNTRIES, CURRENCIES } from '@/lib/countries'
import { btn, cardClass, inputClass, labelClass } from '@/lib/ui'

function Required() {
    return (
        <span className="ml-2 rounded-full bg-warn-soft px-2 py-0.5 text-[11px] font-bold text-warn">
            Requis pour émettre
        </span>
    )
}

function Card({
    title,
    subtitle,
    children,
}: {
    title: string
    subtitle: string
    children: React.ReactNode
}) {
    return (
        <section className={cardClass}>
            <h2 className="font-display text-lg font-bold">{title}</h2>
            <p className="mb-5 mt-1 text-sm text-muted">{subtitle}</p>
            {children}
        </section>
    )
}

export function SettingsForm({
    initial,
    currencyLocked,
    year,
    nextNumber,
}: {
    initial: SettingsValues
    currencyLocked: boolean
    year: number
    nextNumber: number
}) {
    const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettings, {})
    const v = state.values ?? initial
    const [prefix, setPrefix] = useState(initial.invoice_prefix)
    const preview = `${prefix || '…'}${year}-${String(nextNumber).padStart(3, '0')}`

    return (
        <form action={action} className="mt-4">
            <div className="grid items-start gap-4 lg:grid-cols-2">
                <div className="flex flex-col gap-4">
                    <Card title="Profil de l’entreprise" subtitle="Ces informations apparaissent en en-tête de vos factures.">
                        <div className="mb-4">
                            <label htmlFor="name" className={labelClass}>Nom de l’entreprise</label>
                            <input id="name" name="name" required maxLength={200} defaultValue={v.name} className={inputClass} />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="legal_name" className={labelClass}>Raison sociale</label>
                            <input id="legal_name" name="legal_name" placeholder="Nom légal complet" defaultValue={v.legal_name} className={inputClass} />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="email" className={labelClass}>E-mail</label>
                            <input id="email" name="email" type="email" placeholder="vous@entreprise.com" defaultValue={v.email} className={inputClass} />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="phone" className={labelClass}>Téléphone</label>
                            <input id="phone" name="phone" placeholder="+237 6 00 00 00 00" defaultValue={v.phone} className={inputClass} />
                        </div>
                        <div>
                            <label htmlFor="address" className={labelClass}>Adresse<Required /></label>
                            <textarea id="address" name="address" rows={3} placeholder="Rue, ville, pays" defaultValue={v.address} className={`${inputClass} py-3`} />
                        </div>
                    </Card>

                    <Card title="Identifiants légaux" subtitle="Obligatoires sur une facture : à renseigner avant d’émettre la première.">
                        <div className="mb-4">
                            <label htmlFor="tax_id" className={labelClass}>NIU<Required /></label>
                            <input id="tax_id" name="tax_id" placeholder="M0123456789A" defaultValue={v.tax_id} className={inputClass} />
                        </div>
                        <div>
                            <label htmlFor="registration_number" className={labelClass}>RCCM<Required /></label>
                            <input id="registration_number" name="registration_number" placeholder="RC/DLA/2024/A/0000" defaultValue={v.registration_number} className={inputClass} />
                        </div>
                    </Card>
                </div>

                <Card title="Facturation" subtitle="Valeurs proposées par défaut à chaque nouvelle facture.">
                    <div className="mb-4">
                        <label htmlFor="country" className={labelClass}>Pays</label>
                        <select id="country" name="country" defaultValue={v.country} className={inputClass}>
                            {COUNTRIES.map((c) => (
                                <option key={c.code} value={c.code}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="mb-4">
                        <label htmlFor="currency" className={labelClass}>Devise</label>
                        <select
                            id="currency"
                            name={currencyLocked ? undefined : 'currency'}
                            defaultValue={v.currency}
                            disabled={currencyLocked}
                            className={inputClass}
                        >
                            {CURRENCIES.map((c) => (
                                <option key={c.code} value={c.code}>{c.label}</option>
                            ))}
                        </select>
                        {currencyLocked && <input type="hidden" name="currency" value={v.currency} />}
                        {currencyLocked && (
                            <p className="mt-1.5 text-xs text-muted">
                                La devise ne peut plus être modifiée : vous avez déjà des factures.
                            </p>
                        )}
                    </div>
                    <div className="mb-4">
                        <label htmlFor="invoice_prefix" className={labelClass}>Préfixe de numérotation</label>
                        <input
                            id="invoice_prefix"
                            name="invoice_prefix"
                            required
                            maxLength={6}
                            value={prefix}
                            onChange={(e) => setPrefix(e.target.value)}
                            className={inputClass}
                        />
                        <p className="mt-1.5 text-xs text-muted">
                            Prochain numéro : <strong className="text-ink">{preview}</strong>. Le compteur est
                            continu et ne se modifie pas à la main.
                        </p>
                    </div>
                    <div className="mb-4">
                        <label htmlFor="payment_terms_days" className={labelClass}>Délai de paiement par défaut (jours)</label>
                        <input id="payment_terms_days" name="payment_terms_days" required inputMode="numeric" defaultValue={v.payment_terms_days} className={inputClass} />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="default_tax_rate" className={labelClass}>TVA par défaut (%)</label>
                        <input id="default_tax_rate" name="default_tax_rate" required inputMode="decimal" defaultValue={v.default_tax_rate} className={inputClass} />
                    </div>
                    <div>
                        <label htmlFor="payment_instructions" className={labelClass}>Instructions de paiement</label>
                        <textarea
                            id="payment_instructions"
                            name="payment_instructions"
                            rows={3}
                            maxLength={1000}
                            placeholder="Virement, Mobile Money… Indiquez le numéro de facture en référence."
                            defaultValue={v.payment_instructions}
                            className={`${inputClass} py-3`}
                        />
                    </div>
                </Card>
            </div>

            {state.error && (
                <p role="alert" className="mt-4 rounded-xl bg-bad-soft px-4 py-3 text-sm font-semibold text-bad">
                    {state.error}
                </p>
            )}
            {state.saved && (
                <p role="status" className="mt-4 rounded-xl bg-ok-soft px-4 py-3 text-sm font-semibold text-ok">
                    Modifications enregistrées.
                </p>
            )}

            <button type="submit" disabled={pending} className={`${btn('primary')} mt-5`}>
                {pending ? 'Enregistrement…' : 'Enregistrer les modifications'}
            </button>
        </form>
    )
}


// 'use client'

// import { useActionState, useState } from 'react'
// import { saveSettings, type SettingsState, type SettingsValues } from './actions'
// import { COUNTRIES, CURRENCIES } from '@/lib/countries'

// const inputClass =
//     'min-h-[46px] w-full rounded-[10px] border border-gray-300 bg-white px-3 text-[15px] disabled:bg-gray-100 disabled:text-gray-500'
// const labelClass = 'mb-1.5 block text-sm font-medium text-gray-600'

// function Required() {
//     return (
//         <span className="ml-2 rounded-full bg-[#FDF3DF] px-2 py-0.5 text-[11px] font-semibold text-[#8A5A00]">
//             Requis pour émettre
//         </span>
//     )
// }

// function Card({
//     title,
//     subtitle,
//     children,
// }: {
//     title: string
//     subtitle: string
//     children: React.ReactNode
// }) {
//     return (
//         <section className="mb-6 rounded-[14px] border border-gray-200 bg-white p-6">
//             <h2 className="text-[17px] font-bold">{title}</h2>
//             <p className="mb-5 mt-1 text-[13px] text-gray-600">{subtitle}</p>
//             {children}
//         </section>
//     )
// }

// export function SettingsForm({
//     initial,
//     currencyLocked,
//     year,
//     nextNumber,
// }: {
//     initial: SettingsValues
//     currencyLocked: boolean
//     year: number
//     nextNumber: number
// }) {
//     const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettings, {})
//     const v = state.values ?? initial
//     const [prefix, setPrefix] = useState(initial.invoice_prefix)
//     const preview = `${prefix || '…'}${year}-${String(nextNumber).padStart(3, '0')}`

//     return (
//         <form action={action}>
//             <Card title="Identité de l’entreprise" subtitle="Ces informations apparaissent en en-tête de vos factures.">
//                 <div className="grid gap-x-4 sm:grid-cols-2">
//                     <div className="mb-4">
//                         <label htmlFor="name" className={labelClass}>Nom commercial</label>
//                         <input id="name" name="name" required maxLength={200} defaultValue={v.name} className={inputClass} />
//                     </div>
//                     <div className="mb-4">
//                         <label htmlFor="legal_name" className={labelClass}>Raison sociale</label>
//                         <input id="legal_name" name="legal_name" placeholder="Atelier Ndongo SARL" defaultValue={v.legal_name} className={inputClass} />
//                     </div>
//                 </div>
//                 <div className="mb-4">
//                     <label htmlFor="address" className={labelClass}>Adresse<Required /></label>
//                     <textarea id="address" name="address" rows={3} placeholder="Rue, ville, pays" defaultValue={v.address} className={`${inputClass} py-2.5`} />
//                 </div>
//                 <div className="grid gap-x-4 sm:grid-cols-2">
//                     <div className="mb-1">
//                         <label htmlFor="phone" className={labelClass}>Téléphone</label>
//                         <input id="phone" name="phone" placeholder="+237 6 00 00 00 00" defaultValue={v.phone} className={inputClass} />
//                     </div>
//                     <div className="mb-1">
//                         <label htmlFor="email" className={labelClass}>E-mail de contact</label>
//                         <input id="email" name="email" type="email" placeholder="contact@exemple.com" defaultValue={v.email} className={inputClass} />
//                     </div>
//                 </div>
//             </Card>

//             <Card title="Identifiants légaux" subtitle="Obligatoires sur une facture : à renseigner avant d’émettre la première.">
//                 <div className="grid gap-x-4 sm:grid-cols-2">
//                     <div>
//                         <label htmlFor="tax_id" className={labelClass}>NIU<Required /></label>
//                         <input id="tax_id" name="tax_id" placeholder="M0123456789A" defaultValue={v.tax_id} className={inputClass} />
//                     </div>
//                     <div>
//                         <label htmlFor="registration_number" className={labelClass}>RCCM<Required /></label>
//                         <input id="registration_number" name="registration_number" placeholder="RC/DLA/2024/A/0000" defaultValue={v.registration_number} className={inputClass} />
//                     </div>
//                 </div>
//             </Card>

//             <Card title="Facturation" subtitle="Valeurs proposées par défaut à chaque nouvelle facture.">
//                 <div className="grid gap-x-4 sm:grid-cols-2">
//                     <div className="mb-4">
//                         <label htmlFor="country" className={labelClass}>Pays</label>
//                         <select id="country" name="country" defaultValue={v.country} className={inputClass}>
//                             {COUNTRIES.map((c) => (
//                                 <option key={c.code} value={c.code}>{c.name}</option>
//                             ))}
//                         </select>
//                     </div>
//                     <div className="mb-4">
//                         <label htmlFor="currency" className={labelClass}>Devise</label>
//                         <select
//                             id="currency"
//                             name={currencyLocked ? undefined : 'currency'}
//                             defaultValue={v.currency}
//                             disabled={currencyLocked}
//                             className={inputClass}
//                         >
//                             {CURRENCIES.map((c) => (
//                                 <option key={c.code} value={c.code}>{c.label}</option>
//                             ))}
//                         </select>
//                         {currencyLocked && <input type="hidden" name="currency" value={v.currency} />}
//                         {currencyLocked && (
//                             <p className="mt-1.5 text-xs text-gray-600">
//                                 La devise ne peut plus être modifiée : vous avez déjà des factures.
//                             </p>
//                         )}
//                     </div>
//                     <div className="mb-4">
//                         <label htmlFor="default_tax_rate" className={labelClass}>TVA par défaut (%)</label>
//                         <input id="default_tax_rate" name="default_tax_rate" required inputMode="decimal" defaultValue={v.default_tax_rate} className={inputClass} />
//                     </div>
//                     <div className="mb-4">
//                         <label htmlFor="payment_terms_days" className={labelClass}>Délai de paiement (jours)</label>
//                         <input id="payment_terms_days" name="payment_terms_days" required inputMode="numeric" defaultValue={v.payment_terms_days} className={inputClass} />
//                     </div>
//                 </div>
//                 <div className="mb-4 sm:max-w-[calc(50%-8px)]">
//                     <label htmlFor="invoice_prefix" className={labelClass}>Préfixe de numérotation</label>
//                     <input
//                         id="invoice_prefix"
//                         name="invoice_prefix"
//                         required
//                         maxLength={6}
//                         value={prefix}
//                         onChange={(e) => setPrefix(e.target.value)}
//                         className={inputClass}
//                     />
//                     <p className="mt-1.5 text-xs text-gray-600">
//                         Prochain numéro : <strong>{preview}</strong>. Le compteur est continu et ne se modifie pas à la main.
//                     </p>
//                 </div>
//                 <div>
//                     <label htmlFor="payment_instructions" className={labelClass}>Instructions de paiement</label>
//                     <textarea
//                         id="payment_instructions"
//                         name="payment_instructions"
//                         rows={3}
//                         maxLength={1000}
//                         placeholder="Virement, Mobile Money… Indiquez le numéro de facture en référence."
//                         defaultValue={v.payment_instructions}
//                         className={`${inputClass} py-2.5`}
//                     />
//                 </div>
//             </Card>

//             {state.error && (
//                 <p role="alert" className="mb-4 text-sm font-medium text-red-700">{state.error}</p>
//             )}
//             {state.saved && (
//                 <p role="status" className="mb-4 text-sm font-medium text-green-700">
//                     Modifications enregistrées.
//                 </p>
//             )}

//             <button
//                 type="submit"
//                 disabled={pending}
//                 className="min-h-[48px] rounded-[10px] bg-[#E0A030] px-6 font-bold text-[#1B2A41] disabled:opacity-60"
//             >
//                 {pending ? 'Enregistrement…' : 'Enregistrer les modifications'}
//             </button>
//         </form>
//     )
// }