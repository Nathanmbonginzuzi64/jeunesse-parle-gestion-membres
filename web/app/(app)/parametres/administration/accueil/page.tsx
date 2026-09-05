import { redirect } from "next/navigation";

export default function LegacyHomePostsRedirect() {
  redirect("/posts-accueil");
}
