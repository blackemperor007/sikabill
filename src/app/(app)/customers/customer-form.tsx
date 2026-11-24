'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { CustomerState, saveCustomer } from './action'

type Customer = {
    id: string
    name: string
    email: string | null
    phone: string | null
    address: string | null
    tax_id: string | null
}

const inputClass =
    'min-h-[46px] w-full rounded-[10px] border border-gray-300 bg-white px-3 text-[15px]'
const labelClass = 'mb-1.5 block text-sm font-medium text-gray-600'

export function CustomerForm({ customer }: { customer?: Customer }) {
    const [state, action, pending] = useActionState<CustomerState, FormData>(saveCustomer, {})

    // Après une erreur, on réaffiche ce que l'utilisateur avait saisi
    const val = (key: 'name' | 'email' | 'phone' | 'address' | 'tax_id') =>
        state.values?.[key] ?? customer?.[key] ?? ''

    return (
        <form action={action}>
            {customer && <input type="hidden" name="id" value={customer.id} />}

            <section className="rounded-[14px] border border-gray-200 bg-white p-6">
                <div className="mb-4">
                    <label htmlFor="name" className={labelClass}>
                        Nom du client
                    </label>
                    <input
                        id="name"
                        name="name"
                        required
                        maxLength={200}
                        placeholder="Studio Kamer"
                        defaultValue={val('name')}
                        className={inputClass}
                    />
                </div>

                <div className="grid gap-x-4 sm:grid-cols-2">
                    <div className="mb-4">
                        <label htmlFor="email" className={labelClass}>
                            Adresse e-mail
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="contact@exemple.com"
                            defaultValue={val('email')}
                            className={inputClass}
                        />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="phone" className={labelClass}>
                            Téléphone
                        </label>
                        <input
                            id="phone"
                            name="phone"
                            placeholder="+237 6 00 00 00 00"
                            defaultValue={val('phone')}
                            className={inputClass}
                        />
                    </div>
                </div>

                <div className="mb-4">
                    <label htmlFor="address" className={labelClass}>
                        Adresse
                    </label>
                    <textarea
                        id="address"
                        name="address"
                        rows={3}
                        placeholder="Rue, ville, pays"
                        defaultValue={val('address')}
                        className={`${inputClass} py-2.5`}
                    />
                </div>

                <div>
                    <label htmlFor="tax_id" className={labelClass}>
                        NIU du client (facultatif)
                    </label>
                    <input
                        id="tax_id"
                        name="tax_id"
                        placeholder="M0123456789A"
                        defaultValue={val('tax_id')}
                        className={inputClass}
                    />
                    <p className="mt-1.5 text-xs text-gray-600">
                        Utile si votre client est une entreprise : il apparaîtra sur la facture.
                    </p>
                </div>
            </section>

            {state.error && (
                <p role="alert" className="mt-4 text-sm font-medium text-red-700">
                    {state.error}
                </p>
            )}

            <div className="mt-5 flex flex-wrap gap-2.5">
                <button
                    type="submit"
                    disabled={pending}
                    className="min-h-[48px] rounded-[10px] bg-[#E0A030] px-6 font-bold text-[#1B2A41] disabled:opacity-60"
                >
                    {pending ? 'Enregistrement…' : 'Enregistrer le client'}
                </button>
                <Link
                    href="/customers"
                    className="inline-flex min-h-[48px] items-center rounded-[10px] border border-gray-300 bg-white px-5 font-semibold"
                >
                    Annuler
                </Link>
            </div>
        </form>
    )
}