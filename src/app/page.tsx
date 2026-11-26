import Link from 'next/link'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Sikabill – Facturez vos clients en quelques clics',
  description: 'Créez des factures professionnelles, suivez vos paiements et gardez le contrôle de votre trésorerie, en FCFA.',
}

/* Routes des boutons */
const LOGIN_HREF = '/login'
const SIGNUP_HREF = '/signup'

/* Styles de boutons réutilisables */
const btn =
  'inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6B00]'
const btnOrange = `${btn} bg-[#FF6B00] text-white hover:bg-[#E85F00]`
const btnWhite = `${btn} bg-white text-[#111]`
const btnGhost = `${btn} border border-white/40 text-white hover:bg-white/10`
const btnDark = `${btn} bg-[#111] text-white`

function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`text-[26px] font-bold tracking-tight ${className}`}>
      Sika<span className="text-[#FF6B00]">bill</span>
    </span>
  )
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider dark:border-neutral-700">
      <i className="size-2 rounded-sm bg-[#FF6B00]" />
      {children}
    </span>
  )
}

const h2 = 'mt-4 max-w-[520px] text-[clamp(30px,4vw,46px)] font-semibold leading-[1.08] tracking-[-0.03em]'

export default function HomePage() {
  return (
    <div className="bg-white text-[#1a1a1a] [--page:#fff] dark:bg-[#121212] dark:text-[#f2f2f2] dark:[--page:#121212]">
      {/* ------------------------------ HERO ------------------------------ */}
      <header
        className="relative overflow-hidden text-white"
        style={{
          background:
            'radial-gradient(60% 45% at 50% 92%, rgba(255,107,0,.95) 0, rgba(255,107,0,0) 70%), linear-gradient(to bottom,#0b0b0b 0%,#0b0b0b 45%,#2a1204 66%,#8a3a05 80%,#FF8A33 90%,#FFD9BF 96%,var(--page) 100%)',
        }}
      >
        <div className="mx-auto max-w-[1160px] px-5 sm:px-7">
          <nav className="flex items-center justify-between py-5">
            <Link href="/">
              <Logo />
            </Link>
            <div className="hidden gap-8 text-sm text-white/80 md:flex">
              <a href="#apropos" className="hover:text-white">À propos</a>
              <a href="#outils" className="hover:text-white">Fonctionnalités</a>
              <a href="#demarrer" className="hover:text-white">Démarrer</a>
            </div>
            <div className="flex gap-2.5">
              <Link href={LOGIN_HREF} className={`${btnGhost} !h-10 !px-4 sm:!h-11 sm:!px-5`}>
                Se connecter
              </Link>
              <Link href={SIGNUP_HREF} className={`${btnOrange} !h-10 !px-4 sm:!h-11 sm:!px-5`}>
                S’enregistrer
              </Link>
            </div>
          </nav>

          <div className="grid items-start gap-10 pb-32 pt-10 md:grid-cols-[1.25fr_1fr] md:pt-14">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/25 px-3 py-1 text-xs text-white/85">
                <i className="size-[7px] rounded-full bg-[#FF6B00]" />
                La facturation simplifiée
              </span>
              <h1 className="mt-4 text-[clamp(40px,6.2vw,72px)] font-semibold leading-[1.02] tracking-[-0.035em]">
                Facturez.
                <br />
                Encaissez.
                <br />
                <span className="text-[#FF8A33]">Développez</span> votre activité.
              </h1>
            </div>
            <div className="pt-5">
              <p className="mb-6 max-w-sm text-[15px] text-white/80">
                Sikabill aide les freelances et les entreprises à créer des factures professionnelles, suivre les paiements et garder le
                contrôle de leur trésorerie, en FCFA.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href={SIGNUP_HREF} className={btnWhite}>Commencer gratuitement</Link>
                <a href="#outils" className={btnGhost}>Découvrir ›</a>
              </div>
            </div>
          </div>

          <div className="relative -mt-14 flex flex-col items-start justify-between gap-6 pb-16 md:flex-row md:items-end md:pb-20">
            <div className="flex items-center gap-3.5 text-[13px] text-[#2a2a2a]">
              <div className="flex">
                {[
                  ['AM', '#FF6B00'],
                  ['KB', '#262626'],
                  ['NT', '#E24F00'],
                ].map(([t, c], i) => (
                  <span
                    key={t}
                    className={`grid size-[38px] place-items-center rounded-full border-2 border-white text-xs font-bold text-white ${i ? '-ml-2.5' : ''}`}
                    style={{ background: c }}
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div>
                <div aria-label="5 étoiles" className="text-sm tracking-[2px] text-[#FF6B00]">★★★★★</div>
                <div>Pensé pour les entrepreneurs d’Afrique centrale</div>
              </div>
            </div>

            <div aria-hidden className="flex gap-3">
              <Tile bg="linear-gradient(160deg,#FFB27A,#FF6B00)">
                <path d="M12 5h18l8 8v30H12z" /><path d="M30 5v8h8M18 24h14M18 32h14" />
              </Tile>
              <Tile bg="linear-gradient(160deg,#FFD0B3,#FF8E5C)">
                <path d="M8 40V24M20 40V12M32 40V28M44 40H4" />
              </Tile>
              <Tile bg="linear-gradient(160deg,#5a5a5a,#262626)">
                <circle cx="24" cy="24" r="17" /><path d="M24 14v20M29 18h-7a4 4 0 000 8h4a4 4 0 010 8h-8" />
              </Tile>
            </div>
          </div>
        </div>
      </header>

      {/* ------------------------------ À PROPOS ------------------------------ */}
      <section id="apropos" className="py-16 md:py-[88px]">
        <div className="mx-auto max-w-[1160px] px-5 sm:px-7">
          <Chip>À propos</Chip>
          <div className="mt-1.5 grid gap-10 md:grid-cols-[1.1fr_1fr] md:gap-14">
            <div>
              <h2 className={h2}>
                Une facturation claire, pensée pour <span className="text-[#FF6B00]">votre réussite.</span>
              </h2>
              <div
                aria-hidden
                className="mt-10 h-[70px] w-[210px] opacity-30"
                style={{ backgroundImage: 'radial-gradient(#FF6B00 1.6px, transparent 1.8px)', backgroundSize: '22px 22px' }}
              />
            </div>
            <p className="m-0 text-[19px] font-medium leading-snug">
              Nous donnons aux petites entreprises les outils pour émettre leurs factures, relancer leurs clients et suivre leurs revenus, sans
              tableur ni paperasse.
            </p>
          </div>

          <div className="mt-12 grid gap-10 md:grid-cols-[1.1fr_1fr] md:gap-14">
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ['FCFA', 'Montants dans votre devise'],
                ['PDF', 'Factures prêtes à envoyer'],
                ['100 %', 'En ligne, partout'],
              ].map(([big, small]) => (
                <div key={big} className="rounded-[18px] bg-[#F6F6F6] p-5 dark:bg-[#1a1a1a]">
                  <b className="block text-[28px] tracking-tight">{big}</b>
                  <span className="text-[13px] text-neutral-500 dark:text-neutral-400">{small}</span>
                </div>
              ))}
            </div>
            <div>
              <h3 className="mb-3 text-[26px] font-semibold tracking-tight">Pourquoi Sikabill ?</h3>
              <p className="text-[15px] text-neutral-500 dark:text-neutral-400">
                De la création de la facture au suivi des retards de paiement, Sikabill réunit tout ce dont vous avez besoin au même endroit :
                clients, produits, factures et rapports. Concentrez-vous sur votre métier, on s’occupe du reste.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------ FONCTIONNALITÉS ------------------------------ */}
      <section id="outils" className="bg-[#F6F6F6] py-16 dark:bg-[#1a1a1a] md:py-[88px]">
        <div className="mx-auto max-w-[1160px] px-5 sm:px-7">
          <Chip>Fonctionnalités</Chip>
          <div className="flex flex-wrap items-end justify-between gap-8">
            <h2 className={h2}>
              Des outils puissants pour <span className="text-[#FF6B00]">votre activité.</span>
            </h2>
            <div>
              <p className="mb-4 max-w-[340px] text-sm text-neutral-500 dark:text-neutral-400">
                Tout ce qu’il faut pour facturer, encaisser et analyser, dans une interface simple.
              </p>
              <Link href={SIGNUP_HREF} className={btnDark}>Essayer maintenant</Link>
            </div>
          </div>

          <div className="mt-11 grid gap-6 md:grid-cols-3">
            <FeatureCard n="01" label="Factures professionnelles" title="Factures" bg="linear-gradient(160deg,#FF9A4D,#FF6B00 60%,#E24F00)">
              <rect x="30" y="14" width="60" height="78" rx="8" fill="#fff" fillOpacity=".95" />
              <rect x="40" y="28" width="30" height="6" rx="3" fill="#FF6B00" />
              <rect x="40" y="42" width="40" height="4" rx="2" fill="#ddd" />
              <rect x="40" y="52" width="40" height="4" rx="2" fill="#ddd" />
              <rect x="40" y="62" width="24" height="4" rx="2" fill="#ddd" />
              <rect x="40" y="74" width="40" height="8" rx="4" fill="#262626" />
            </FeatureCard>
            <FeatureCard n="02" label="Suivi des paiements" title="Suivi" bg="linear-gradient(160deg,#FFC9A8,#FF9E73 55%,#FF7A5C)">
              <rect x="22" y="58" width="20" height="40" rx="6" fill="#fff" fillOpacity=".9" />
              <rect x="50" y="36" width="20" height="62" rx="6" fill="#fff" />
              <rect x="78" y="16" width="20" height="82" rx="6" fill="#fff" fillOpacity=".9" />
            </FeatureCard>
            <FeatureCard n="03" label="Rapports clairs" title="Rapports" bg="linear-gradient(160deg,#4a4a4a,#262626 60%,#111)">
              <circle cx="60" cy="52" r="34" fill="#FF6B00" />
              <path d="M60 52V18a34 34 0 0129 17z" fill="#FFB27A" />
              <circle cx="60" cy="52" r="14" fill="#262626" />
            </FeatureCard>
          </div>
        </div>
      </section>

      {/* ------------------------------ DÉMARRER + CTA ------------------------------ */}
      <section id="demarrer" className="py-16 md:py-[88px]">
        <div className="mx-auto max-w-[1160px] px-5 sm:px-7">
          <Chip>Démarrer</Chip>
          <h2 className={h2}>
            Prêt en <span className="text-[#FF6B00]">trois étapes.</span>
          </h2>

          <div className="mt-11 grid gap-5 md:grid-cols-3">
            {[
              ['Créez votre compte', 'Renseignez votre entreprise en quelques minutes.'],
              ['Ajoutez vos clients', 'Enregistrez vos clients et vos produits ou services.'],
              ['Envoyez et encaissez', 'Émettez vos factures et suivez chaque paiement.'],
            ].map(([t, d], i) => (
              <div key={t} className="rounded-[20px] border border-neutral-200 p-6 dark:border-neutral-800">
                <em className="mb-4 grid size-9 place-items-center rounded-full bg-[#FFE9D9] font-bold not-italic text-[#FF6B00] dark:bg-[#3a2415]">
                  {i + 1}
                </em>
                <h4 className="mb-1.5 text-lg font-semibold">{t}</h4>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{d}</p>
              </div>
            ))}
          </div>

          <div className="relative mt-[72px] overflow-hidden rounded-[28px] bg-[#262626] px-5 py-12 text-center text-white sm:px-10 sm:py-16">
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-40 left-1/2 h-[300px] w-[620px] -translate-x-1/2"
              style={{ background: 'radial-gradient(closest-side, rgba(255,107,0,.7), transparent)' }}
            />
            <div className="relative">
              <h2 className={`${h2} mx-auto !mt-0 max-w-[640px]`}>Facturez vos clients en quelques clics.</h2>
              <p className="mx-auto mb-7 mt-3.5 max-w-[440px] text-white/70">
                Rejoignez Sikabill et gardez le contrôle de vos factures dès aujourd’hui.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href={SIGNUP_HREF} className={btnOrange}>S’enregistrer</Link>
                <Link href={LOGIN_HREF} className={btnGhost}>Se connecter</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------ FOOTER ------------------------------ */}
      <footer className="bg-[#0b0b0b] py-9 text-[13px] text-white/60">
        <div className="mx-auto flex max-w-[1160px] flex-wrap items-center justify-between gap-4 px-5 sm:px-7">
          <Logo className="!text-xl text-white" />
          <span>© {new Date().getFullYear()} Sikabill. Tous droits réservés.</span>
        </div>
      </footer>
    </div>
  )
}

