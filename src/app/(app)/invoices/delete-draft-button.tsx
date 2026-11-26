'use client'

import { deleteDraft } from './actions'
import { btn } from '@/lib/ui'

export function DeleteDraftButton({ id }: { id: string }) {
    return (
        <form
            action={deleteDraft}
            onSubmit={(e) => {
                if (!confirm('Supprimer définitivement ce brouillon ?')) e.preventDefault()
            }}
        >
            <input type="hidden" name="id" value={id} />
            <button type="submit" className={btn('danger', 'sm')}>
                Supprimer le brouillon
            </button>
        </form>
    )
}

// 'use client'

// import { deleteDraft } from "./actions"


// export function DeleteDraftButton({ id }: { id: string }) {
//     return (
//         <form
//             action={deleteDraft}
//             onSubmit={(e) => {
//                 if (!confirm('Supprimer définitivement ce brouillon ?')) e.preventDefault()
//             }}
//         >
//             <input type="hidden" name="id" value={id} />
//             <button
//                 type="submit"
//                 className="min-h-[44px] rounded-[10px] border border-gray-300 px-4 text-sm font-semibold text-red-700"
//             >
//                 Supprimer le brouillon
//             </button>
//         </form>
//     )
// }