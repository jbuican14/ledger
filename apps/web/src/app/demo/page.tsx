import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-950 dark:to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2">Ledger Demo</h1>
          <p className="text-lg text-muted-foreground">
            Three flows showing the complete user experience
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Flow 1: Login */}
          <Link href="/demo/login">
            <div className="bg-card border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-4">
                  <span className="text-2xl">🔐</span>
                </div>
                <h2 className="text-2xl font-bold mb-2">1. Login</h2>
                <p className="text-muted-foreground text-sm">
                  Email/password signin + Google OAuth option. See form validation and error states.
                </p>
              </div>
              <div className="flex items-center text-primary mt-4 font-medium">
                View flow <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            </div>
          </Link>

          {/* Flow 2: Onboarding */}
          <Link href="/demo/onboarding">
            <div className="bg-card border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center mb-4">
                  <span className="text-2xl">🚀</span>
                </div>
                <h2 className="text-2xl font-bold mb-2">2. Onboarding</h2>
                <p className="text-muted-foreground text-sm">
                  Quick setup: household name, currency selection. Gets users to the dashboard in ~30 seconds.
                </p>
              </div>
              <div className="flex items-center text-primary mt-4 font-medium">
                View flow <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            </div>
          </Link>

          {/* Flow 3: Dashboard */}
          <Link href="/demo/dashboard">
            <div className="bg-card border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
                  <span className="text-2xl">📊</span>
                </div>
                <h2 className="text-2xl font-bold mb-2">3. Dashboard</h2>
                <p className="text-muted-foreground text-sm">
                  Authenticated dashboard with budget, goals, category breakdown, and recent transactions.
                </p>
              </div>
              <div className="flex items-center text-primary mt-4 font-medium">
                View flow <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            </div>
          </Link>
        </div>

        <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 className="font-semibold mb-2">💡 About This Demo</h3>
          <p className="text-sm text-muted-foreground">
            This is a design reference built with actual Tailwind CSS classes from the app. All three flows are interactive and show the exact component structure you'll need to design in Figma. See <code className="bg-background px-2 py-1 rounded text-xs">FIGMA_DESIGN_SPEC.md</code> for detailed specs.
          </p>
        </div>
      </div>
    </div>
  );
}
