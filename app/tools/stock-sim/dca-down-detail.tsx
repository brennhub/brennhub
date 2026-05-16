"use client";

import type { CSSProperties } from "react";
import { Info } from "lucide-react";
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
  targetPrice: number;
};

type Props = {
  rounds: Round[];
  fmt: Intl.NumberFormat;
  fmtInt: Intl.NumberFormat;
  lastCompletedRound: number;
  onRoundClick: (n: number) => void;
  targetReturnPct: number;
  tableTitle: string;
  tableHelp: string;
  colRound: string;
  colPrice: string;
  colDropPct: string;
  colAvgPrice: string;
  colShares: string;
  colCumShares: string;
  colBuyAmount: string;
  colCumBuyAmount: string;
  colTargetPrice: string;
};

// Hardcoded row tints. Independent of the gain/loss color scheme so the
// completion indicator stays semantically clear regardless of locale or
// user color preference.
const COMPLETED_BG = "color-mix(in oklch, #facc15 15%, transparent)"; // yellow-400
const NEXT_BG = "color-mix(in oklch, #22c55e 15%, transparent)"; // green-500

export function DcaDownDetail({
  rounds,
  fmt,
  fmtInt,
  lastCompletedRound,
  onRoundClick,
  targetReturnPct,
  tableTitle,
  tableHelp,
  colRound,
  colPrice,
  colDropPct,
  colAvgPrice,
  colShares,
  colCumShares,
  colBuyAmount,
  colCumBuyAmount,
  colTargetPrice,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>{tableTitle}</CardTitle>
          <button
            type="button"
            className="group relative inline-flex"
            aria-label={tableHelp}
          >
            <Info className="size-3.5 cursor-help text-muted-foreground" />
            <span className="pointer-events-none invisible absolute left-1/2 top-full z-10 mt-2 w-72 max-w-[80vw] -translate-x-1/2 rounded-md border border-border bg-card px-3 py-2 text-xs leading-relaxed text-foreground opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 group-focus:visible group-focus:opacity-100">
              {tableHelp}
            </span>
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
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
