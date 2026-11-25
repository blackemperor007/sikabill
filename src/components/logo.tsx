export function Logo({ onDark = false, className = '' }: { onDark?: boolean; className?: string }) {
    return (
        <span className={`font-display font-bold tracking-tight ${className}`
        }>
            <span className={onDark ? 'text-white' : 'text-ink'}> Sika </span>
            < span className={onDark ? 'text-brand' : 'text-ink'} > bill </span>
        </span>
    )
}