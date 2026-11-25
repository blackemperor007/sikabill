export type PdfLogo = { data: Buffer; format: 'png' | 'jpg' }

// Télécharge le logo pour l'intégrer au PDF. En cas de problème, renvoie null :
// la facture se génère alors sans logo plutôt que d'échouer.
export async function fetchLogo(url: string | null | undefined): Promise<PdfLogo | null> {
    if (!url) return null
    try {
        // On n'accepte que les fichiers hébergés par notre propre projet Supabase
        const allowedHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).host
        const u = new URL(url)
        if (u.protocol !== 'https:' || u.host !== allowedHost) return null

        const res = await fetch(u, { signal: AbortSignal.timeout(5000) })
        if (!res.ok) return null

        const buf = Buffer.from(await res.arrayBuffer())
        if (buf.length > 1024 * 1024) return null

        // On reconnaît le format par les premiers octets, pas par l'adresse
        if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)
            return { data: buf, format: 'png' }
        if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)
            return { data: buf, format: 'jpg' }
        return null
    } catch {
        return null
    }
}