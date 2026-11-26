'use client'

import { useActionState, useState } from 'react'
import { uploadLogo, removeLogo, type LogoState } from './logo-actions'
import { btn, cardClass } from '@/lib/ui'

const MAX_BYTES = 800 * 1024

export function LogoCard({ logoUrl, orgName }: { logoUrl: string | null; orgName: string }) {
    const [state, action, pending] = useActionState<LogoState, FormData>(uploadLogo, {})
    const [clientError, setClientError] = useState('')

    function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (file && file.size > MAX_BYTES) {
            setClientError(
                'Ce fichier dépasse 800 Ko. Compressez-le (par exemple avec TinyPNG) puis réessayez.'
            )
            e.target.value = ''
        } else {
            setClientError('')
        }
    }

    const error = clientError || state.error

    return (
        <section className={cardClass}>
            <h2 className="font-display text-lg font-bold">Logo</h2>
            <p className="mb-5 mt-1 text-sm text-muted">
                Il apparaîtra sur vos factures en PDF. PNG ou JPG, 800 Ko maximum (facultatif).
            </p>

            <div className="flex flex-wrap items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[#8c8c8c] bg-white">
                    {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={logoUrl}
                            alt={`Logo de ${orgName}`}
                            className="max-h-full max-w-full object-contain"
                        />
                    ) : (
                        <span aria-hidden="true" className="text-2xl text-muted">
                            +
                        </span>
                    )}
                </div>

                <form key={logoUrl ?? 'none'} action={action} className="flex flex-wrap items-center gap-3">
                    <input
                        type="file"
                        name="logo"
                        required
                        accept="image/png,image/jpeg"
                        aria-label="Choisir une image de logo"
                        onChange={onFileChange}
                        className="text-sm file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-full file:border-2 file:border-ink file:bg-transparent file:px-4 file:text-sm file:font-bold"
                    />
                    <button type="submit" disabled={pending} className={btn('primary', 'sm')}>
                        {pending ? 'Import…' : logoUrl ? 'Remplacer le logo' : 'Importer le logo'}
                    </button>
                </form>

                {logoUrl && (
                    <form action={removeLogo}>
                        <button type="submit" className={btn('danger', 'sm')}>
                            Retirer le logo
                        </button>
                    </form>
                )}
            </div>

            {error && (
                <p role="alert" className="mt-4 rounded-xl bg-bad-soft px-4 py-3 text-sm font-semibold text-bad">
                    {error}
                </p>
            )}
            {state.saved && !error && (
                <p role="status" className="mt-4 rounded-xl bg-ok-soft px-4 py-3 text-sm font-semibold text-ok">
                    Logo enregistré.
                </p>
            )}
        </section>
    )
}


// 'use client'

// import { useActionState, useState } from 'react'
// import { uploadLogo, removeLogo, type LogoState } from './logo-actions'

// const MAX_BYTES = 800 * 1024

// export function LogoCard({ logoUrl, orgName }: { logoUrl: string | null; orgName: string }) {
//     const [state, action, pending] = useActionState<LogoState, FormData>(uploadLogo, {})
//     const [clientError, setClientError] = useState('')

//     function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
//         const file = e.target.files?.[0]
//         if (file && file.size > MAX_BYTES) {
//             setClientError(
//                 'Ce fichier dépasse 800 Ko. Compressez-le (par exemple avec TinyPNG) puis réessayez.'
//             )
//             e.target.value = ''
//         } else {
//             setClientError('')
//         }
//     }

//     const error = clientError || state.error

//     return (
//         <section className="mb-6 rounded-[14px] border border-gray-200 bg-white p-6">
//             <h2 className="text-[17px] font-bold">Logo</h2>
//             <p className="mb-5 mt-1 text-[13px] text-gray-600">
//                 Il apparaîtra sur vos factures en PDF. PNG ou JPG, 800 Ko maximum.
//             </p>

//             <div className="flex flex-wrap items-center gap-4">
//                 <div className="flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-[14px] border-[1.5px] border-dashed border-gray-400 bg-white">
//                     {logoUrl ? (
//                         // eslint-disable-next-line @next/next/no-img-element
//                         <img
//                             src={logoUrl}
//                             alt={`Logo de ${orgName}`}
//                             className="max-h-full max-w-full object-contain"
//                         />
//                     ) : (
//                         <span className="text-[22px] font-extrabold text-gray-600">
//                             {orgName.trim().charAt(0).toUpperCase() || '?'}
//                         </span>
//                     )}
//                 </div>

//                 <form
//                     key={logoUrl ?? 'none'}
//                     action={action}
//                     className="flex flex-wrap items-center gap-3"
//                 >
//                     <input
//                         type="file"
//                         name="logo"
//                         required
//                         accept="image/png,image/jpeg"
//                         aria-label="Choisir une image de logo"
//                         onChange={onFileChange}
//                         className="text-sm file:mr-3 file:min-h-[44px] file:cursor-pointer file:rounded-[10px] file:border file:border-gray-300 file:bg-white file:px-4 file:text-sm file:font-semibold"
//                     />
//                     <button
//                         type="submit"
//                         disabled={pending}
//                         className="min-h-[44px] rounded-[10px] bg-[#E0A030] px-[18px] text-sm font-bold text-[#1B2A41] disabled:opacity-60"
//                     >
//                         {pending ? 'Import…' : logoUrl ? 'Remplacer le logo' : 'Importer le logo'}
//                     </button>
//                 </form>

//                 {logoUrl && (
//                     <form action={removeLogo}>
//                         <button
//                             type="submit"
//                             className="min-h-[44px] rounded-[10px] border border-gray-300 bg-white px-4 text-sm font-semibold text-red-700"
//                         >
//                             Retirer le logo
//                         </button>
//                     </form>
//                 )}
//             </div>

//             {error && (
//                 <p role="alert" className="mt-4 text-sm font-medium text-red-700">
//                     {error}
//                 </p>
//             )}
//             {state.saved && !error && (
//                 <p role="status" className="mt-4 text-sm font-medium text-green-700">
//                     Logo enregistré.
//                 </p>
//             )}
//         </section>
//     )
// }