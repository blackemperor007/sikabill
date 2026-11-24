import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrganization } from '@/lib/organization'
import { AppHeader } from '@/components/app-header'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()
    if (!data?.claims) redirect('/login')

    const org = await getCurrentOrganization()
    if (!org) redirect('/onboarding')

    return (
        <div className="min-h-screen bg-[#F6F7F9] text-[#1B2A41]">
            <AppHeader orgName={org.name} />
            <main className="mx-auto max-w-[1120px] px-8 py-8">{children}</main>
        </div>
    )
}