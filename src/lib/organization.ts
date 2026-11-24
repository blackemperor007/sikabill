import { createClient } from '@/lib/supabase/server'

export type Organization = {
    id: string
    name: string
    country: string
    currency: string
    default_tax_rate: number
}

export async function getCurrentOrganization(): Promise<Organization | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('organizations')
        .select('id, name, country, currency, default_tax_rate')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

    // On lève l'erreur plutôt que de renvoyer null : une panne passagère ne doit
    // pas faire croire que l'utilisateur n'a pas d'entreprise (risque de doublon).
    if (error) throw new Error('Lecture de l’organisation impossible : ' + error.message)

    return data
}