/* --------------------------------- Sous-composants --------------------------------- */

function Tile({ bg, children }: { bg: string; children: ReactNode }) {
  return (
    <div className="grid h-[88px] w-[78px] place-items-center rounded-2xl shadow-[0_14px_30px_rgba(255,107,0,.25)] sm:h-[104px] sm:w-[92px]" style={{ background: bg }}>
      <svg viewBox="0 0 48 48" className="size-[42px]" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </div>
  )
}

function FeatureCard({ n, label, title, bg, children }: { n: string; label: string; title: string; bg: string; children: ReactNode }) {
  return (
    <div className="group">
      <div
        className="relative grid aspect-[1/1.02] place-items-center overflow-hidden rounded-[22px] text-white transition-transform duration-300 group-hover:-translate-y-1"
        style={{ background: bg }}
      >
        <svg viewBox="0 0 120 120" fill="none" className="-mt-8 w-[58%] drop-shadow-[0_18px_24px_rgba(0,0,0,.25)]">
          {children}
        </svg>
        <span className="absolute inset-x-0 bottom-6 text-center text-2xl font-semibold tracking-tight">{title}</span>
      </div>
      <div className="mt-3.5 flex items-center gap-3 text-sm font-medium">
        {n}
        <i className="h-px w-9 bg-neutral-400" />
        {label}
      </div>
    </div>
  )
}