'use client'

import { useActionState } from 'react'
import { markInvoicePaid, voidInvoice, type InvoiceState } from './actions'
import { btn } from '@/lib/ui'

export function PayButton({ id }: { id: string }) {
    const [state, action, pending] = useActionState<InvoiceState, FormData>(markInvoicePaid, {})
    return (
        <form action={action}>
            <input type="hidden" name="id" value={id} />
            <button type="submit" disabled={pending} className={btn('primary')}>
                {pending ? 'Patientez…' : 'Marquer comme payée'}
            </button>
            {state.error && (
                <p role="alert" className="mt-2 max-w-[260px] text-xs font-semibold text-bad">
                    {state.error}
                </p>
            )}
        </form>
    )
}

export function VoidButton({ id }: { id: string }) {
    const [state, action, pending] = useActionState<InvoiceState, FormData>(voidInvoice, {})
    return (
        <form
            action={action}
            onSubmit={(e) => {
                if (
                    !confirm(
                        'Annuler cette facture ? Elle restera dans votre historique avec son numéro, mais ne pourra plus être modifiée ni payée.'
                    )
                )
                    e.preventDefault()
            }}
        >
            <input type="hidden" name="id" value={id} />
            <button type="submit" disabled={pending} className={`${btn('danger', 'sm')} w-full`}>
                {pending ? 'Patientez…' : 'Annuler la facture'}
            </button>
            {state.error && (
                <p role="alert" className="mt-2 text-xs font-semibold text-bad">
                    {state.error}
                </p>
            )}
        </form>
    )
}


// 'use client'

// import { useActionState } from 'react'
// import { markInvoicePaid, voidInvoice, type InvoiceState } from './actions'

// export function PayButton({ id }: { id: string }) {
//     const [state, action, pending] = useActionState<InvoiceState, FormData>(markInvoicePaid, {})
//     return (
//         <form action={action}>
//             <input type="hidden" name="id" value={id} />
//             <button
//                 type="submit"
//                 disabled={pending}
//                 className="min-h-[44px] rounded-[10px] bg-[#E0A030] px-[18px] text-sm font-bold text-[#1B2A41] disabled:opacity-60"
//             >
//                 {pending ? 'Patientez…' : 'Marquer comme payée'}
//             </button>
//             {state.error && (
//                 <p role="alert" className="mt-2 max-w-[260px] text-xs font-medium text-red-700">
//                     {state.error}
//                 </p>
//             )}
//         </form>
//     )
// }

// export function VoidButton({ id }: { id: string }) {
//     const [state, action, pending] = useActionState<InvoiceState, FormData>(voidInvoice, {})
//     return (
//         <form
//             action={action}
//             onSubmit={(e) => {
//                 if (
//                     !confirm(
//                         'Annuler cette facture ? Elle restera dans votre historique avec son numéro, mais ne pourra plus être modifiée ni payée.'
//                     )
//                 )
//                     e.preventDefault()
//             }}
//         >
//             <input type="hidden" name="id" value={id} />
//             <button
//                 type="submit"
//                 disabled={pending}
//                 className="min-h-[44px] w-full rounded-[10px] border border-red-300 bg-white text-sm font-semibold text-red-700 disabled:opacity-60"
//             >
//                 {pending ? 'Patientez…' : 'Annuler la facture'}
//             </button>
//             {state.error && (
//                 <p role="alert" className="mt-2 text-xs font-medium text-red-700">
//                     {state.error}
//                 </p>
//             )}
//         </form>
//     )
// }