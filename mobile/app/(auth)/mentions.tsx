import { DocScreen } from '@/components/doc-screen';
import { MENTIONS_SECTIONS } from '@/lib/legal-content';

export default function MentionsScreen() {
  return (
    <DocScreen
      kicker="À propos"
      title="Mentions légales"
      intro="Informations sur l’éditeur, l’application et le contact Jeunesse Parle."
      sections={MENTIONS_SECTIONS}
    />
  );
}
