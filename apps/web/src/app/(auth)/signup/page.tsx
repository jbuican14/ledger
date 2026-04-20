import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <div>
      {/* Mobile logo - shown only on small screens */}
      <div className="lg:hidden text-center mb-8">
        <h1 className="text-2xl font-bold">Ledger</h1>
        <p className="text-muted-foreground text-sm">
          Track your family finances
        </p>
      </div>

      <SignupForm />
    </div>
  );
}
