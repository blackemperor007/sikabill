import { btn, inputClass, labelClass, cardClass } from '@/lib/ui'
import { StatusBadge } from '@/components/status-badge'
import { Logo } from '@/components/logo'

const COLORS = [
    { name: 'Orange', hex: '#FF6B00', cls: 'bg-brand' },
    { name: 'Anthracite', hex: '#262626', cls: 'bg-ink' },
    { name: 'Blanc', hex: '#FFFFFF', cls: 'bg-paper border border-[#d4d4d8]' },
    { name: 'Gris clair', hex: '#F4F4F4', cls: 'bg-mist border border-[#d4d4d8]' },
]

export default function StyleguidePage() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Style Sikabill</h1>

            <section className={cardClass}>
                <h2 className="mb-4 text-lg font-bold">Couleurs</h2>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    {COLORS.map((c) => (
                        <div key={c.name}>
                            <div className={`h-20 rounded-2xl ${c.cls}`} />
                            <p className="mt-2 text-sm font-bold">{c.name}</p>
                            <p className="text-sm text-muted">{c.hex}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className={cardClass}>
                <h2 className="mb-4 text-lg font-bold">Le nom sur chaque fond</h2>
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="flex h-24 items-center justify-center rounded-2xl bg-ink text-3xl">
                        <Logo onDark />
                    </div>
                    <div className="flex h-24 items-center justify-center rounded-2xl border border-[#d4d4d8] bg-paper text-3xl">
                        <Logo />
                    </div>
                    <div className="flex h-24 items-center justify-center rounded-2xl bg-brand text-3xl">
                        <Logo />
                    </div>
                </div>
            </section>

            <section className={cardClass}>
                <h2 className="mb-4 text-lg font-bold">Typographie</h2>
                <p className="font-display text-4xl font-bold tracking-tight">
                    Facture n° 0042 <span className="ml-3 text-3xl">125 000 FCFA</span>
                </p>
                <p className="mt-2 text-sm text-muted">
                    Space Grotesk pour les titres et les montants · Inter pour le texte courant
                </p>
            </section>

            <section className={cardClass}>
                <h2 className="mb-4 text-lg font-bold">Boutons</h2>
                <div className="flex flex-wrap gap-3">
                    <button className={btn('primary')}>Créer une facture</button>
                    <button className={btn('dark')}>Ajouter un client</button>
                    <button className={btn('outline')}>Annuler</button>
                    <button className={btn('danger')}>Annuler la facture</button>
                    <button className={btn('primary')} disabled>
                        Désactivé
                    </button>
                    <button className={btn('outline', 'sm')}>Petit bouton</button>
                </div>
            </section>

            <section className={cardClass}>
                <h2 className="mb-4 text-lg font-bold">Statuts</h2>
                <div className="flex flex-wrap gap-2">
                    <StatusBadge status="draft" />
                    <StatusBadge status="issued" />
                    <StatusBadge status="paid" />
                    <StatusBadge status="overdue" />
                    <StatusBadge status="void" />
                </div>
            </section>

            <section className={cardClass}>
                <h2 className="mb-4 text-lg font-bold">Champ et ligne de liste</h2>
                <div className="max-w-sm">
                    <label htmlFor="demo" className={labelClass}>
                        Nom du client
                    </label>
                    <input id="demo" className={inputClass} placeholder="Boutique Aminata" />
                </div>
                <div className="mt-5 flex items-center justify-between rounded-2xl bg-mist p-4">
                    <div>
                        <p className="font-bold">Client exemple</p>
                        <p className="text-sm text-muted">Facture 0042 · échéance dans 7 jours</p>
                    </div>
                    <p className="font-display text-xl font-bold">125 000 FCFA</p>
                </div>
            </section>
        </div>
    )
}