import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrganization } from '@/lib/organization'
import { todayISO } from '@/lib/invoices'
import { AppSidebar } from '@/components/app-sidebard'
import { AppTopbar } from '@/components/app-topbar'

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

    // Factures émises dont l'échéance est dépassée (badge de la cloche)
    const { count: overdueCount } = await supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', org.id)
        .eq('status', 'issued')
        .lt('due_date', todayISO())

    return (
        <div className="min-h-screen bg-canvas p-3 text-ink lg:p-4">
            <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-start">
                <AppSidebar orgName={org.name} userName={userName} />
                <main className="min-w-0 flex-1 pb-8 lg:px-2">
                    <AppTopbar userName={userName} orgName={org.name} alertCount={overdueCount ?? 0} />
                    {children}
                </main>
            </div>
        </div>
    )
}