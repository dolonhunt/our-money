import { Logo } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="flex flex-col items-center gap-2.5">
        <Logo />
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Our Money</h1>
        <p className="text-sm text-sub">Two people. One financial picture.</p>
      </div>
      <div className="w-full max-w-[420px]">{children}</div>
    </div>
  );
}
