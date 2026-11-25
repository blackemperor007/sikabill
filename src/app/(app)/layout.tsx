// import { redirect } from 'next/navigation'
// import { createClient } from '@/lib/supabase/server'
// import { getCurrentOrganization } from '@/lib/organization'
// import { AppHeader } from '@/components/app-header'

// export default async function AppLayout({ children }: { children: React.ReactNode }) {
//     const supabase = await createClient()
//     const { data } = await supabase.auth.getClaims()
//     if (!data?.claims) redirect('/login')

//     const org = await getCurrentOrganization()
//     if (!org) redirect('/onboarding')

//     return (
//         <div className="min-h-screen bg-[#F6F7F9] text-[#1B2A41]">
//             <AppHeader orgName={org.name} />
//             <main className="mx-auto max-w-[1120px] px-8 py-8">{children}</main>
//         </div>
//     )
// }

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrganization } from '@/lib/organization'
import { AppSidebar } from '@/components/app-sidebard'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()
    const claims = data?.claims
    if (!claims) redirect('/login')

    const org = await getCurrentOrganization()
    if (!org) redirect('/onboarding')

    const fullName = (claims.user_metadata as { full_name?: unknown } | undefined)?.full_name
    const userName =
        typeof fullName === 'string' && fullName.trim() ? fullName.trim() : String(claims.email ?? '')

    return (
        <div className="min-h-screen bg-canvas p-3 text-ink lg:p-4">
            <div className="mx-auto flex max-w-[1500px] flex-col gap-4 lg:flex-row lg:items-start">
                <AppSidebar orgName={org.name} userName={userName} />
                <main className="min-w-0 flex-1 pb-8 lg:px-2">
                    <div className="mx-auto w-full max-w-[1180px]">{children}</div>
                </main>
            </div>
        </div>
    )
}