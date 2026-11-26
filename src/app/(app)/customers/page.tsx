import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrganization } from '@/lib/organization'
import { formatMoney } from '@/lib/money'
import { todayISO } from '@/lib/invoices'
import { initials } from '@/lib/format'
import { StatusBadge, type DisplayStatus } from '@/components/status-badge'
import { btn, cardClass, inputClass } from '@/lib/ui'

type SearchParams = Promise<{ q?: string; archived?: string }>

export default async function CustomersPage({ searchParams }: { searchParams: SearchParams }) {
    const { q = '', archived } = await searchParams
    const showArchived = archived === '1'
    const term = q.trim()

    const org = await getCurrentOrganization()
    if (!org) return null // la mise en page redirige déjà vers /onboarding

    const supabase = await createClient()

    let customersQuery = supabase
        .from('customers')
        .select('id, name, email, phone')
        .eq('organization_id', org.id)
        .order('name')
    customersQuery = showArchived
        ? customersQuery.not('archived_at', 'is', null)
        : customersQuery.is('archived_at', null)
    if (term) {
        // On retire les caractères qui ont un sens dans un filtre de recherche
        const t = term.replace(/[%_,()"\\*]/g, ' ').trim()
        if (t) customersQuery = customersQuery.or(`name.ilike."%${t}%",phone.ilike."%${t}%"`)
    }

    const [customersRes, invoicesRes] = await Promise.all([
        customersQuery,
        supabase
            .from('invoices')
            .select('customer_id, status, total, due_date')
            .eq('organization_id', org.id),
    ])
    if (customersRes.error || invoicesRes.error) throw new Error('Lecture des clients impossible')

    // Par client : nombre de factures, solde dû, retard, paiements
    const today = todayISO()
    const stats = new Map<
        string,
        { count: number; drafts: number; due: number; overdue: boolean; paid: number }
    >()
    for (const inv of invoicesRes.data ?? []) {
        const s = stats.get(inv.customer_id) ?? { count: 0, drafts: 0, due: 0, overdue: false, paid: 0 }
        s.count += 1
        if (inv.status === 'draft') s.drafts += 1
        if (inv.status === 'paid') s.paid += 1
        if (inv.status === 'issued') {
            s.due += Number(inv.total)
            if (inv.due_date && inv.due_date < today) s.overdue = true
        }
        stats.set(inv.customer_id, s)
    }

    const statusOf = (s?: { count: number; drafts: number; due: number; overdue: boolean; paid: number }): DisplayStatus | null => {
        if (!s || s.count === 0) return null
        if (s.overdue) return 'overdue'
        if (s.due > 0) return 'issued'
        if (s.paid > 0) return 'paid'
        return s.drafts === s.count ? 'draft' : null
    }

    const customers = customersRes.data ?? []

    return (
        <>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {showArchived ? 'Clients archivés' : 'Clients'}
                    </h1>
                    <p className="mt-1 text-muted">
                        {showArchived
                            ? 'Ces clients n’apparaissent plus dans vos listes, mais leurs factures sont conservées.'
                            : 'Gérez vos clients et leurs soldes.'}
                    </p>
                </div>
                {!showArchived && (
                    <Link href="/customers/new" className={btn('primary')}>
                        + Ajouter un client
                    </Link>
                )}
            </div>

            <form method="get" className="mb-4">
                {showArchived && <input type="hidden" name="archived" value="1" />}
                <label htmlFor="q" className="mb-1.5 block text-sm font-semibold">
                    Rechercher un client
                </label>
                <div className="flex gap-3">
                    <input
                        id="q"
                        name="q"
                        defaultValue={term}
                        placeholder="Nom ou téléphone"
                        className={`${inputClass} bg-paper`}
                    />
                    <button type="submit" className={btn('dark')}>
                        Rechercher
                    </button>
                </div>
            </form>

            <div className={`${cardClass} overflow-x-auto`}>
                {customers.length === 0 ? (
                    <div className="px-6 py-10 text-center">
                        <p className="font-bold">
                            {term
                                ? 'Aucun client ne correspond à cette recherche.'
                                : showArchived
                                    ? 'Aucun client archivé.'
                                    : 'Vous n’avez pas encore de client.'}
                        </p>
                        {!term && !showArchived && (
                            <p className="mt-1 text-sm text-muted">
                                Ajoutez votre premier client pour pouvoir lui envoyer une facture.
                            </p>
                        )}
                    </div>
                ) : (
                    <table className="w-full min-w-[720px] border-collapse text-sm">
                        <thead>
                            <tr className="text-left text-muted">
                                <th className="px-3 pb-3 font-medium">Client</th>
                                <th className="px-3 pb-3 font-medium">Téléphone</th>
                                <th className="px-3 pb-3 text-right font-medium">Factures</th>
                                <th className="px-3 pb-3 font-medium">Statut</th>
                                <th className="px-3 pb-3 text-right font-medium">Solde dû</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map((c) => {
                                const s = stats.get(c.id)
                                const st = statusOf(s)
                                return (
                                    <tr key={c.id} className="border-t border-mist">
                                        <td className="px-3 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <span
                                                    aria-hidden="true"
                                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warn-soft text-sm font-bold text-warn"
                                                >
                                                    {initials(c.name)}
                                                </span>
                                                <div>
                                                    <Link
                                                        href={`/customers/${c.id}`}
                                                        className="font-bold underline-offset-2 hover:underline"
                                                    >
                                                        {c.name}
                                                    </Link>
                                                    <p className="text-muted">{c.email ?? '—'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3.5">{c.phone ?? '—'}</td>
                                        <td className="px-3 py-3.5 text-right tabular-nums">{s?.count ?? 0}</td>
                                        <td className="px-3 py-3.5">{st ? <StatusBadge status={st} /> : '—'}</td>
                                        <td
                                            className={`px-3 py-3.5 text-right font-display font-bold tabular-nums ${s?.overdue ? 'text-bad' : ''
                                                }`}
                                        >
                                            {formatMoney(s?.due ?? 0, org.currency)}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            <p className="mt-4 text-sm">
                {showArchived ? (
                    <Link href="/customers" className="font-bold underline underline-offset-2">
                        Retour aux clients actifs
                    </Link>
                ) : (
                    <Link href="/customers?archived=1" className="font-bold underline underline-offset-2">
                        Voir les clients archivés
                    </Link>
                )}
            </p>
        </>
    )
}

// import Link from 'next/link'
// import { createClient } from '@/lib/supabase/server'
// import { getCurrentOrganization } from '@/lib/organization'
// import { formatMoney } from '@/lib/money'

// type SearchParams = Promise<{ q?: string; archived?: string }>

// export default async function CustomersPage({ searchParams }: { searchParams: SearchParams }) {
//     const { q = '', archived } = await searchParams
//     const showArchived = archived === '1'
//     const term = q.trim()

//     const org = await getCurrentOrganization()
//     if (!org) return null // la mise en page redirige déjà vers /onboarding

//     const supabase = await createClient()

//     let customersQuery = supabase
//         .from('customers')
//         .select('id, name, email, phone')
//         .eq('organization_id', org.id)
//         .order('name')
//     customersQuery = showArchived
//         ? customersQuery.not('archived_at', 'is', null)
//         : customersQuery.is('archived_at', null)
//     if (term) {
//         // Les caractères % et _ sont des jokers dans une recherche : on les neutralise
//         customersQuery = customersQuery.ilike('name', `%${term.replace(/[%_\\]/g, '\\$&')}%`)
//     }

//     const [customersRes, invoicesRes] = await Promise.all([
//         customersQuery,
//         supabase
//             .from('invoices')
//             .select('customer_id, status, total, due_date')
//             .eq('organization_id', org.id),
//     ])
//     if (customersRes.error || invoicesRes.error) {
//         throw new Error('Lecture des clients impossible')
//     }

//     // Par client : nombre de factures, montant à encaisser, présence d'un retard
//     const today = new Date().toLocaleDateString('en-CA') // AAAA-MM-JJ
//     const stats = new Map<string, { count: number; due: number; overdue: boolean }>()
//     for (const inv of invoicesRes.data ?? []) {
//         const s = stats.get(inv.customer_id) ?? { count: 0, due: 0, overdue: false }
//         s.count += 1
//         if (inv.status === 'issued') {
//             s.due += Number(inv.total)
//             if (inv.due_date && inv.due_date < today) s.overdue = true
//         }
//         stats.set(inv.customer_id, s)
//     }

//     const customers = customersRes.data ?? []

//     return (
//         <>
//             <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
//                 <div>
//                     <h1 className="text-3xl font-extrabold">
//                         {showArchived ? 'Clients archivés' : 'Clients'}
//                     </h1>
//                     <p className="mt-1 text-sm text-gray-600">
//                         {showArchived
//                             ? 'Ces clients n’apparaissent plus dans vos listes, mais leurs factures sont conservées.'
//                             : 'Les personnes et entreprises à qui vous facturez.'}
//                     </p>
//                 </div>
//                 {!showArchived && (
//                     <Link
//                         href="/customers/new"
//                         className="inline-flex min-h-[44px] items-center rounded-[10px] bg-[#E0A030] px-5 text-[15px] font-bold text-[#1B2A41]"
//                     >
//                         + Nouveau client
//                     </Link>
//                 )}
//             </div>

//             <form method="get" className="mb-4 flex max-w-md gap-2">
//                 {showArchived && <input type="hidden" name="archived" value="1" />}
//                 <label htmlFor="q" className="sr-only">
//                     Rechercher un client
//                 </label>
//                 <input
//                     id="q"
//                     name="q"
//                     defaultValue={term}
//                     placeholder="Rechercher un client"
//                     className="min-h-[46px] w-full rounded-[10px] border border-gray-300 bg-white px-3 text-[15px]"
//                 />
//                 <button
//                     type="submit"
//                     className="min-h-[46px] rounded-[10px] border border-gray-300 bg-white px-4 text-sm font-semibold"
//                 >
//                     Rechercher
//                 </button>
//             </form>

//             <div className="overflow-x-auto rounded-[14px] border border-gray-200 bg-white">
//                 {customers.length === 0 ? (
//                     <div className="px-6 py-12 text-center">
//                         <p className="font-semibold">
//                             {term
//                                 ? 'Aucun client ne correspond à cette recherche.'
//                                 : showArchived
//                                     ? 'Aucun client archivé.'
//                                     : 'Vous n’avez pas encore de client.'}
//                         </p>
//                         {!term && !showArchived && (
//                             <p className="mt-1 text-sm text-gray-600">
//                                 Ajoutez votre premier client pour pouvoir lui envoyer une facture.
//                             </p>
//                         )}
//                     </div>
//                 ) : (
//                     <table className="w-full min-w-[640px] border-collapse text-sm">
//                         <thead>
//                             <tr className="border-b border-gray-200 text-left text-xs font-semibold text-gray-600">
//                                 <th className="px-4 py-3">Nom</th>
//                                 <th className="px-4 py-3">E-mail</th>
//                                 <th className="px-4 py-3">Téléphone</th>
//                                 <th className="px-4 py-3 text-right">Factures</th>
//                                 <th className="px-4 py-3 text-right">À encaisser</th>
//                             </tr>
//                         </thead>
//                         <tbody>
//                             {customers.map((c) => {
//                                 const s = stats.get(c.id)
//                                 return (
//                                     <tr key={c.id} className="border-b border-gray-100 last:border-0">
//                                         <td className="px-4 py-3.5 font-semibold">
//                                             <Link href={`/customers/${c.id}`} className="underline-offset-2 hover:underline">
//                                                 {c.name}
//                                             </Link>
//                                         </td>
//                                         <td className="px-4 py-3.5">{c.email ?? '—'}</td>
//                                         <td className="px-4 py-3.5">{c.phone ?? '—'}</td>
//                                         <td className="px-4 py-3.5 text-right tabular-nums">{s?.count ?? 0}</td>
//                                         <td
//                                             className={`px-4 py-3.5 text-right font-semibold tabular-nums ${s?.overdue ? 'text-red-700' : ''
//                                                 }`}
//                                         >
//                                             {s && s.due > 0 ? formatMoney(s.due, org.currency) : '—'}
//                                         </td>
//                                     </tr>
//                                 )
//                             })}
//                         </tbody>
//                     </table>
//                 )}
//             </div>

//             <p className="mt-3 text-[13px]">
//                 {showArchived ? (
//                     <Link href="/customers" className="font-semibold underline">
//                         Retour aux clients actifs
//                     </Link>
//                 ) : (
//                     <Link href="/customers?archived=1" className="font-semibold underline">
//                         Voir les clients archivés
//                     </Link>
//                 )}
//             </p>
//         </>
//     )
// }