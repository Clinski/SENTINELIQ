// Union Bank Online login page — restyled to match the bank's real login screen.
import UnionBankHeader from "@/components/UnionBankHeader";
import UnionBankFooter from "@/components/UnionBankFooter";
import LoginCard from "@/components/LoginCard";
import UssdPromo from "@/components/UssdPromo";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <UnionBankHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-2 sm:px-6">
        {/* Two columns on desktop: *826# promo on the left, login card on the right
            (mirroring the real Union Bank Online page). Stacks on mobile with the
            login first. */}
        <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="order-2 w-full max-w-xl lg:order-1">
            <UssdPromo />
          </div>
          <div className="order-1 flex w-full justify-center lg:order-2 lg:w-auto lg:justify-end">
            <LoginCard />
          </div>
        </div>
      </main>

      <UnionBankFooter />
    </div>
  );
}
