import Link from 'next/link'
import { cardClass } from '@/lib/ui'
import { CustomerForm } from '../customer-form'

export default function NewCustomerPage() {
    return (
        <>
            <Link href="/customers" className="mb-3 inline-block text-sm font-semibold underline underline-offset-2">
                ← Retour aux clients
            </Link>
            <h1 className="mb-6 text-3xl font-bold tracking-tight">Nouveau client</h1>
            <div className={`${cardClass} max-w-[720px]`}>
                <CustomerForm />
            </div>
        </>
    )
}

// import Link from 'next/link'
// import { CustomerForm } from '../customer-form'

// export default function NewCustomerPage() {
//     return (
//         <>
//             <Link href="/customers" className="mb-3 inline-block text-sm underline">
//                 ← Retour aux clients
//             </Link>
//             <h1 className="mb-6 text-3xl font-extrabold">Nouveau client</h1>
//             <div className="max-w-[720px]">
//                 <CustomerForm />
//             </div>
//         </>
//     )
// }