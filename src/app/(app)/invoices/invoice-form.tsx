'use client'

import { useActionState, useMemo, useState } from 'react'
import Link from 'next/link'
import { formatMoney } from '@/lib/money'
import { computeTotals, LineInput } from '@/lib/invoice-math'
import { InvoiceState, saveInvoice } from './actions'

type Line = LineInput & { key: number }

type Props = {
    invoiceId?: string
    currency: string
    digits: number
    customers: { id: string; name: string }[]
    initial: {
        customer_id: string
        issue_date: string
        due_date: string
        notes: string
        lines: LineInput[]
        defaultTaxRate: string
    }
}

const inputClass =
    'min-h-[46px] w-full rounded-[10px] border border-gray-300 bg-white px-3 text-[15px]'
const labelClass = 'mb-1.5 block text-sm font-medium text-gray-600'
const cardClass = 'rounded-[14px] border border-gray-200 bg-white p-5'

export function InvoiceForm({ invoiceId, currency, digits, customers, initial }: Props) {
    const [state, action, pending] = useActionState<InvoiceState, FormData>(saveInvoice, {})
    const [customerId, setCustomerId] = useState(initial.customer_id)
    const [issueDate, setIssueDate] = useState(initial.issue_date)
    const [dueDate, setDueDate] = useState(initial.due_date)
    const [notes, setNotes] = useState(initial.notes)
    const [lines, setLines] = useState<Line[]>(() =>
        initial.lines.map((l, i) => ({ ...l, key: i }))
    )
    const [nextKey, setNextKey] = useState(initial.lines.length)

    const totals = useMemo(() => computeTotals(lines, digits), [lines, digits])
    const money = (n: bigint) => formatMoney(Number(n), currency)

    function update(key: number, field: keyof LineInput, value: string) {
        setLines((ls) => ls.map((l) => (l.key === key ? { ...l, [field]: value } : l)))
    }
    function addLine() {
        setLines((ls) => [
            ...ls,
            { key: nextKey, description: '', quantity: '1', unit_price: '', tax_rate: initial.defaultTaxRate },
        ])
        setNextKey((k) => k + 1)
    }
    function removeLine(key: number) {
        setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.key !== key) : ls))
    }

    const taxLabel = totals.rates.length === 1 ? `TVA (${totals.rates[0]} %)` : 'TVA'

    return (
        <form action={action} className="flex flex-wrap items-start gap-6">
            {invoiceId && <input type="hidden" name="id" value={invoiceId} />}
            <input
                type="hidden"
                name="lines"
                value={JSON.stringify(
                    lines.map((l) => ({
                        description: l.description,
                        quantity: l.quantity,
                        unit_price: l.unit_price,
                        tax_rate: l.tax_rate,
                    }))
                )}
            />

            <div className="flex min-w-0 flex-[2_1_560px] flex-col gap-6">
                <section className={cardClass}>
                    <h2 className="mb-4 text-base font-bold">Client et dates</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label htmlFor="customer_id" className={labelClass}>Client</label>
                            <select
                                id="customer_id"
                                name="customer_id"
                                required
                                value={customerId}
                                onChange={(e) => setCustomerId(e.target.value)}
                                className={inputClass}
                            >
                                <option value="">Choisir un client…</option>
                                {customers.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="issue_date" className={labelClass}>Date d’émission</label>
                            <input
                                id="issue_date"
                                name="issue_date"
                                type="date"
                                value={issueDate}
                                onChange={(e) => setIssueDate(e.target.value)}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label htmlFor="due_date" className={labelClass}>Échéance</label>
                            <input
                                id="due_date"
                                name="due_date"
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className={inputClass}
                            />
                        </div>
                    </div>
                </section>

                <section className={cardClass}>
                    <h2 className="mb-4 text-base font-bold">Lignes de la facture</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] border-collapse">
                            <thead>
                                <tr className="text-left text-xs font-semibold text-gray-600">
                                    <th className="w-[36%] px-1.5 py-2">Description</th>
                                    <th className="px-1.5 py-2">Qté</th>
                                    <th className="px-1.5 py-2">Prix unitaire ({currency})</th>
                                    <th className="px-1.5 py-2">TVA (%)</th>
                                    <th className="px-1.5 py-2 text-right">Total HT</th>
                                    <th className="px-1.5 py-2"><span className="sr-only">Supprimer</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {lines.map((l, i) => (
                                    <tr key={l.key}>
                                        <td className="p-1.5">
                                            <input
                                                aria-label={`Description ligne ${i + 1}`}
                                                required
                                                maxLength={500}
                                                value={l.description}
                                                onChange={(e) => update(l.key, 'description', e.target.value)}
                                                className={inputClass}
                                            />
                                        </td>
                                        <td className="p-1.5">
                                            <input
                                                aria-label={`Quantité ligne ${i + 1}`}
                                                required
                                                inputMode="decimal"
                                                value={l.quantity}
                                                onChange={(e) => update(l.key, 'quantity', e.target.value)}
                                                className={inputClass}
                                            />
                                        </td>
                                        <td className="p-1.5">
                                            <input
                                                aria-label={`Prix unitaire ligne ${i + 1}`}
                                                required
                                                inputMode="decimal"
                                                value={l.unit_price}
                                                onChange={(e) => update(l.key, 'unit_price', e.target.value)}
                                                className={inputClass}
                                            />
                                        </td>
                                        <td className="p-1.5">
                                            <input
                                                aria-label={`TVA ligne ${i + 1}`}
                                                required
                                                inputMode="decimal"
                                                value={l.tax_rate}
                                                onChange={(e) => update(l.key, 'tax_rate', e.target.value)}
                                                className={inputClass}
                                            />
                                        </td>
                                        <td className="whitespace-nowrap p-1.5 text-right text-sm font-semibold tabular-nums">
                                            {totals.perLine[i] === null ? '—' : money(totals.perLine[i] as bigint)}
                                        </td>
                                        <td className="p-1.5">
                                            <button
                                                type="button"
                                                aria-label={`Supprimer la ligne ${i + 1}`}
                                                disabled={lines.length === 1}
                                                onClick={() => removeLine(l.key)}
                                                className="min-h-[44px] min-w-[44px] text-xl text-gray-600 disabled:opacity-30"
                                            >
                                                ×
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button
                        type="button"
                        onClick={addLine}
                        className="mt-3 min-h-[44px] rounded-[10px] border border-gray-300 bg-white px-4 text-sm font-semibold"
                    >
                        + Ajouter une ligne
                    </button>
                </section>

                <section className={cardClass}>
                    <h2 className="mb-4 text-base font-bold">Notes et conditions de paiement</h2>
                    <label htmlFor="notes" className={labelClass}>Affiché en bas de la facture</label>
                    <textarea
                        id="notes"
                        name="notes"
                        rows={3}
                        maxLength={2000}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className={`${inputClass} py-2.5`}
                    />
                </section>
            </div>

            <aside className={`${cardClass} min-w-0 flex-[1_1_300px]`}>
                <h2 className="mb-4 text-base font-bold">Récapitulatif</h2>
                <div className="my-2 flex justify-between text-sm tabular-nums">
                    <span>Total HT</span>
                    <span>{money(totals.subtotal)}</span>
                </div>
                <div className="my-2 flex justify-between text-sm tabular-nums">
                    <span>{taxLabel}</span>
                    <span>{money(totals.tax)}</span>
                </div>
                <div className="mt-3 flex justify-between border-t border-gray-200 pt-3 text-xl font-extrabold tabular-nums">
                    <span>Total TTC</span>
                    <span>{money(totals.total)}</span>
                </div>

                {totals.hasInvalid && (
                    <p className="mt-3 text-xs text-gray-600">
                        Les lignes incomplètes ou invalides ne sont pas comptées dans le total.
                    </p>
                )}

                {state.error && (
                    <p role="alert" className="mt-4 text-sm font-medium text-red-700">{state.error}</p>
                )}

                <button
                    type="submit"
                    disabled={pending}
                    className="mt-5 min-h-[48px] w-full rounded-[10px] bg-[#E0A030] font-bold text-[#1B2A41] disabled:opacity-60"
                >
                    {pending ? 'Enregistrement…' : 'Enregistrer le brouillon'}
                </button>
                <Link
                    href="/invoices"
                    className="mt-2.5 flex min-h-[48px] w-full items-center justify-center rounded-[10px] border border-gray-300 bg-white font-semibold"
                >
                    Annuler
                </Link>

                <p className="mt-4 text-[13px] leading-relaxed text-gray-600">
                    Le numéro est attribué à l’émission. Une fois émise, la facture ne peut plus être
                    modifiée : en cas d’erreur, vous l’annulez et en créez une nouvelle.
                </p>
            </aside>
        </form>
    )
}