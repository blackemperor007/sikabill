import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '../(auth)/action'

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()
    const claims = data?.claims
    if (!claims) redirect('/login')

    return (
        <main className="mx-auto max-w-xl p-10">
            <h1 className="text-3xl font-extrabold text-[#1B2A41]">Tableau de bord</h1>
            <p className="mt-2 text-gray-600">Connecté en tant que {String(claims.email ?? '')}</p>
            <form action={signOut} className="mt-6">
                <button
                    type="submit"
                    className="min-h-[44px] rounded-[10px] border border-gray-300 px-4 font-semibold text-[#1B2A41]"
                >
                    Se déconnecter
                </button>
            </form>
        </main>
    )
}