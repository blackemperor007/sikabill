'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Field } from '@/components/auth-shell'
import { btn } from '@/lib/ui'
import { FormState, signUp } from '../action'

export function SignupForm() {
    const [state, action, pending] = useActionState<FormState, FormData>(signUp, {})

    return (
        <form action={action}>
            <Field label="Nom complet" name="name" placeholder="Votre nom" autoComplete="name" />
            <Field
                label="E-mail"
                name="email"
                type="email"
                placeholder="vous@entreprise.com"
                autoComplete="email"
            />
            <Field
                label="Mot de passe"
                name="password"
                type="password"
                placeholder="8 caractères minimum"
                autoComplete="new-password"
            />

            {state.error && (
                <p
                    role="alert"
                    className="mb-4 rounded-xl bg-bad-soft px-4 py-3 text-sm font-semibold text-bad"
                >
                    {state.error}
                </p>
            )}

            <button type="submit" disabled={pending} className={`${btn('primary')} mt-2 w-full`}>
                {pending ? 'Création du compte…' : 'Créer mon compte'}
            </button>

            <p className="mt-6 text-center text-sm">
                Déjà un compte ?{' '}
                <Link href="/login" className="font-bold underline underline-offset-2">
                    Se connecter
                </Link>
            </p>
        </form>
    )
}

// 'use client'

// import { useActionState } from 'react'
// import Link from 'next/link'
// import { Field } from '@/components/auth-shell'
// import { FormState, signUp } from '../action'

// export function SignupForm() {
//     const [state, action, pending] = useActionState<FormState, FormData>(signUp, {})

//     return (
//         <form action={action}>
//             <Field label="Nom complet" name="name" placeholder="Awa Ndongo" autoComplete="name" />
//             <Field label="Adresse e-mail" name="email" type="email" placeholder="vous@exemple.com" autoComplete="email" />
//             <Field label="Mot de passe" name="password" type="password" placeholder="8 caractères minimum" autoComplete="new-password" />

//             {state.error && (
//                 <p role="alert" className="mb-4 text-sm font-medium text-red-700">
//                     {state.error}
//                 </p>
//             )}

//             <button
//                 type="submit"
//                 disabled={pending}
//                 className="min-h-[48px] w-full rounded-[10px] bg-[#E0A030] font-bold text-[#1B2A41] disabled:opacity-60"
//             >
//                 {pending ? 'Création du compte…' : 'Créer mon compte'}
//             </button>

//             <p className="mt-6 text-center text-sm text-gray-600">
//                 Déjà un compte ?{' '}
//                 <Link href="/login" className="font-semibold text-[#1B2A41] underline">
//                     Se connecter
//                 </Link>
//             </p>
//         </form>
//     )
// }