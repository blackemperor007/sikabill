import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrganization } from '@/lib/organization'
import { currencyDigits } from '@/lib/money'
import { computeLine, minorToInput, prettyRate } from '@/lib/invoice-math'
import { InvoicePdf, type InvoicePdfData, type PdfLine } from '@/lib/invoice-pdf'
import { fetchLogo } from '@/lib/pdf-logo'
import { isUuid } from '@/lib/validators'

export const runtime = 'nodejs'

type Snapshot = Record<string, string | null | undefined>

const plain = (message: string, status: number) =>
    new Response(message, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!isUuid(id)) return plain('Facture introuvable.', 404)

    const supabase = await createClient()
    const { data: claimsData } = await supabase.auth.getClaims()
    if (!claimsData?.claims) return plain('Connexion requise.', 401)

    try {
        const org = await getCurrentOrganization()
        if (!org) return plain('Entreprise introuvable.', 404)

        const { data: inv, error } = await supabase
            .from('invoices')
            .select(
                'id, number, status, currency, issue_date, due_date, paid_at, notes, subtotal, tax_total, total, seller_snapshot, customer_snapshot'
            )
            .eq('id', id)
            .eq('organization_id', org.id)
            .maybeSingle()
        if (error) throw new Error(error.message)

        // Un brouillon n'a pas de numéro : pas de document officiel
        if (!inv || inv.status === 'draft' || !inv.number) return plain('Facture introuvable.', 404)

        const { data: items, error: itemsError } = await supabase
            .from('invoice_items')
            .select('description, quantity, unit_price, tax_rate')
            .eq('invoice_id', inv.id)
            .order('position')
        if (itemsError) throw new Error(itemsError.message)

        const digits = currencyDigits(inv.currency)
        const lines: PdfLine[] = (items ?? []).map((it) => {
            const { line } = computeLine(
                {
                    description: it.description,
                    quantity: String(Number(it.quantity)),
                    unit_price: minorToInput(Number(it.unit_price), digits),
                    tax_rate: String(Number(it.tax_rate)),
                },
                digits
            )
            return {
                description: it.description,
                qty: String(Number(it.quantity)).replace('.', ','),
                unit: Number(it.unit_price),
                rate: line ? prettyRate(line.rate100) : String(Number(it.tax_rate)).replace('.', ','),
                ht: line ? Number(line.ht) : 0,
            }
        })

        // Les informations de l'entreprise et du client sont celles figées à l'émission
        const seller: Snapshot = { name: org.name, ...((inv.seller_snapshot ?? {}) as Snapshot) }
        const buyer = (inv.customer_snapshot ?? {}) as Snapshot
        const logo = await fetchLogo(seller.logo_url)

        const data: InvoicePdfData = {
            number: inv.number,
            status: inv.status as InvoicePdfData['status'],
            issueDate: inv.issue_date,
            dueDate: inv.due_date,
            paidAt: inv.paid_at,
            currency: inv.currency,
            seller,
            buyer,
            logo,
            lines,
            subtotal: Number(inv.subtotal),
            taxTotal: Number(inv.tax_total),
            total: Number(inv.total),
            notes: inv.notes,
        }

        const buffer = await renderToBuffer(InvoicePdf(data) as Parameters<typeof renderToBuffer>[0])
        const filename = `${inv.number.replace(/[^A-Za-z0-9_-]/g, '_')}.pdf`

        return new Response(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'private, no-store',
            },
        })
    } catch (e) {
        console.error('Génération du PDF impossible :', e)
        return plain('Impossible de générer le PDF. Réessayez dans un instant.', 500)
    }
}