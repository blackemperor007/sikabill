import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrganization } from '@/lib/organization'
import { Logo } from '@/components/logo'
import { OnboardingForm } from './onboarding-form'

export default async function OnboardingPage() {
    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()
    if (!data?.claims) redirect('/login')

    // Une entreprise existe déjà : inutile de repasser par ici
    if (await getCurrentOrganization()) redirect('/dashboard')

    return (
        <div className="min-h-screen bg-canvas p-3 lg:p-4">
            <header className="dark-zone mx-auto flex max-w-[1500px] items-center rounded-3xl bg-ink px-6 py-4 text-white">
                <Logo onDark className="text-2xl" />
            </header>

            <main className="mx-auto max-w-[560px] px-2 py-10">
                <p className="mb-2 text-sm font-semibold text-muted">Dernière étape</p>
                <h1 className="mb-2 text-3xl font-bold leading-tight tracking-tight">
                    Parlons de votre activité
                </h1>
                <p className="mb-7 leading-relaxed text-muted">
                    Quelques informations suffisent pour commencer. Le reste se complète plus tard.
                </p>
                <OnboardingForm />
            </main>
        </div>
    )
}

// import { redirect } from 'next/navigation'
// import { createClient } from '@/lib/supabase/server'
// import { getCurrentOrganization } from '@/lib/organization'
// import { OnboardingForm } from './onboarding-form'

// export default async function OnboardingPage() {
//     const supabase = await createClient()
//     const { data } = await supabase.auth.getClaims()
//     if (!data?.claims) redirect('/login')

//     // Une entreprise existe déjà : inutile de repasser par ici
//     if (await getCurrentOrganization()) redirect('/dashboard')

//     return (
//         <div className="min-h-screen bg-[#F6F7F9]">
//             <header className="bg-[#1B2A41] px-8 py-3.5 text-white">
//                 <div className="flex items-center gap-2 text-[22px] font-extrabold">
//                     <span className="inline-block h-7 w-7 rounded-lg bg-[#E0A030]" />
//                     Sikabill
//                 </div>
//             </header>

//             <main className="mx-auto max-w-[520px] px-6 py-12">
//                 <p className="mb-2 text-[13px] font-semibold text-gray-600">Dernière étape</p>
//                 <h1 className="mb-2 text-3xl font-extrabold leading-tight text-[#1B2A41]">
//                     Parlons de votre activité
//                 </h1>
//                 <p className="mb-7 text-[15px] leading-relaxed text-gray-600">
//                     Quelques informations suffisent pour commencer. Le reste se complète plus tard.
//                 </p>
//                 <OnboardingForm />
//             </main>
//         </div>
//     )
// }