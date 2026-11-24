'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type FormState = { error?: string }

const GENERIC_ERROR = 'Une erreur est survenue. Réessayez.'
const NETWORK_ERROR = 'Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.'

function toFrench(message: string): string {
    const m = message.toLowerCase()
    if (m.includes('already registered') || m.includes('already been registered'))
        return 'Cette adresse e-mail est déjà utilisée.'
    if (m.includes('invalid login credentials')) return 'E-mail ou mot de passe incorrect.'
    if (m.includes('email not confirmed')) return 'Cette adresse e-mail n’est pas encore confirmée.'
    if (m.includes('invalid') && m.includes('email')) return 'Adresse e-mail invalide.'
    if (m.includes('rate limit') || m.includes('too many'))
        return 'Trop de tentatives. Réessayez dans quelques minutes.'
    return GENERIC_ERROR
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
    const name = String(formData.get('name') ?? '').trim()
    const email = String(formData.get('email') ?? '').trim()
    const password = String(formData.get('password') ?? '')

    if (!name) return { error: 'Indiquez votre nom.' }
    if (password.length < 8) return { error: 'Le mot de passe doit contenir au moins 8 caractères.' }

    try {
        const supabase = await createClient()
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: name } },
        })
        if (error) return { error: toFrench(error.message) }
    } catch (e) {
        console.error('Inscription impossible :', e)
        return { error: NETWORK_ERROR }
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
        if (error) return { error: toFrench(error.message) }
    } catch (e) {
        console.error('Connexion impossible :', e)
        return { error: NETWORK_ERROR }
    }

    redirect('/dashboard')
}

export async function signOut() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
}