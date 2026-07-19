// Union360 login — matches the SentinelIQ redesign reference: gradient hero
// with the wordmark and welcome copy, login card floating near the bottom.
import LoginCard from "@/components/LoginCard";

export default function LoginPage() {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{
        background: "linear-gradient(180deg, #42B4E6 0%, #8FD3ED 40%, #FFFFFF 78%)",
      }}
    >
      <div className="px-6 pt-14">
        <span className="font-heading text-xl font-extrabold text-u360-navy">
          Union<span className="text-white">360</span>
        </span>
      </div>

      <div className="px-6 pt-5">
        <h1 className="font-heading max-w-md text-2xl font-extrabold leading-tight text-u360-navy">
          Welcome back.
          <br />
          Let&apos;s get you signed in.
        </h1>
      </div>

      <div className="flex flex-1 flex-col items-center justify-end px-6 pb-16 pt-10">
        <LoginCard />
      </div>
    </div>
  );
}
