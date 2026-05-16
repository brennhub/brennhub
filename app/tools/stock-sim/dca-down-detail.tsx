"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Round = {
  n: number;
  price: number;
  cumulativeDropPct: number;
  buyAmount: number;
  shares: number;
  cumulativeShares: number;
  cumulativeCost: number;
  avgPrice: number;
};

type Props = {
  rounds: Round[];
  fmt: Intl.NumberFormat;
  tableTitle: string;
  colRound: string;
  colPrice: string;
  colDropPct: string;
  colBuyAmount: string;
  colShares: string;
  colCumShares: string;
  colCumCost: string;
  colAvgPrice: string;
};

export function DcaDownDetail({
  rounds,
  fmt,
  tableTitle,
  colRound,
  colPrice,
  colDropPct,
  colBuyAmount,
  colShares,
  colCumShares,
  colCumCost,
  colAvgPrice,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{tableTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
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
              </tr>
            </thead>
            <tbody>
              {rounds.map((r) => (
                <tr key={r.n} className="border-t border-border">
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
