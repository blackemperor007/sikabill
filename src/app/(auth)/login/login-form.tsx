'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Field } from '@/components/auth-shell'
import { FormState, signIn } from '../action'

export function LoginForm() {
    const [state, action, pending] = useActionState<FormState, FormData>(signIn, {})

    return (
        <form action={action}>
            <Field label="Adresse e-mail" name="email" type="email" placeholder="vous@exemple.com" autoComplete="email" />
            <Field label="Mot de passe" name="password" type="password" placeholder="••••••••" autoComplete="current-password" />

            {state.error && (
                <p role="alert" className="mb-4 text-sm font-medium text-red-700">
                    {state.error}
                </p>
            )}

            <button
                type="submit"
                disabled={pending}
                className="min-h-[48px] w-full rounded-[10px] bg-[#E0A030] font-bold text-[#1B2A41] disabled:opacity-60"
            >
                {pending ? 'Connexion…' : 'Se connecter'}
            </button>

            <p className="mt-6 text-center text-sm text-gray-600">
                Pas encore de compte ?{' '}
                <Link href="/signup" className="font-semibold text-[#1B2A41] underline">
                    Créer un compte
                </Link>
            </p>
        </form>
    )
}