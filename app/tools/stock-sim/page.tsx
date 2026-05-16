"use client";

import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";
import { ColorSchemeToggle } from "@/components/color-scheme-toggle";
import { useMessages } from "@/lib/i18n/provider";
import { CostBasisCalculator } from "./cost-basis-calculator";
import { DividendCalculator } from "./dividend-calculator";
import { DcaDownCalculator } from "./dca-down-calculator";

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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="cost-basis">
              {t.stockSim.tabs.costBasis}
            </TabsTrigger>
            <TabsTrigger value="dividend">
              {t.stockSim.tabs.dividend}
            </TabsTrigger>
            <TabsTrigger value="dca-down">
              {t.stockSim.tabs.dcaDown}
            </TabsTrigger>
          </TabsList>
          <ColorSchemeToggle />
        </div>
        <TabsContent value="cost-basis" className="mt-6">
          <CostBasisCalculator />
        </TabsContent>
        <TabsContent value="dividend" className="mt-6">
          <DividendCalculator />
        </TabsContent>
        <TabsContent value="dca-down" className="mt-6">
          <DcaDownCalculator />
        </TabsContent>
      </Tabs>
    </main>
  );
}
