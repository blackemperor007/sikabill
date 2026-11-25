type Variant = 'primary' | 'dark' | 'outline' | 'danger'

const VARIANTS: Record<Variant, string> = {
    // L'orange porte toujours du texte anthracite (contraste suffisant)
    primary: 'bg-brand text-ink hover:bg-[#ff8533]',
    dark: 'bg-ink text-white hover:bg-[#3f3f3f]',
    outline: 'border-2 border-ink bg-transparent text-ink hover:bg-ink hover:text-white',
    danger: 'border-2 border-bad bg-transparent text-bad hover:bg-bad hover:text-white',
}

// Bouton en pilule : btn('primary'), btn('outline', 'sm')…
export function btn(variant: Variant = 'primary', size: 'md' | 'sm' = 'md') {
    const sizing = size === 'sm' ? 'min-h-11 px-5 text-sm' : 'min-h-12 px-6 text-[15px]'
    return `inline-flex ${sizing} items-center justify-center gap-2 rounded-full font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]}`
}

export const inputClass =
    'min-h-12 w-full rounded-xl border border-[#8c8c8c] bg-white px-4 text-[15px] text-ink placeholder:text-[#767676] disabled:bg-mist disabled:text-muted'

export const labelClass = 'mb-1.5 block text-sm font-semibold text-ink'

export const cardClass = 'rounded-3xl bg-paper p-6'