import type { SVGProps } from 'react'

function Icon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        />
    )
}

export const IconGrid = (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </Icon>
)

export const IconDoc = (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
        <path d="M7 3h7l5 5v13H7z" />
        <path d="M14 3v5h5" />
        <path d="M10 13h6M10 17h6" />
    </Icon>
)

export const IconUsers = (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
        <circle cx="17.5" cy="9" r="2.5" />
        <path d="M17 14.2c2.7.3 4.5 2.2 4.5 5.3" />
    </Icon>
)

export const IconSliders = (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
        <path d="M3 6h10M17 6h4M3 12h4M11 12h10M3 18h12M19 18h2" />
        <circle cx="15" cy="6" r="2" />
        <circle cx="9" cy="12" r="2" />
        <circle cx="17" cy="18" r="2" />
    </Icon>
)

export const IconLogout = (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
        <path d="M9 4H5v16h4" />
        <path d="M16 8l4 4-4 4" />
        <path d="M20 12H9" />
    </Icon>
)