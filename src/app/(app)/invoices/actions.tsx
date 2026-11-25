'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrganization } from '@/lib/organization'
import { currencyDigits } from '@/lib/money'
import { computeLine, formatScaled, type LineInput } from '@/lib/invoice-math'
import { isUuid } from '@/lib/validators'

export type InvoiceState = { error?: string; savedId?: string; needsSettings?: boolean }

const NETWORK_ERROR = 'Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.'
const text = (fd: FormData, key: string) => String(fd.get(key) ?? '').trim()
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s))

export async function saveInvoice(
    _prev: InvoiceState,
    formData: FormData
): Promise<InvoiceState> {
    const id = text(formData, 'id')
    const intent = text(formData, 'intent') === 'issue' ? 'issue' : 'save'
    const customerId = text(formData, 'customer_id')
    const issueDate = text(formData, 'issue_date')
    const dueDate = text(formData, 'due_date')
    const notes = text(formData, 'notes')

    if (!isUuid(customerId)) return { error: 'Choisissez un client.' }
    if (id && !isUuid(id)) return { error: 'Facture introuvable.' }
    if (issueDate && !isDate(issueDate)) return { error: 'Date d’émission invalide.' }
    if (dueDate && !isDate(dueDate)) return { error: 'Date d’échéance invalide.' }
    if (issueDate && dueDate && dueDate < issueDate)
        return { error: 'L’échéance ne peut pas précéder la date d’émission.' }
    if (notes.length > 2000) return { error: 'Les notes sont trop longues (2 000 caractères maximum).' }

    let raw: unknown
    try {
        raw = JSON.parse(text(formData, 'lines'))
    } catch {
        return { error: 'Lignes de facture invalides.' }
    }
    if (!Array.isArray(raw) || raw.length === 0) return { error: 'Ajoutez au moins une ligne.' }
    if (raw.length > 100) return { error: 'Une facture ne peut pas dépasser 100 lignes.' }

    let savedId = id
    let issued = false

    try {
        const org = await getCurrentOrganization()
        if (!org) return { error: 'Entreprise introuvable.' }
        const digits = currencyDigits(org.currency)

        // Validation de chaque ligne, avec le même calcul que l'aperçu
        const items: { description: string; quantity: string; unit_price: number; tax_rate: string }[] = []
        for (let i = 0; i < raw.length; i++) {
            const r = (raw[i] ?? {}) as Partial<LineInput>
            const input: LineInput = {
                description: String(r.description ?? '').trim(),
                quantity: String(r.quantity ?? ''),
                unit_price: String(r.unit_price ?? ''),
                tax_rate: String(r.tax_rate ?? ''),
            }
            const n = i + 1
            if (!input.description) return { error: `Ligne ${n} : indiquez une description.` }
            if (input.description.length > 500) return { error: `Ligne ${n} : description trop longue.` }

            const { line, error } = computeLine(input, digits)
            if (error === 'quantity') return { error: `Ligne ${n} : quantité invalide (un nombre supérieur à 0).` }
            if (error === 'unit_price')
                return {
                    error: `Ligne ${n} : prix unitaire invalide${digits === 0 ? ' (un nombre entier)' : ''}.`,
                }
            if (error === 'tax_rate') return { error: `Ligne ${n} : TVA invalide (entre 0 et 100).` }
            if (error === 'amount') return { error: `Ligne ${n} : montant trop élevé.` }
            if (!line) return { error: `Ligne ${n} invalide.` }

            items.push({
                description: input.description,
                quantity: formatScaled(line.qty1000, 3),
                unit_price: Number(line.unit),
                tax_rate: formatScaled(line.rate100, 2),
            })
        }

        const supabase = await createClient()
        const { data, error } = await supabase.rpc('save_invoice_draft', {
            p_invoice_id: id || null,
            p_customer_id: customerId,
            p_issue_date: issueDate || null,
            p_due_date: dueDate || null,
            p_notes: notes || null,
            p_items: items,
        })

        if (error) {
            console.error('save_invoice_draft :', error.message)
            if (error.message.includes('Client introuvable'))
                return { error: 'Ce client est introuvable ou archivé. Choisissez-en un autre.' }
            if (error.message.includes('Brouillon introuvable'))
                return { error: 'Ce brouillon n’existe plus ou n’est plus modifiable.' }
            return { error: 'Impossible d’enregistrer la facture. Réessayez.' }
        }
        savedId = String(data)

        if (intent === 'issue') {
            const { error: issueError } = await supabase.rpc('issue_invoice', { p_invoice_id: savedId })
            if (issueError) {
                console.error('issue_invoice :', issueError.message)
                const m = issueError.message
                if (m.includes('Renseignez le NIU'))
                    return {
                        error:
                            'Votre brouillon est enregistré, mais pour émettre une facture, renseignez d’abord le NIU, le RCCM et l’adresse de votre entreprise.',
                        savedId,
                        needsSettings: true,
                    }
                if (m.includes('échéance'))
                    return {
                        error: 'Votre brouillon est enregistré, mais l’échéance ne peut pas précéder la date d’émission.',
                        savedId,
                    }
                if (m.includes('Seul un brouillon'))
                    return { error: 'Cette facture a déjà été émise.', savedId }
                return {
                    error: 'Votre brouillon est enregistré, mais l’émission a échoué. Réessayez.',
                    savedId,
                }
            }
            issued = true
        }
    } catch (e) {
        console.error('Enregistrement de la facture impossible :', e)
        return { error: NETWORK_ERROR, savedId: savedId || undefined }
    }

    revalidatePath('/invoices')
    // Le redirect reste hors du try : il fonctionne en lançant une exception interne
    redirect(issued ? `/invoices/${savedId}` : '/invoices')
}

