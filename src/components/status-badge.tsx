export type DisplayStatus = 'draft' | 'issued' | 'paid' | 'overdue' | 'void'

const STYLES: Record<DisplayStatus, { label: string; badge: string; dot: string }> = {
    draft: { label: 'Brouillon', badge: 'bg-gray-100 text-gray-600', dot: 'bg-[#6B7280]' },
    issued: { label: 'Émise', badge: 'bg-blue-100 text-blue-700', dot: 'bg-[#3B82F6]' },
    paid: { label: 'Payée', badge: 'bg-green-100 text-green-700', dot: 'bg-[#16A34A]' },
    overdue: { label: 'En retard', badge: 'bg-red-100 text-red-700', dot: 'bg-[#DC2626]' },
    void: { label: 'Annulée', badge: 'bg-gray-100 text-gray-500', dot: 'bg-[#9CA3AF]' },
}

export function StatusBadge({ status }: { status: DisplayStatus }) {
    const s = STYLES[status]
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.badge}`}
        >
            <i className={`inline-block h-2 w-2 rounded-full ${s.dot}`} />
            {s.label}
        </span>
    )
}