import { Logo } from '@/components/logo'
import { StatusBadge } from '@/components/status-badge'
import { inputClass, labelClass } from '@/lib/ui'

export function AuthShell({
    title,
    subtitle,
    children,
}: {
    title: string
    subtitle: string
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-canvas p-3 lg:p-4">
            <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1500px] gap-3 lg:min-h-[calc(100vh-2rem)] lg:grid-cols-[1.05fr_1fr] lg:gap-4">
                <section className="dark-zone flex flex-col justify-between gap-10 rounded-3xl bg-ink p-8 text-white lg:p-12">
                    <Logo onDark className="text-3xl" />

                    <div>
                        <p className="max-w-md font-display text-4xl font-bold leading-[1.1] tracking-tight lg:text-5xl">
                            Facturez vos clients en quelques clics.
                        </p>
                        <p className="mt-4 max-w-sm text-lg text-white/75">
                            Créez, envoyez et suivez vos factures au même endroit.
                        </p>

                        {/* Carte décorative : un exemple de facture, sans valeur réelle */}
                        <div
                            aria-hidden="true"
                            className="mt-8 hidden max-w-sm rounded-3xl bg-white p-5 text-ink md:block"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted">Facture n° 0042</span>
                                <StatusBadge status="issued" />
                            </div>
                            <p className="mt-3 font-display text-3xl font-bold tracking-tight">125 000 FCFA</p>
                            <svg viewBox="0 0 320 60" className="mt-3 h-14 w-full" fill="none">
                                <path
                                    d="M5 46 C 40 22, 70 42, 110 32 S 180 16, 215 32 S 280 20, 315 12"
                                    stroke="#ff6b00"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </div>
                    </div>

                    <p className="text-sm text-white/60">© {new Date().getFullYear()} Sikabill</p>
                </section>

                <section className="flex items-center justify-center rounded-3xl bg-paper p-8">
                    <div className="w-full max-w-sm">
                        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                        <p className="mb-6 mt-1 text-muted">{subtitle}</p>
                        {children}
                    </div>
                </section>
            </div>
        </div>
    )
}

export function Field({
    label,
    name,
    type = 'text',
    placeholder,
    autoComplete,
}: {
    label: string
    name: string
    type?: string
    placeholder?: string
    autoComplete?: string
}) {
    return (
        <div className="mb-4">
            <label htmlFor={name} className={labelClass}>
                {label}
            </label>
            <input
                id={name}
                name={name}
                type={type}
                placeholder={placeholder}
                autoComplete={autoComplete}
                required
                className={inputClass}
            />
        </div>
    )
}



// export function AuthShell({
//     title,
//     subtitle,
//     children,
// }: {
//     title: string
//     subtitle: string
//     children: React.ReactNode
// }) {
//     return (
//         <div className="flex min-h-screen flex-col md:flex-row">
//             <section className="flex flex-1 flex-col justify-between gap-10 bg-[#262626] p-10 text-white">
//                 <div className="flex items-center gap-2 text-2xl font-extrabold">
//                     <span className="inline-block h-8 w-8 rounded-lg bg-[#E0A030]" />
//                     Sikabill
//                 </div>
//                 <h2 className="max-w-md text-4xl font-extrabold leading-tight">
//                     Facturez simplement.
//                     <br />
//                     <span className="text-[#E0A030]">Soyez payé sereinement.</span>
//                 </h2>
//                 <p className="text-sm text-[#AEB9C7]">
//                     Pensé pour les freelances et les petites entreprises.
//                 </p>
//             </section>

//             <section className="flex flex-1 items-center justify-center bg-[#F6F7F9] p-8">
//                 <div className="w-full max-w-sm">
//                     <h1 className="text-3xl font-extrabold text-[#1B2A41]">{title}</h1>
//                     <p className="mb-6 mt-1 text-sm text-gray-600">{subtitle}</p>
//                     {children}
//                 </div>
//             </section>
//         </div>
//     )
// }

// export function Field({
//     label,
//     name,
//     type = 'text',
//     placeholder,
//     autoComplete,
// }: {
//     label: string
//     name: string
//     type?: string
//     placeholder?: string
//     autoComplete?: string
// }) {
//     return (
//         <div className="mb-4">
//             <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-gray-600">
//                 {label}
//             </label>
//             <input
//                 id={name}
//                 name={name}
//                 type={type}
//                 placeholder={placeholder}
//                 autoComplete={autoComplete}
//                 required
//                 className="min-h-[46px] w-full rounded-[10px] border border-gray-300 bg-white px-3 text-[15px] text-[#1B2A41]"
//             />
//         </div>
//     )
// }
