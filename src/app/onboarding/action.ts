'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrganization } from '@/lib/organization'
import { COUNTRIES, CURRENCIES } from '@/lib/countries'

export type OnboardingState = { error?: string }

export async function createOrganization(
    _prev: OnboardingState,
    formData: FormData
): Promise<OnboardingState> {
    const name = String(formData.get('name') ?? '').trim()
    const country = String(formData.get('country') ?? '')
    const currency = String(formData.get('currency') ?? '')
    const taxRate = Number(String(formData.get('tax_rate') ?? '').trim().replace(',', '.'))

    if (name.length < 2) return { error: 'Indiquez le nom de votre entreprise.' }
    if (!COUNTRIES.some((c) => c.code === country)) return { error: 'Choisissez un pays.' }
    if (!CURRENCIES.some((c) => c.code === currency)) return { error: 'Choisissez une devise.' }
    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100)
        return { error: 'Le taux de TVA doit être compris entre 0 et 100.' }

    try {
        // Évite de créer une seconde entreprise en cas de double clic ou de page rouverte
        const existing = await getCurrentOrganization()
        if (!existing) {
            const supabase = await createClient()
            const { error } = await supabase.rpc('create_organization', {
                p_name: name,
                p_country: country,
                p_currency: currency,
                p_tax_rate: taxRate,
            })
            if (error) {
                console.error('create_organization :', error.message)
                return { error: 'Impossible de créer votre entreprise. Réessayez.' }
            }
        }
    } catch (e) {
        console.error('Création de l’entreprise impossible :', e)
        return { error: 'Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.' }
    }

    // Le redirect reste hors du try : il fonctionne en lançant une exception interne
    redirect('/dashboard')
}