'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type FormState = { error?: string }

function toFrench(message: string): string {
    const m = message.toLowerCase()
    if (m.includes('already registered') || m.includes('already been registered'))
        return 'Cette adresse e-mail est déjà utilisée.'
    if (m.includes('invalid login credentials')) return 'E-mail ou mot de passe incorrect.'
    if (m.includes('email not confirmed')) return 'Cette adresse e-mail n’est pas encore confirmée.'
    if (m.includes('invalid') && m.includes('email')) return 'Adresse e-mail invalide.'
    if (m.includes('rate limit') || m.includes('too many'))
        return 'Trop de tentatives. Réessayez dans quelques minutes.'
    // TEMPORAIRE (débogage) : affiche le message d'origine
    return 'Erreur : ' + message
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
    const name = String(formData.get('name') ?? '').trim()
    const email = String(formData.get('email') ?? '').trim()
    const password = String(formData.get('password') ?? '')

    if (!name) return { error: 'Indiquez votre nom.' }
    if (password.length < 8) return { error: 'Le mot de passe doit contenir au moins 8 caractères.' }

    // TEMPORAIRE (débogage) : vérifie seulement que les variables existent,
    // sans jamais afficher leur valeur
    console.log('SIGNUP env →', {
        urlDefinie: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        cleDefinie: Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    })

    try {
        const supabase = await createClient()
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: name } },
        })
        if (error) {
            // TEMPORAIRE (débogage)
            console.error('SIGNUP ERROR →', {
                name: error.name,
                status: error.status,
                code: (error as { code?: string }).code,
                message: error.message,
            })
            return { error: toFrench(error.message) }
        }
    } catch (e) {
        // TEMPORAIRE (débogage)
        console.error('SIGNUP EXCEPTION →', e)
        return { error: 'Erreur : ' + (e instanceof Error ? e.message : String(e)) }
    }

    // Le redirect reste hors du try : il fonctionne en lançant une exception interne
    redirect('/dashboard')
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
    const email = String(formData.get('email') ?? '').trim()
    const password = String(formData.get('password') ?? '')

    try {
        const supabase = await createClient()
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
            // TEMPORAIRE (débogage)
            console.error('SIGNIN ERROR →', {
                name: error.name,
                status: error.status,
                code: (error as { code?: string }).code,
                message: error.message,
            })
            return { error: toFrench(error.message) }
        }
    } catch (e) {
        // TEMPORAIRE (débogage)
        console.error('SIGNIN EXCEPTION →', e)
        return { error: 'Erreur : ' + (e instanceof Error ? e.message : String(e)) }
    }

    redirect('/dashboard')
}

export async function signOut() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
}