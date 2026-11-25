export type LineInput = {
    description: string
    quantity: string
    unit_price: string
    tax_rate: string
}

export type LineError = 'quantity' | 'unit_price' | 'tax_rate' | 'amount'

const ZERO = BigInt(0)
const B = (n: number) => BigInt(n)
const MAX_QTY = B(1000000000) // 1 000 000 en millièmes
const MAX_UNIT = B(100000000000) // 10^11 dans la plus petite unité
const MAX_LINE = B(10000000000000) // 10^13 par ligne

// Arrondi à l'entier le plus proche (0,5 arrondi vers le haut), comme round() en SQL
const roundDiv = (n: bigint, d: bigint) => (n * B(2) + d) / (B(2) * d)

// Convertit « 2,5 » ou « 350 000 » en entier mis à l'échelle (2,5 avec 3 décimales = 2500).
// Renvoie null si le texte n'est pas un nombre valide ou a trop de décimales.
export function parseScaled(input: string, decimals: number): bigint | null {
    const s = input.replace(/[\s\u00a0\u202f]/g, '').replace(',', '.')
    if (!/^\d+(\.\d+)?$/.test(s)) return null
    const [intPart, frac = ''] = s.split('.')
    if (frac.length > decimals && /[1-9]/.test(frac.slice(decimals))) return null
    return BigInt(intPart + (frac + '0'.repeat(decimals)).slice(0, decimals))
}

// 2500 avec 3 décimales devient « 2.500 » (format attendu par la base)
export function formatScaled(n: bigint, decimals: number): string {
    const s = n.toString().padStart(decimals + 1, '0')
    return decimals === 0 ? s : s.slice(0, -decimals) + '.' + s.slice(-decimals)
}

// 1925 devient « 19,25 » ; 2000 devient « 20 »
export function prettyRate(rate100: bigint): string {
    return formatScaled(rate100, 2).replace(/\.?0+$/, '').replace('.', ',')
}

// 350000 avec 0 décimale devient « 350000 » ; 1050 avec 2 décimales devient « 10,50 »
export function minorToInput(minor: number, digits: number): string {
    if (digits === 0) return String(minor)
    const s = String(Math.abs(minor)).padStart(digits + 1, '0')
    return s.slice(0, -digits) + ',' + s.slice(-digits)
}

export type ComputedLine = {
    qty1000: bigint
    unit: bigint
    rate100: bigint
    ht: bigint
    tax: bigint
}

export function computeLine(
    l: LineInput,
    digits: number
): { line?: ComputedLine; error?: LineError } {
    const qty1000 = parseScaled(l.quantity, 3)
    if (qty1000 === null || qty1000 <= ZERO || qty1000 > MAX_QTY) return { error: 'quantity' }

    const unit = parseScaled(l.unit_price, digits)
    if (unit === null || unit > MAX_UNIT) return { error: 'unit_price' }

    const rate100 = parseScaled(l.tax_rate, 2)
    if (rate100 === null || rate100 > B(10000)) return { error: 'tax_rate' }

    const product = qty1000 * unit
    const ht = roundDiv(product, B(1000)) // quantité × prix, arrondi
    const tax = roundDiv(product * rate100, B(10000000)) // × taux ÷ 100, arrondi par ligne
    if (ht > MAX_LINE) return { error: 'amount' }

    return { line: { qty1000, unit, rate100, ht, tax } }
}

export function computeTotals(lines: LineInput[], digits: number) {
    let subtotal = ZERO
    let tax = ZERO
    let hasInvalid = false
    const perLine: (bigint | null)[] = []
    const rates = new Set<string>()

    for (const l of lines) {
        const { line } = computeLine(l, digits)
        if (!line) {
            perLine.push(null)
            hasInvalid = true
            continue
        }
        perLine.push(line.ht)
        subtotal += line.ht
        tax += line.tax
        rates.add(prettyRate(line.rate100))
    }

    return { perLine, subtotal, tax, total: subtotal + tax, hasInvalid, rates: Array.from(rates) }
}