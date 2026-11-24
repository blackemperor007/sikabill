import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrganization } from '@/lib/organization'
import { signOut } from '@/app/(auth)/actions'

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()
    const claims = data?.claims
    if (!claims) redirect('/login')

    const org = await getCurrentOrganization()
    if (!org) redirect('/onboarding')

    return (
        <main className="mx-auto max-w-xl p-10">
            <h1 className="text-3xl font-extrabold text-[#1B2A41]">{org.name}</h1>
            <p className="mt-2 text-gray-600">Connecté en tant que {String(claims.email ?? '')}</p>
            <p className="mt-1 text-sm text-gray-600">
                Devise : {org.currency} · TVA par défaut : {org.default_tax_rate} %
            </p>
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