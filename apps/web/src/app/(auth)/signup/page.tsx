import Link from "next/link";
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

      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Create an account
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your email below to create your account
          </p>
        </div>

        <SignupForm />

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
