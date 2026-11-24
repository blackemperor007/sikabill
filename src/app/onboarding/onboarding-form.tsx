'use client'

import { useActionState, useState } from 'react'
import { COUNTRIES, CURRENCIES } from '@/lib/countries'
import { createOrganization, OnboardingState } from './action'

const inputClass =
    'min-h-[46px] w-full rounded-[10px] border border-gray-300 bg-white px-3 text-[15px] text-[#1B2A41]'
const labelClass = 'mb-1.5 block text-sm font-medium text-gray-600'

export function OnboardingForm() {
    const [state, action, pending] = useActionState<OnboardingState, FormData>(
        createOrganization,
        {}
    )
    const [name, setName] = useState('')
    const [country, setCountry] = useState(COUNTRIES[0].code)
    const [currency, setCurrency] = useState(COUNTRIES[0].currency)
    const [taxRate, setTaxRate] = useState(COUNTRIES[0].taxRate)

    const preset = COUNTRIES.find((c) => c.code === country)?.taxRate

    function onCountryChange(code: string) {
        const c = COUNTRIES.find((x) => x.code === code) ?? COUNTRIES[0]
        setCountry(c.code)
        setCurrency(c.currency)
        setTaxRate(c.taxRate)
    }

    return (
        <form action={action}>
            <section className="rounded-[14px] border border-gray-200 bg-white p-6">
                <div className="mb-4">
                    <label htmlFor="name" className={labelClass}>
                        Nom de l’entreprise
                    </label>
                    <input
                        id="name"
                        name="name"
                        required
                        placeholder="Atelier Ndongo"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={inputClass}
                    />
                </div>

                <div className="mb-4">
                    <label htmlFor="country" className={labelClass}>
                        Pays
                    </label>
                    <select
                        id="country"
                        name="country"
                        value={country}
                        onChange={(e) => onCountryChange(e.target.value)}
                        className={inputClass}
                    >
                        {COUNTRIES.map((c) => (
                            <option key={c.code} value={c.code}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="mb-4">
                    <label htmlFor="currency" className={labelClass}>
                        Devise
                    </label>
                    <select
                        id="currency"
                        name="currency"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className={inputClass}
                    >
                        {CURRENCIES.map((c) => (
                            <option key={c.code} value={c.code}>
                                {c.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="tax_rate" className={labelClass}>
                        TVA par défaut (%)
                    </label>
                    <input
                        id="tax_rate"
                        name="tax_rate"
                        required
                        inputMode="decimal"
                        value={taxRate}
                        onChange={(e) => setTaxRate(e.target.value)}
                        className={inputClass}
                    />
                    <p className="mt-1.5 text-xs text-gray-600">
                        {preset
                            ? 'Proposée selon votre pays. Vous pourrez la modifier, facture par facture.'
                            : 'Indiquez le taux de TVA applicable dans votre pays (0 si vous n’y êtes pas assujetti).'}
                    </p>
                </div>
            </section>

            <div className="mt-4 rounded-xl bg-[#FDF3DF] px-4 py-3.5 text-[13px] leading-relaxed text-[#5C4210]">
                Avant d’émettre votre première facture, pensez à renseigner vos identifiants légaux (NIU,
                RCCM), votre adresse et votre logo dans les paramètres.
            </div>

            {state.error && (
                <p role="alert" className="mt-4 text-sm font-medium text-red-700">
                    {state.error}
                </p>
            )}

            <button
                type="submit"
                disabled={pending}
                className="mt-5 min-h-[50px] w-full rounded-[10px] bg-[#E0A030] font-bold text-[#1B2A41] disabled:opacity-60"
            >
                {pending ? 'Création…' : 'Créer mon espace'}
            </button>
        </form>
    )
}