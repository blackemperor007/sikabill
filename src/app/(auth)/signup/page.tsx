import { AuthShell } from '@/components/auth-shell'
import { SignupForm } from './signup-form'

export default function SignupPage() {
    return (
        <AuthShell title="Créez votre compte" subtitle="Votre première facture en quelques minutes.">
            <SignupPage />
        </AuthShell>
    )
}