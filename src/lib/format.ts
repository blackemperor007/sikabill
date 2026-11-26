export const plural = (n: number) => (n > 1 ? 's' : '')

export function initials(name: string): string {
    return (
        name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase())
            .join('') || '?'
    )
}

const dateFormat = (timeZone?: string) =>
    new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        ...(timeZone ? { timeZone } : {}),
    })

// AAAA-MM-JJ devient « 24 nov. 2026 »
export function shortDate(iso: string | null | undefined): string | null {
    if (!iso) return null
    return dateFormat('UTC').format(new Date(`${iso}T00:00:00Z`))
}

// Horodatage de la base devient « 24 nov. 2026 »
export function shortTimestamp(ts: string | null | undefined): string | null {
    if (!ts) return null
    return dateFormat().format(new Date(ts))
}