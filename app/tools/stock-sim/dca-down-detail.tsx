"use client";

import type { CSSProperties } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Round = {
  n: number;
  price: number;
  cumulativeDropPct: number;
  avgPrice: number;
  shares: number;
  cumulativeShares: number;
  buyAmount: number;
  cumulativeBuyAmount: number;
  profit: number;
  targetPrice: number;
};

type Props = {
  rounds: Round[];
  fmt: Intl.NumberFormat;
  fmtInt: Intl.NumberFormat;
  lastCompletedRound: number;
  onRoundClick: (n: number) => void;
  onReset: () => void;
  targetReturnPct: number;
  tableTitle: string;
  legendCompleted: string;
  legendNextBuy: string;
  legendReset: string;
  colRound: string;
  colPrice: string;
  colDropPct: string;
  colAvgPrice: string;
  colShares: string;
  colCumShares: string;
  colBuyAmount: string;
  colCumBuyAmount: string;
  colProfit: string;
  colTargetPrice: string;
};

// Hardcoded row tints. Independent of the gain/loss color scheme so the
// completion indicator stays semantically clear regardless of locale or
// user color preference.
const COMPLETED_BG = "color-mix(in oklch, #facc15 15%, transparent)"; // yellow-400
const NEXT_BG = "color-mix(in oklch, #22c55e 15%, transparent)"; // green-500
// Legend swatches use a stronger tint so they read clearly outside the table.
const COMPLETED_SWATCH = "color-mix(in oklch, #facc15 30%, transparent)";
const NEXT_SWATCH = "color-mix(in oklch, #22c55e 30%, transparent)";

export function DcaDownDetail({
  rounds,
  fmt,
  fmtInt,
  lastCompletedRound,
  onRoundClick,
  onReset,
  targetReturnPct,
  tableTitle,
  legendCompleted,
  legendNextBuy,
  legendReset,
  colRound,
  colPrice,
  colDropPct,
  colAvgPrice,
  colShares,
  colCumShares,
  colBuyAmount,
  colCumBuyAmount,
  colProfit,
  colTargetPrice,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{tableTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span
              className="inline-block size-3 rounded"
              style={{ backgroundColor: COMPLETED_SWATCH }}
            />
            <span>{legendCompleted}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block size-3 rounded"
              style={{ backgroundColor: NEXT_SWATCH }}
            />
            <span>{legendNextBuy}</span>
          </div>
          <Button variant="outline" size="sm" onClick={onReset}>
            <RotateCcw className="size-3" />
            {legendReset}
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">{colRound}</th>
                <th className="px-3 py-2 text-right font-medium">{colPrice}</th>
                <th className="px-3 py-2 text-right font-medium">
                  {colDropPct}
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  {colAvgPrice}
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  {colShares}
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  {colCumShares}
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  {colBuyAmount}
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  {colCumBuyAmount}
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  {colProfit}
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  {colTargetPrice} ({fmt.format(targetReturnPct)}%)
                </th>
              </tr>
            </thead>
            <tbody>
              {rounds.map((r) => {
                const isCompleted = r.n <= lastCompletedRound;
                const isNext = r.n === lastCompletedRound + 1;
                const rowClass = cn(
                  "cursor-pointer border-t border-border transition-colors",
                  (isCompleted || isNext) && "font-medium",
                  !isCompleted && !isNext && "hover:bg-muted/20",
                );
                let rowStyle: CSSProperties | undefined;
                if (isCompleted) {
                  rowStyle = { backgroundColor: COMPLETED_BG };
                } else if (isNext) {
                  rowStyle = { backgroundColor: NEXT_BG };
                }
                const profitClass =
                  r.profit > 0
                    ? "text-[var(--color-gain)]"
                    : r.profit < 0
                      ? "text-[var(--color-loss)]"
                      : "";
                return (
                  <tr
                    key={r.n}
                    className={rowClass}
                    style={rowStyle}
                    onClick={() => onRoundClick(r.n)}
                  >
                    <td className="tnum px-3 py-1.5">{r.n}</td>
                    <td className="tnum px-3 py-1.5 text-right">
                      {fmt.format(r.price)}
                    </td>
                    <td className="tnum px-3 py-1.5 text-right">
                      {fmt.format(r.cumulativeDropPct)}%
                    </td>
                    <td className="tnum px-3 py-1.5 text-right">
                      {fmt.format(r.avgPrice)}
                    </td>
                    <td className="tnum px-3 py-1.5 text-right">
                      {fmtInt.format(r.shares)}
                    </td>
                    <td className="tnum px-3 py-1.5 text-right">
                      {fmtInt.format(r.cumulativeShares)}
                    </td>
                    <td className="tnum px-3 py-1.5 text-right">
                      {fmt.format(r.buyAmount)}
                    </td>
                    <td className="tnum px-3 py-1.5 text-right">
                      {fmt.format(r.cumulativeBuyAmount)}
                    </td>
                    <td className={cn("tnum px-3 py-1.5 text-right", profitClass)}>
                      {fmt.format(r.profit)}
                    </td>
                    <td className="tnum px-3 py-1.5 text-right">
                      {fmt.format(r.targetPrice)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
