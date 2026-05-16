"use client";

import type { CSSProperties } from "react";
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
  buyAmount: number;
  shares: number;
  cumulativeShares: number;
  cumulativeCost: number;
  avgPrice: number;
  targetPrice: number;
};

type Props = {
  rounds: Round[];
  fmt: Intl.NumberFormat;
  nextBuyRound: number;
  onRoundClick: (n: number) => void;
  tableTitle: string;
  colRound: string;
  colPrice: string;
  colDropPct: string;
  colBuyAmount: string;
  colShares: string;
  colCumShares: string;
  colCumCost: string;
  colAvgPrice: string;
  colTargetPrice: string;
};

export function DcaDownDetail({
  rounds,
  fmt,
  nextBuyRound,
  onRoundClick,
  tableTitle,
  colRound,
  colPrice,
  colDropPct,
  colBuyAmount,
  colShares,
  colCumShares,
  colCumCost,
  colAvgPrice,
  colTargetPrice,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{tableTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">{colRound}</th>
                <th className="px-3 py-2 text-right font-medium">{colPrice}</th>
                <th className="px-3 py-2 text-right font-medium">
                  {colDropPct}
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  {colBuyAmount}
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  {colShares}
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  {colCumShares}
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  {colCumCost}
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  {colAvgPrice}
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  {colTargetPrice}
                </th>
              </tr>
            </thead>
            <tbody>
              {rounds.map((r) => {
                const isPast = r.n < nextBuyRound;
                const isNext = r.n === nextBuyRound;
                const rowClass = cn(
                  "cursor-pointer border-t border-border transition-colors",
                  isPast &&
                    "bg-muted/30 text-muted-foreground hover:bg-muted/50",
                  isNext && "font-medium",
                  !isPast && !isNext && "hover:bg-muted/20",
                );
                const rowStyle: CSSProperties | undefined = isNext
                  ? {
                      backgroundColor:
                        "color-mix(in oklch, var(--color-gain) 15%, transparent)",
                    }
                  : undefined;
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
                      {fmt.format(r.buyAmount)}
                    </td>
                    <td className="tnum px-3 py-1.5 text-right">
                      {fmt.format(r.shares)}
                    </td>
                    <td className="tnum px-3 py-1.5 text-right">
                      {fmt.format(r.cumulativeShares)}
                    </td>
                    <td className="tnum px-3 py-1.5 text-right">
                      {fmt.format(r.cumulativeCost)}
                    </td>
                    <td className="tnum px-3 py-1.5 text-right">
                      {fmt.format(r.avgPrice)}
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
