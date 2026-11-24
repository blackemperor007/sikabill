export type Country = {
    code: string
    name: string
    currency: string
    taxRate: string // taux proposé par défaut (vide = à saisir)
}

export const COUNTRIES: Country[] = [
    { code: 'CM', name: 'Cameroun', currency: 'XAF', taxRate: '19,25' },
    { code: 'CI', name: 'Côte d’Ivoire', currency: 'XOF', taxRate: '' },
    { code: 'SN', name: 'Sénégal', currency: 'XOF', taxRate: '' },
    { code: 'FR', name: 'France', currency: 'EUR', taxRate: '' },
]

export const CURRENCIES = [
    { code: 'XAF', label: 'FCFA (XAF)' },
    { code: 'XOF', label: 'FCFA (XOF)' },
    { code: 'EUR', label: 'Euro (EUR)' },
]