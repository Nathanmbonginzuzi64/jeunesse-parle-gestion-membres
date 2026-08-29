import Link from "next/link";
import { BrandMark } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-brand-500 p-10 text-white lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/10 blur-3xl"
        />
        <Link href="/" className="relative z-10">
          <BrandMark inverted subtitle="République Démocratique du Congo" size={48} />
        </Link>

        <div className="relative z-10 mx-auto w-full max-w-sm py-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.jpeg"
            alt="La Jeunesse Parle"
            className="mx-auto w-full max-w-[22rem] rounded-3xl object-cover shadow-2xl ring-4 ring-white/20"
          />
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-2xl leading-tight font-semibold">
            Inscrire, identifier et mobiliser la jeunesse congolaise.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/80">
            Un membre, un profil, un identifiant unique, une carte et un QR code vérifiable
            partout en RDC.
          </p>
        </div>
      </aside>

      <main className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <BrandMark subtitle="Gestion des membres · RDC" size={44} />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
