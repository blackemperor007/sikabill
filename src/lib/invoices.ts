import type { DisplayStatus } from '@/components/status-badge'

// Date du jour au format AAAA-MM-JJ, pour la comparer aux échéances
export function todayISO(): string {
    return new Date().toLocaleDateString('en-CA')
}

// Le statut affiché : « en retard » se calcule, il n'est jamais stocké (règle RG8)
export function displayStatus(
    inv: { status: string; due_date: string | null },
    today: string
): DisplayStatus {
    if (inv.status === 'issued' && inv.due_date && inv.due_date < today) return 'overdue'
    if (inv.status === 'issued' || inv.status === 'paid' || inv.status === 'void') return inv.status
    return 'draft'
}

// AAAA-MM-JJ devient JJ/MM/AAAA, sans passer par un fuseau horaire
export function formatDate(date: string | null): string {
    if (!date) return '—'
    const [y, m, d] = date.split('-')
    return `${d}/${m}/${y}`
}