export async function markInvoicePaid(
    _prev: InvoiceState,
    formData: FormData
): Promise<InvoiceState> {
    const id = text(formData, 'id')
    if (!isUuid(id)) return { error: 'Facture introuvable.' }

    try {
        const supabase = await createClient()
        const { error } = await supabase.rpc('mark_invoice_paid', { p_invoice_id: id })
        if (error) {
            console.error('mark_invoice_paid :', error.message)
            if (error.message.includes('Seule une facture émise'))
                return { error: 'Seule une facture émise peut être marquée comme payée.' }
            return { error: 'Impossible d’enregistrer le paiement. Réessayez.' }
        }
    } catch (e) {
        console.error('Enregistrement du paiement impossible :', e)
        return { error: NETWORK_ERROR }
    }

    revalidatePath('/invoices')
    revalidatePath(`/invoices/${id}`)
    return {}
}

export async function voidInvoice(
    _prev: InvoiceState,
    formData: FormData
): Promise<InvoiceState> {
    const id = text(formData, 'id')
    if (!isUuid(id)) return { error: 'Facture introuvable.' }

    try {
        const supabase = await createClient()
        const { error } = await supabase.rpc('void_invoice', { p_invoice_id: id })
        if (error) {
            console.error('void_invoice :', error.message)
            if (error.message.includes('Seule une facture émise'))
                return { error: 'Seule une facture émise et non payée peut être annulée.' }
            return { error: 'Impossible d’annuler la facture. Réessayez.' }
        }
    } catch (e) {
        console.error('Annulation de la facture impossible :', e)
        return { error: NETWORK_ERROR }
    }

    revalidatePath('/invoices')
    revalidatePath(`/invoices/${id}`)
    return {}
}

export async function deleteDraft(formData: FormData) {
    const id = text(formData, 'id')
    if (!isUuid(id)) redirect('/invoices')

    const org = await getCurrentOrganization()
    if (!org) redirect('/onboarding')

    const supabase = await createClient()
    const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id)
        .eq('organization_id', org.id)
        .eq('status', 'draft')
    if (error) throw new Error('Suppression impossible : ' + error.message)

    revalidatePath('/invoices')
    redirect('/invoices')
}