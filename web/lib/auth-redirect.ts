import type { AuthUser } from "@/lib/types";
import { ROLE_SLUGS } from "@/lib/permissions";

export function getPostLoginPath(user: AuthUser): string {
  if (user.must_change_password) {
    return "/parametres/securite?onboarding=1";
  }
  if (user.must_confirm_biometric) {
    return "/parametres/biometrie?onboarding=1";
  }
  return user.role?.slug === ROLE_SLUGS.membre
    ? "/mon-espace"
    : user.role?.slug === ROLE_SLUGS.agentVerification
      ? "/verification"
      : "/tableau-de-bord";
}
