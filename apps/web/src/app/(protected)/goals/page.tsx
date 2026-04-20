"use client";

export default function GoalsPage() {
  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">Savings Goals</h1>

        <div className="bg-card border rounded-lg p-8 text-center">
          <p className="text-muted-foreground mb-4">
            No goals yet. Create your first savings goal!
          </p>
        </div>
      </div>
    </div>
  );
}
