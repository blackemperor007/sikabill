import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Pages accessibles sans être connecté
const PUBLIC_PATHS = ['/login', '/signup']

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Vérifie la signature du jeton et le rafraîchit si besoin.
    // Ne rien insérer entre createServerClient et cette ligne.
    const { data } = await supabase.auth.getClaims()
    const isLoggedIn = Boolean(data?.claims)

    const path = request.nextUrl.pathname
    const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p))

    if (!isLoggedIn && !isPublic) return redirectTo(request, '/login', supabaseResponse)
    if (isLoggedIn && isPublic) return redirectTo(request, '/dashboard', supabaseResponse)

    return supabaseResponse
}

// Une redirection doit emporter les cookies rafraîchis, sinon la session se perd
function redirectTo(request: NextRequest, pathname: string, from: NextResponse) {
    const url = request.nextUrl.clone()
    url.pathname = pathname
    const response = NextResponse.redirect(url)
    from.cookies.getAll().forEach((cookie) => response.cookies.set(cookie))
    return response
}