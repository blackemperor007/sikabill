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

// Ajoute des jours à une date AAAA-MM-JJ
export function addDays(iso: string, days: number): string {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

// Nombre de jours entre deux dates AAAA-MM-JJ (négatif si la seconde est avant la première)
export function daysBetween(fromISO: string, toISO: string): number {
    const [y1, m1, d1] = fromISO.split('-').map(Number)
    const [y2, m2, d2] = toISO.split('-').map(Number)
    return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000)
}

// Horodatage de la base (ex. 2026-11-24T10:15:00Z) affiché en JJ/MM/AAAA
export function formatTimestamp(ts: string | null): string {
    if (!ts) return '—'
    return new Date(ts).toLocaleDateString('fr-FR')
}