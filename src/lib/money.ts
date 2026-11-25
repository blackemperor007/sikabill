// Nombre de décimales de la devise : XAF et XOF 0, EUR 2
export function currencyDigits(currency: string): number {
    return (
        new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).resolvedOptions()
            .maximumFractionDigits ?? 2
    )
}

// Les montants sont stockés en entiers dans la plus petite unité de la devise
// (XAF : 1 FCFA = 1 ; EUR : 1 € = 100 centimes). Cette fonction les affiche.
export function formatMoney(amount: number, currency: string): string {
    const digits = currencyDigits(currency)
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(
        amount / 10 ** digits
    )
}