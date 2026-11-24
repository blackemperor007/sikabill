export function AuthShell({
    title,
    subtitle,
    children,
}: {
    title: string
    subtitle: string
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen flex-col md:flex-row">
            <section className="flex flex-1 flex-col justify-between gap-10 bg-[#262626] p-10 text-white">
                <div className="flex items-center gap-2 text-2xl font-extrabold">
                    <span className="inline-block h-8 w-8 rounded-lg bg-[#E0A030]" />
                    Sikabill
                </div>
                <h2 className="max-w-md text-4xl font-extrabold leading-tight">
                    Facturez simplement.
                    <br />
                    <span className="text-[#E0A030]">Soyez payé sereinement.</span>
                </h2>
                <p className="text-sm text-[#AEB9C7]">
                    Pensé pour les freelances et les petites entreprises.
                </p>
            </section>

            <section className="flex flex-1 items-center justify-center bg-[#F6F7F9] p-8">
                <div className="w-full max-w-sm">
                    <h1 className="text-3xl font-extrabold text-[#1B2A41]">{title}</h1>
                    <p className="mb-6 mt-1 text-sm text-gray-600">{subtitle}</p>
                    {children}
                </div>
            </section>
        </div>
    )
}

export function Field({
    label,
    name,
    type = 'text',
    placeholder,
    autoComplete,
}: {
    label: string
    name: string
    type?: string
    placeholder?: string
    autoComplete?: string
}) {
    return (
        <div className="mb-4">
            <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-gray-600">
                {label}
            </label>
            <input
                id={name}
                name={name}
                type={type}
                placeholder={placeholder}
                autoComplete={autoComplete}
                required
                className="min-h-[46px] w-full rounded-[10px] border border-gray-300 bg-white px-3 text-[15px] text-[#1B2A41]"
            />
        </div>
    )
}