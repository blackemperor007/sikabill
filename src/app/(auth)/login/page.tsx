import { AuthShell } from '@/components/auth-shell'
import { LoginForm } from './login-form'

export default function LoginPage() {
    return (
        <AuthShell title="Bon retour" subtitle="Connectez-vous pour retrouver vos factures.">
            <LoginForm />
        </AuthShell>
    )
}