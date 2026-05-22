"use client";

import type { CSSProperties } from "react";
import { Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SellRound = {
  n: number;
  price: number;
  cumulativeRisePct: number;
  shares: number;
  cumulativeShares: number;
  sellAmount: number;
  cumulativeSellAmount: number;
  realizedPnl: number;
};

type Props = {
  rounds: SellRound[];
  fmt: Intl.NumberFormat;
  fmtInt: Intl.NumberFormat;
  fmtCurrency: (n: number) => string;
  lastCompletedSellRound: number;
  onSellRoundClick: (n: number) => void;
  onReset: () => void;
  onExportCsv: () => void;
  tableTitle: string;
  legendCompleted: string;
  legendNextSell: string;
  legendReset: string;
  exportCsvLabel: string;
  colRound: string;
  colPrice: string;
  colRisePct: string;
  colShares: string;
  colCumShares: string;
  colSellAmount: string;
  colCumSellAmount: string;
  colRealizedPnl: string;
  emptyHint: string;
};

const COMPLETED_BG = "color-mix(in oklch, #facc15 15%, transparent)";
const NEXT_BG = "color-mix(in oklch, #22c55e 15%, transparent)";
const COMPLETED_SWATCH = "color-mix(in oklch, #facc15 30%, transparent)";
const NEXT_SWATCH = "color-mix(in oklch, #22c55e 30%, transparent)";

export function DcaDownSellDetail({
  rounds,
  fmt,
  fmtInt,
  fmtCurrency,
  lastCompletedSellRound,
  onSellRoundClick,
  onReset,
  onExportCsv,
  tableTitle,
  legendCompleted,
  legendNextSell,
  legendReset,
  exportCsvLabel,
  colRound,
  colPrice,
  colRisePct,
  colShares,
  colCumShares,
  colSellAmount,
  colCumSellAmount,
  colRealizedPnl,
  emptyHint,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{tableTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
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
              <span>{legendNextSell}</span>
            </div>
            <Button variant="outline" size="sm" onClick={onReset}>
              <RotateCcw className="size-3" />
              {legendReset}
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={onExportCsv}>
            <Download className="size-3" />
            {exportCsvLabel}
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">{colRound}</th>
                <th className="px-3 py-2 text-right font-medium">{colPrice}</th>
                <th className="px-3 py-2 text-right font-medium">
                  {colRisePct}
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  {colShares}
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  {colCumShares}
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  {colSellAmount}
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  {colCumSellAmount}
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  {colRealizedPnl}
                </th>
              </tr>
            </thead>
            <tbody>
              {rounds.length === 0 ? (
                <tr className="border-t border-border">
                  <td
                    colSpan={8}
                    className="px-3 py-8 text-center text-sm text-muted-foreground"
                  >
                    {emptyHint}
                  </td>
                </tr>
              ) : (
                rounds.map((r) => {
                  const isCompleted = r.n <= lastCompletedSellRound;
                  const isNext = r.n === lastCompletedSellRound + 1;
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
                  const pnlClass =
                    r.realizedPnl > 0
                      ? "text-[var(--color-gain)]"
                      : r.realizedPnl < 0
                        ? "text-[var(--color-loss)]"
                        : "";
                  return (
                    <tr
                      key={r.n}
                      className={rowClass}
                      style={rowStyle}
                      onClick={() => onSellRoundClick(r.n)}
                    >
                      <td className="tnum px-3 py-1.5">{r.n}</td>
                      <td className="tnum px-3 py-1.5 text-right">
                        {fmtCurrency(r.price)}
                      </td>
                      <td className="tnum px-3 py-1.5 text-right">
                        {fmt.format(r.cumulativeRisePct)}%
                      </td>
                      <td className="tnum px-3 py-1.5 text-right">
                        {fmtInt.format(r.shares)}
                      </td>
                      <td className="tnum px-3 py-1.5 text-right">
                        {fmtInt.format(r.cumulativeShares)}
                      </td>
                      <td className="tnum px-3 py-1.5 text-right">
                        {fmtCurrency(r.sellAmount)}
                      </td>
                      <td className="tnum px-3 py-1.5 text-right">
                        {fmtCurrency(r.cumulativeSellAmount)}
                      </td>
                      <td
                        className={cn(
                          "tnum px-3 py-1.5 text-right",
                          pnlClass,
                        )}
                      >
                        {fmtCurrency(r.realizedPnl)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
