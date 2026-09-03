import { DocScreen } from '@/components/doc-screen';
import { TERMS_SECTIONS } from '@/lib/legal-content';

export default function ConditionsScreen() {
  return (
    <DocScreen
      kicker="Règles d’usage"
      title="Conditions d’utilisation"
      intro="En utilisant l’application Jeunesse Parle, vous acceptez les règles ci-dessous."
      sections={TERMS_SECTIONS}
    />
  );
}
