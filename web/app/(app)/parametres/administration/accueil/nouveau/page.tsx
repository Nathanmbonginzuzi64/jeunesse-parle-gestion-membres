import { redirect } from "next/navigation";

export default function LegacyNouveauHomePostRedirect() {
  redirect("/posts-accueil/nouveau");
}
