import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer'
import { formatMoney } from '@/lib/money'
import { formatDate, formatTimestamp } from '@/lib/invoices'
import type { PdfLogo } from '@/lib/pdf-logo'

type Snapshot = Record<string, string | null | undefined>

export type PdfLine = { description: string; qty: string; unit: number; rate: string; ht: number }

export type InvoicePdfData = {
    number: string
    status: 'issued' | 'paid' | 'void'
    issueDate: string | null
    dueDate: string | null
    paidAt: string | null
    currency: string
    seller: Snapshot
    buyer: Snapshot
    logo: PdfLogo | null
    lines: PdfLine[]
    subtotal: number
    taxTotal: number
    total: number
    notes: string | null
}

// Pas de coupure de mots automatique
Font.registerHyphenationCallback((word) => [word])

const NAVY = '#1B2A41'
const GOLD = '#E0A030'
const GREY = '#4B5563'
const LINE = '#E5E7EB'

const s = StyleSheet.create({
    page: {
        paddingTop: 40,
        paddingBottom: 64,
        paddingHorizontal: 40,
        fontFamily: 'Helvetica',
        fontSize: 10,
        color: NAVY,
        lineHeight: 1.4,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingBottom: 16,
        borderBottomWidth: 2,
        borderBottomColor: GOLD,
    },
    sellerBlock: { maxWidth: 300 },
    logo: { width: 140, height: 56, objectFit: 'contain', objectPositionX: 0, marginBottom: 8 },
    sellerName: { fontFamily: 'Helvetica-Bold', fontSize: 15 },
    muted: { color: GREY, fontSize: 9 },
    docBlock: { alignItems: 'flex-end' },
    docTitle: { fontFamily: 'Helvetica-Bold', fontSize: 22 },
    statusVoid: { fontFamily: 'Helvetica-Bold', fontSize: 12, color: '#B91C1C', marginTop: 4 },
    statusPaid: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: '#15803D', marginTop: 4 },
    buyerBlock: { marginTop: 22 },
    label: { color: GREY, fontSize: 9, marginBottom: 2 },
    bold: { fontFamily: 'Helvetica-Bold' },
    tableHead: {
        flexDirection: 'row',
        marginTop: 24,
        paddingBottom: 6,
        borderBottomWidth: 1,
        borderBottomColor: NAVY,
    },
    row: { flexDirection: 'row', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: LINE },
    cDesc: { width: '40%', paddingRight: 8 },
    cQty: { width: '10%', textAlign: 'right' },
    cUnit: { width: '20%', textAlign: 'right' },
    cRate: { width: '12%', textAlign: 'right' },
    cTotal: { width: '18%', textAlign: 'right' },
    thText: { fontFamily: 'Helvetica-Bold', fontSize: 9, color: GREY },
    totals: { width: 230, alignSelf: 'flex-end', marginTop: 16 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    grandRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 6,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: NAVY,
    },
    grandText: { fontFamily: 'Helvetica-Bold', fontSize: 13 },
    notes: { marginTop: 28, color: GREY, fontSize: 9 },
    footer: {
        position: 'absolute',
        bottom: 24,
        left: 40,
        right: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
        fontSize: 8,
        color: GREY,
    },
})

// `Intl` sépare les milliers par une espace fine insécable (U+202F) que la police
// Helvetica d'un PDF ne sait pas afficher : on la remplace par une espace insécable.
const pdfSafe = (text: string) => text.replace(/\u202f/g, '\u00a0')

