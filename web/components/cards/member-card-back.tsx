import { Logo } from "@/components/brand/logo";

export function MemberCardBack({
  organization,
  verificationUrl,
}: {
  organization: string;
  verificationUrl: string | null;
}) {
  return (
    <div className="print-area w-full max-w-[28rem] rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700 shadow-md">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <Logo size={28} />
        <p className="font-semibold text-slate-900">{organization}</p>
      </div>
      <div className="mt-4 space-y-2 text-xs leading-relaxed">
        <p>Cette carte atteste de l&apos;appartenance à Jeunesse Parle. Le QR code ne contient aucune donnée personnelle.</p>
        <p>En cas de perte, contactez immédiatement votre structure pour désactivation et remplacement.</p>
        {verificationUrl && (
          <p className="font-mono text-[10px] text-slate-500 break-all">{verificationUrl}</p>
        )}
        <p className="pt-2 text-slate-400">République Démocratique du Congo · www.jeunesseparle.cd</p>
      </div>
    </div>
  );
}
