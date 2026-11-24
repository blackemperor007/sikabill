import { getCurrentOrganization } from '@/lib/organization'

export default async function DashboardPage() {
    const org = await getCurrentOrganization()

    return (
        <>
            <h1 className="text-3xl font-extrabold">Tableau de bord</h1>
            <p className="mt-2 text-gray-600">
                {org?.name} · Devise : {org?.currency} · TVA par défaut : {org?.default_tax_rate} %
            </p>
            <p className="mt-6 text-sm text-gray-600">
                Le tableau de bord complet sera construit à la fin de l’étape 6.
            </p>
        </>
    )
}