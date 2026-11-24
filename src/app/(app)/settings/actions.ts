'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrganization } from '@/lib/organization'
import { COUNTRIES, CURRENCIES } from '@/lib/countries'

export type SettingsValues = {
    name: string
    legal_name: string
    address: string
    phone: string
    email: string
    tax_id: string
    registration_number: string
    country: string
    currency: string
    default_tax_rate: string
    payment_terms_days: string
    invoice_prefix: string
    payment_instructions: string
}

export type SettingsState = { error?: string; saved?: boolean; values?: SettingsValues }

const NETWORK_ERROR = 'Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.'
const text = (fd: FormData, key: string) => String(fd.get(key) ?? '').trim()

export async function saveSettings(
    _prev: SettingsState,
    formData: FormData
): Promise<SettingsState> {
    const v: SettingsValues = {
        name: text(formData, 'name'),
        legal_name: text(formData, 'legal_name'),
        address: text(formData, 'address'),
        phone: text(formData, 'phone'),
        email: text(formData, 'email'),
        tax_id: text(formData, 'tax_id'),
        registration_number: text(formData, 'registration_number'),
        country: text(formData, 'country'),
        currency: text(formData, 'currency'),
        default_tax_rate: text(formData, 'default_tax_rate'),
        payment_terms_days: text(formData, 'payment_terms_days'),
        invoice_prefix: text(formData, 'invoice_prefix'),
        payment_instructions: text(formData, 'payment_instructions'),
    }
    const fail = (error: string): SettingsState => ({ error, values: v })

    if (v.name.length < 2 || v.name.length > 200) return fail('Indiquez le nom de votre entreprise.')
    if (!COUNTRIES.some((c) => c.code === v.country)) return fail('Choisissez un pays.')
    if (!CURRENCIES.some((c) => c.code === v.currency)) return fail('Choisissez une devise.')
    if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email))
        return fail('Adresse e-mail de contact invalide.')

    const taxRate = Number(v.default_tax_rate.replace(',', '.'))
    if (v.default_tax_rate === '' || !Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100)
        return fail('Le taux de TVA doit être compris entre 0 et 100.')

    const terms = Number(v.payment_terms_days)
    if (v.payment_terms_days === '' || !Number.isInteger(terms) || terms < 0 || terms > 365)
        return fail('Le délai de paiement doit être un nombre de jours entre 0 et 365.')

    if (!/^[A-Za-z0-9-]{1,6}$/.test(v.invoice_prefix))
        return fail('Le préfixe doit contenir 1 à 6 lettres, chiffres ou tirets, sans espace.')
    if (v.payment_instructions.length > 1000)
        return fail('Les instructions de paiement sont trop longues (1 000 caractères maximum).')

    try {
        const org = await getCurrentOrganization()
        if (!org) return fail('Entreprise introuvable.')
        const supabase = await createClient()

        // La devise ne change plus dès qu'une facture existe (la base le refuse aussi)
        const { count, error: countError } = await supabase
            .from('invoices')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', org.id)
        if (countError) throw new Error(countError.message)

        const row: Record<string, string | number | null> = {
            name: v.name,
            legal_name: v.legal_name || null,
            country: v.country,
            address: v.address || null,
            phone: v.phone || null,
            email: v.email || null,
            tax_id: v.tax_id || null,
            registration_number: v.registration_number || null,
            default_tax_rate: taxRate,
            payment_terms_days: terms,
            invoice_prefix: v.invoice_prefix,
            payment_instructions: v.payment_instructions || null,
        }
        if (!count) row.currency = v.currency

        const { data, error } = await supabase
            .from('organizations')
            .update(row)
            .eq('id', org.id)
            .select('id')

        if (error) {
            console.error('Enregistrement des paramètres :', error.message)
            if (error.message.includes('devise')) return fail(error.message)
            return fail('Impossible d’enregistrer les paramètres. Réessayez.')
        }
        if (!data?.length) {
            return fail('Seul le propriétaire de l’entreprise peut modifier ces informations.')
        }
    } catch (e) {
        console.error('Enregistrement des paramètres impossible :', e)
        return fail(NETWORK_ERROR)
    }

    // Rafraîchit la barre de navigation (nom de l'entreprise) et la page
    revalidatePath('/', 'layout')
    return { saved: true, values: v }
}