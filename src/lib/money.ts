// Les montants sont stockés en entiers dans la plus petite unité de la devise
// (XAF : 1 FCFA = 1 ; EUR : 1 € = 100 centimes). Cette fonction les affiche.
export function formatMoney(amount: number, currency: string): string {
    const fmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency })
    const digits = fmt.resolvedOptions().maximumFractionDigits ?? 2
    return fmt.format(amount / 10 ** digits)
}