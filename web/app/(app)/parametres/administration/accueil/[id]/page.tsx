import { redirect } from "next/navigation";

export default async function LegacyEditHomePostRedirect({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolved = await Promise.resolve(params);
  redirect(`/posts-accueil/${resolved.id}`);
}
