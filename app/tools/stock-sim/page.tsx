"use client";

import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";
import { useMessages } from "@/lib/i18n/provider";
import { CostBasisCalculator } from "./cost-basis-calculator";

export default function StockSimPage() {
  const t = useMessages();
  return (
    <main className="mx-auto w-full max-w-6xl px-6 pt-10 pb-20">
      <Link
        href="/"
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {t.toolCommon.back}
      </Link>
      <header className="mt-6 mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {t.stockSim.title}
        </h1>
        <p className="mt-2 text-muted-foreground">{t.stockSim.description}</p>
      </header>
      <Tabs defaultValue="cost-basis">
        <TabsList>
          <TabsTrigger value="cost-basis">
            {t.stockSim.tabs.costBasis}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="cost-basis" className="mt-6">
          <CostBasisCalculator />
        </TabsContent>
      </Tabs>
    </main>
  );
}
