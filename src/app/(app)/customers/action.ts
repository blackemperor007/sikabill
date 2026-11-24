'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrganization } from '@/lib/organization'
import { isUuid } from '@/lib/validators'

export type CustomerState = {
    error?: string
    values?: { name: string; email: string; phone: string; address: string; tax_id: string }
}

const NETWORK_ERROR = 'Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.'
const text = (fd: FormData, key: string) => String(fd.get(key) ?? '').trim()

export async function saveCustomer(
    _prev: CustomerState,
    formData: FormData
): Promise<CustomerState> {
    const id = text(formData, 'id')
    const values = {
        name: text(formData, 'name'),
        email: text(formData, 'email'),
        phone: text(formData, 'phone'),
        address: text(formData, 'address'),
        tax_id: text(formData, 'tax_id'),
    }

    if (!values.name) return { error: 'Indiquez le nom du client.', values }
    if (values.name.length > 200) return { error: 'Le nom est trop long.', values }
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
        return { error: 'Adresse e-mail invalide.', values }
    if (id && !isUuid(id)) return { error: 'Client introuvable.', values }

    // Les champs facultatifs vides sont enregistrés comme « vides » (NULL)
    const row = {
        name: values.name,
        email: values.email || null,
        phone: values.phone || null,
        address: values.address || null,
        tax_id: values.tax_id || null,
    }

    try {
        const org = await getCurrentOrganization()
        if (!org) return { error: 'Entreprise introuvable.', values }
        const supabase = await createClient()

        if (id) {
            const { data, error } = await supabase
                .from('customers')
                .update(row)
                .eq('id', id)
                .eq('organization_id', org.id)
                .select('id')
            if (error) {
                console.error('Modification du client :', error.message)
                return { error: 'Impossible d’enregistrer le client. Réessayez.', values }
            }
            if (!data?.length) return { error: 'Client introuvable.', values }
        } else {
            const { error } = await supabase
                .from('customers')
                .insert({ organization_id: org.id, ...row })
            if (error) {
                console.error('Création du client :', error.message)
                return { error: 'Impossible d’enregistrer le client. Réessayez.', values }
            }
        }
    } catch (e) {
        console.error('Enregistrement du client impossible :', e)
        return { error: NETWORK_ERROR, values }
    }

    revalidatePath('/customers')
    // Le redirect reste hors du try : il fonctionne en lançant une exception interne
    redirect('/customers')
}

export async function setCustomerArchived(formData: FormData) {
    const id = text(formData, 'id')
    const archive = text(formData, 'archive') === '1'
    if (!isUuid(id)) redirect('/customers')

    const org = await getCurrentOrganization()
    if (!org) redirect('/onboarding')

    const supabase = await createClient()
    const { error } = await supabase
        .from('customers')
        .update({ archived_at: archive ? new Date().toISOString() : null })
        .eq('id', id)
        .eq('organization_id', org.id)
    if (error) throw new Error('Archivage impossible : ' + error.message)

    revalidatePath('/customers')
    redirect('/customers')
}