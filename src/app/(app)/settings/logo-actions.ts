'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrganization } from '@/lib/organization'

export type LogoState = { error?: string; saved?: boolean }

const MAX_BYTES = 800 * 1024
const NETWORK_ERROR = 'Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.'

// On reconnaît le format par les premiers octets du fichier, pas par son nom
function sniff(b: Uint8Array): 'png' | 'jpg' | null {
    if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png'
    if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg'
    return null
}

export async function uploadLogo(_prev: LogoState, formData: FormData): Promise<LogoState> {
    const file = formData.get('logo')
    if (!(file instanceof File) || file.size === 0) return { error: 'Choisissez une image.' }
    if (file.size > MAX_BYTES) return { error: 'Le logo ne doit pas dépasser 800 Ko.' }

    const bytes = new Uint8Array(await file.arrayBuffer())
    const kind = sniff(bytes)
    if (!kind) return { error: 'Format non pris en charge : utilisez un PNG ou un JPG.' }

    try {
        const org = await getCurrentOrganization()
        if (!org) return { error: 'Entreprise introuvable.' }
        const supabase = await createClient()

        // Nom unique à chaque import : les anciennes factures gardent l'ancien logo
        const path = `${org.id}/logo-${Date.now()}.${kind}`
        const { error: uploadError } = await supabase.storage.from('logos').upload(path, bytes, {
            contentType: kind === 'png' ? 'image/png' : 'image/jpeg',
            upsert: false,
        })
        if (uploadError) {
            console.error('Import du logo :', uploadError.message)
            return { error: 'Impossible d’importer le logo. Seul le propriétaire de l’entreprise peut le faire.' }
        }

        const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path)
        const { data, error } = await supabase
            .from('organizations')
            .update({ logo_url: urlData.publicUrl })
            .eq('id', org.id)
            .select('id')
        if (error) {
            console.error('Enregistrement du logo :', error.message)
            return { error: 'Le logo est importé, mais son enregistrement a échoué. Réessayez.' }
        }
        if (!data?.length) {
            return { error: 'Seul le propriétaire de l’entreprise peut modifier le logo.' }
        }
    } catch (e) {
        console.error('Import du logo impossible :', e)
        return { error: NETWORK_ERROR }
    }

    revalidatePath('/settings')
    return { saved: true }
}

// Retire le logo de l'entreprise. Le fichier reste stocké : les factures déjà émises
// gardent une copie figée de son adresse.
export async function removeLogo() {
    const org = await getCurrentOrganization()
    if (!org) redirect('/onboarding')

    const supabase = await createClient()
    const { error } = await supabase.from('organizations').update({ logo_url: null }).eq('id', org.id)
    if (error) throw new Error('Suppression du logo impossible : ' + error.message)

    revalidatePath('/settings')
}