export function InvoicePdf(d: InvoicePdfData) {
    const m = (n: number) => pdfSafe(formatMoney(n, d.currency))
    const { seller, buyer } = d

    const rates = Array.from(new Set(d.lines.map((l) => l.rate)))
    const taxLabel = rates.length === 1 ? `TVA (${rates[0]} %)` : 'TVA'

    const idLine = [
        seller.tax_id && `NIU : ${seller.tax_id}`,
        seller.registration_number && `RCCM : ${seller.registration_number}`,
    ]
        .filter(Boolean)
        .join(' · ')
    const contactLine = [seller.phone, seller.email].filter(Boolean).join(' · ')

    return (
        <Document title={`Facture ${d.number}`} author={seller.name ?? undefined} >
            <Page size="A4" style={s.page} >
                <View style={s.header}>
                    <View style={s.sellerBlock}>
                        {d.logo && <Image src={{ data: d.logo.data, format: d.logo.format }} style={s.logo} />}
                        <Text style={s.sellerName}> {seller.name ?? ''} </Text>
                        {
                            seller.legal_name && seller.legal_name !== seller.name && (
                                <Text style={s.muted}> {seller.legal_name} </Text>
                            )
                        }
                        {seller.address && <Text style={s.muted}> {seller.address} </Text>}
                        {contactLine && <Text style={s.muted}> {contactLine} </Text>}
                        {idLine && <Text style={s.muted}> {idLine} </Text>}
                    </View>

                    < View style={s.docBlock} >
                        <Text style={s.docTitle}> FACTURE </Text>
                        < Text style={s.muted} > N° {d.number} </Text>
                        < Text style={s.muted} > Émise le {formatDate(d.issueDate)} </Text>
                        < Text style={s.muted} > Échéance : {formatDate(d.dueDate)} </Text>
                        {d.status === 'void' && <Text style={s.statusVoid}> ANNULÉE </Text>}
                        {
                            d.status === 'paid' && (
                                <Text style={s.statusPaid}> PAYÉE le {formatTimestamp(d.paidAt)} </Text>
                            )
                        }
                    </View>
                </View>

                < View style={s.buyerBlock} >
                    <Text style={s.label}> Facturé à </Text>
                    < Text style={s.bold} > {buyer.name ?? ''} </Text>
                    {buyer.address && <Text>{buyer.address} </Text>}
                    {buyer.tax_id && <Text>NIU : {buyer.tax_id} </Text>}
                </View>

                < View style={s.tableHead} >
                    <Text style={[s.cDesc, s.thText]}> Description </Text>
                    < Text style={[s.cQty, s.thText]} > Qté </Text>
                    < Text style={[s.cUnit, s.thText]} > Prix unitaire </Text>
                    < Text style={[s.cRate, s.thText]} > TVA </Text>
                    < Text style={[s.cTotal, s.thText]} > Total HT </Text>
                </View>

                {
                    d.lines.map((l, i) => (
                        <View key={i} style={s.row} wrap={false} >
                            <Text style={s.cDesc} > {l.description} </Text>
                            < Text style={s.cQty} > {l.qty} </Text>
                            < Text style={s.cUnit} > {m(l.unit)
                            } </Text>
                            < Text style={s.cRate} > {l.rate} % </Text>
                            < Text style={s.cTotal} > {m(l.ht)} </Text>
                        </View>
                    ))}

                <View style={s.totals} wrap={false} >
                    <View style={s.totalRow}>
                        <Text>Total HT </Text>
                        < Text > {m(d.subtotal)} </Text>
                    </View>
                    < View style={s.totalRow} >
                        <Text>{taxLabel} </Text>
                        < Text > {m(d.taxTotal)} </Text>
                    </View>
                    < View style={s.grandRow} >
                        <Text style={s.grandText}> Total TTC </Text>
                        < Text style={s.grandText} > {m(d.total)} </Text>
                    </View>
                </View>

                {
                    (d.notes || seller.payment_instructions) && (
                        <View style={s.notes} wrap={false} >
                            {d.notes && <Text>{d.notes} </Text>}
                            {
                                seller.payment_instructions && (
                                    <Text style={{ marginTop: d.notes ? 6 : 0 }}> {seller.payment_instructions} </Text>
                                )
                            }
                        </View>
                    )
                }

                <View style={s.footer} fixed >
                    <Text>{[seller.name, idLine].filter(Boolean).join(' · ')} </Text>
                    < Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
                </View>
            </Page>
        </Document>
    )
}