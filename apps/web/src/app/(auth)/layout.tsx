import { CheckCircle2 } from "lucide-react";

const features = [
  "Track expenses in seconds",
  "Set savings goals & watch progress",
  "Share with your household",
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Form Side */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">{children}</div>
      </div>

      {/* Branding Side - Hidden on mobile */}
      <div className="hidden lg:flex flex-1 bg-primary/5 items-center justify-center p-12">
        <div className="max-w-md">
          <h1 className="text-4xl font-bold text-foreground mb-4">Ledger</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Know what&apos;s coming, control what goes out, track what happened.
          </p>

          <ul className="space-y-4">
            {features.map((feature, i) => (
              <li key={i} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="text-foreground">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
