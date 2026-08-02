import { useTranslate } from "@refinedev/core";
import {
  CircleDollarSign,
  PiggyBank,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/components/car/value";
import { useProfitabilitySummary } from "@/lib/car/analytics";
import {
  AnalyticsAIShortcut,
  AnalyticsCard,
  AnalyticsKpiCard,
  AnalyticsPageHeader,
  useAnalyticsAIContext,
} from "./shared";

export function ProfitabilityPage() {
  const translate = useTranslate();
  const { rows, winners, losers, totalIncome, totalCost, totalProfit, avgRoi } =
    useProfitabilitySummary();

  const aiContext = useAnalyticsAIContext({
    contextId: "analytics-profitability",
    titleKey: "car.analytics.profitability.title",
    getContext: () => ({
      resource: "analytics",
      report: "vehicle-profitability",
      winners,
      losers,
      totalIncome,
      totalCost,
      totalProfit,
      avgRoi,
      rows: rows.slice(0, 50).map((row) => ({
        plate: row.plate,
        vehicle: `${row.brand} ${row.model}`,
        category: row.category,
        income: row.income,
        maintenanceCost: row.maintenanceCost,
        insuranceCost: row.insuranceCost,
        violationCost: row.violationCost,
        totalCost: row.totalCost,
        profit: row.profit,
        roi: row.roi,
        verdict: row.verdict,
      })),
    }),
  });

  const chartData = useMemo(
    () =>
      rows.map((row) => ({
        name: row.plate,
        income: row.income,
        cost: row.totalCost,
      })),
    [rows]
  );

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => b.profit - a.profit),
    [rows]
  );

  return (
    <div ref={aiContext.ref} className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <AnalyticsPageHeader
          titleKey="car.analytics.profitability.title"
          descriptionKey="car.analytics.profitability.description"
        />
        <AnalyticsAIShortcut
          context={aiContext.context}
          contextId="analytics-profitability"
          titleKey="car.analytics.profitability.title"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AnalyticsKpiCard
          icon={<TrendingUp className="size-4" />}
          label={translate("car.analytics.profitability.winners", { ns: "car" }, "Winners")}
          value={String(winners)}
          hint={translate("car.analytics.profitability.winnerHint", { ns: "car" }, "Profitable vehicles")}
          tone="positive"
        />
        <AnalyticsKpiCard
          icon={<TrendingDown className="size-4" />}
          label={translate("car.analytics.profitability.losers", { ns: "car" }, "Losers")}
          value={String(losers)}
          hint={translate("car.analytics.profitability.loserHint", { ns: "car" }, "Money-losing vehicles")}
          tone="negative"
        />
        <AnalyticsKpiCard
          icon={<CircleDollarSign className="size-4" />}
          label={translate("car.analytics.profitability.income", { ns: "car" }, "Rental income")}
          value={formatMoney(totalIncome)}
          hint={translate("car.analytics.profitability.incomeHint", { ns: "car" }, "Booked, non-cancelled")}
        />
        <AnalyticsKpiCard
          icon={<PiggyBank className="size-4" />}
          label={translate("car.analytics.profitability.netProfit", { ns: "car" }, "Net profit")}
          value={formatMoney(totalProfit)}
          hint={formatMoney(totalCost)}
          tone={totalProfit >= 0 ? "positive" : "negative"}
        />
      </div>

      <AnalyticsCard
        title={translate(
          "car.analytics.profitability.chartTitle",
          { ns: "car" },
          "Income vs cost by vehicle"
        )}
        description={translate(
          "car.analytics.profitability.chartDescription",
          { ns: "car" },
          "Booked rental income compared to maintenance, insurance and violation costs"
        )}
      >
        <CardContent className="h-72 py-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={12}
                width={52}
                tickFormatter={(value) => `¥${Number(value) / 1000}k`}
              />
              <Tooltip
                formatter={(value) => formatMoney(Number(value))}
              />
              <Legend />
              <Bar dataKey="income" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cost" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </AnalyticsCard>

      <AnalyticsCard
        title={translate(
          "car.analytics.profitability.tableTitle",
          { ns: "car" },
          "Vehicle profitability ranking"
        )}
        description={translate(
          "car.analytics.profitability.tableDescription",
          { ns: "car" },
          "ROI = profit ÷ total cost. Sorted by profit."
        )}
      >
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{translate("car.analytics.vehicle", { ns: "car" }, "Vehicle")}</TableHead>
                <TableHead className="text-right">{translate("car.analytics.profitability.income", { ns: "car" }, "Income")}</TableHead>
                <TableHead className="text-right">{translate("car.analytics.profitability.maintenance", { ns: "car" }, "Maintenance")}</TableHead>
                <TableHead className="text-right">{translate("car.analytics.profitability.insurance", { ns: "car" }, "Insurance")}</TableHead>
                <TableHead className="text-right">{translate("car.analytics.profitability.violation", { ns: "car" }, "Violations")}</TableHead>
                <TableHead className="text-right">{translate("car.analytics.profitability.totalCost", { ns: "car" }, "Total cost")}</TableHead>
                <TableHead className="text-right">{translate("car.analytics.profitability.profit", { ns: "car" }, "Profit")}</TableHead>
                <TableHead className="text-right">{translate("car.analytics.profitability.roi", { ns: "car" }, "ROI")}</TableHead>
                <TableHead>{translate("car.analytics.verdict", { ns: "car" }, "Verdict")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRows.map((row) => (
                <TableRow key={row.vehicleId}>
                  <TableCell>
                    <div className="font-medium">{row.plate}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.brand} {row.model}
                      {row.category ? ` · ${row.category}` : ""}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(row.income)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatMoney(row.maintenanceCost)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatMoney(row.insuranceCost)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatMoney(row.violationCost)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(row.totalCost)}</TableCell>
                  <TableCell
                    className={`text-right font-semibold tabular-nums ${
                      row.profit > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : row.profit < 0
                          ? "text-red-600 dark:text-red-400"
                          : ""
                    }`}
                  >
                    {formatMoney(row.profit)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.roi === null ? "-" : `${(row.roi * 100).toFixed(1)}%`}
                  </TableCell>
                  <TableCell>
                    <VerdictBadge verdict={row.verdict} />
                  </TableCell>
                </TableRow>
              ))}
              {sortedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    {translate("car.analytics.empty", { ns: "car" }, "No data available.")}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </AnalyticsCard>
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: "winner" | "loser" | "neutral" }) {
  const translate = useTranslate();
  const config = {
    winner: {
      label: translate("car.analytics.profitability.verdictWinner", { ns: "car" }, "赚钱车"),
      className: "border-emerald-600/30 text-emerald-700 dark:text-emerald-400",
      dot: "bg-emerald-500",
    },
    loser: {
      label: translate("car.analytics.profitability.verdictLoser", { ns: "car" }, "亏钱车"),
      className: "border-red-600/30 text-red-700 dark:text-red-400",
      dot: "bg-red-500",
    },
    neutral: {
      label: translate("car.analytics.profitability.verdictNeutral", { ns: "car" }, "持平"),
      className: "border-border/80 text-muted-foreground",
      dot: "bg-muted-foreground",
    },
  }[verdict];

  return (
    <Badge variant="outline" className={`h-6 gap-1.5 rounded-md bg-card px-2 text-[11px] font-medium ${config.className}`}>
      <span aria-hidden="true" className={`size-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </Badge>
  );
}
