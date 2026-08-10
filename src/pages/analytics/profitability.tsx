import { useTranslate } from "@refinedev/core";
import {
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  PiggyBank,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
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
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/components/car/value";
import {
  useProfitabilitySummary,
  type ProfitabilityRow,
} from "@/lib/car/analytics";
import {
  AnalyticsAIShortcut,
  AnalyticsCard,
  AnalyticsKpiCard,
  AnalyticsPageHeader,
  useAnalyticsAIContext,
} from "./shared";
import {
  AnalyticsExportButton,
  AnalyticsStates,
  AnalyticsTopNSelect,
  exportAnalyticsCsv,
} from "./toolbar";

type VerdictFilter = "all" | ProfitabilityRow["verdict"];
type SortKey = "income" | "totalCost" | "profit" | "roi";
type SortDirection = "asc" | "desc";

const VERDICT_FILTERS: Array<{
  value: VerdictFilter;
  labelKey: string;
  fallback: string;
}> = [
  {
    value: "all",
    labelKey: "car.analytics.profitability.verdictAll",
    fallback: "All",
  },
  {
    value: "winner",
    labelKey: "car.analytics.profitability.verdictWinner",
    fallback: "Money makers",
  },
  {
    value: "loser",
    labelKey: "car.analytics.profitability.verdictLoser",
    fallback: "Losing money",
  },
  {
    value: "neutral",
    labelKey: "car.analytics.profitability.verdictNeutral",
    fallback: "Break-even",
  },
];

export function ProfitabilityPage() {
  const translate = useTranslate();
  const navigate = useNavigate();
  const [category, setCategory] = useState("all");
  const [verdict, setVerdict] = useState<VerdictFilter>("all");
  const [topN, setTopN] = useState<number | "all">(10);
  const [sortKey, setSortKey] = useState<SortKey>("profit");
  const [sortDirection, setSortDirection] =
    useState<SortDirection>("desc");
  const {
    rows,
    winners,
    losers,
    totalIncome,
    totalCost,
    totalProfit,
    avgRoi,
    isLoading,
    isError,
    refetch,
  } = useProfitabilitySummary();

  const categoryOptions = useMemo(
    () =>
      [...new Set(rows.flatMap((row) => (row.category ? [row.category] : [])))].sort(
        (left, right) => left.localeCompare(right)
      ),
    [rows]
  );

  const filteredRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          (category === "all" || row.category === category) &&
          (verdict === "all" || row.verdict === verdict)
      ),
    [category, rows, verdict]
  );

  const sortedRows = useMemo(
    () =>
      [...filteredRows].sort((left, right) => {
        const leftValue = left[sortKey];
        const rightValue = right[sortKey];
        if (leftValue === null) return rightValue === null ? 0 : 1;
        if (rightValue === null) return -1;
        const result = leftValue - rightValue;
        return sortDirection === "asc" ? result : -result;
      }),
    [filteredRows, sortDirection, sortKey]
  );

  const chartRows = useMemo(() => {
    const worstFirst = [...filteredRows].sort(
      (left, right) => left.profit - right.profit
    );
    return topN === "all" ? worstFirst : worstFirst.slice(0, topN);
  }, [filteredRows, topN]);

  const chartData = useMemo(
    () =>
      chartRows.map((row) => ({
        name: row.plate,
        income: row.income,
        cost: row.totalCost,
      })),
    [chartRows]
  );

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

  const updateSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("desc");
  };

  const chartScope =
    topN === "all"
      ? translate(
          "car.analytics.profitability.chartAll",
          { ns: "car" },
          "All lowest-profit vehicles"
        )
      : translate(
          "car.analytics.profitability.chartTopN",
          { ns: "car" },
          "{{count}} lowest-profit vehicles"
        ).replace("{{count}}", String(topN));

  const exportRows = () => {
    exportAnalyticsCsv(
      "vehicle-profitability.csv",
      [
        translate("car.analytics.plate", { ns: "car" }, "Plate"),
        translate("car.analytics.brand", { ns: "car" }, "Brand"),
        translate("car.analytics.model", { ns: "car" }, "Model"),
        translate("car.analytics.category", { ns: "car" }, "Category"),
        translate(
          "car.analytics.profitability.income",
          { ns: "car" },
          "Income"
        ),
        translate(
          "car.analytics.profitability.maintenance",
          { ns: "car" },
          "Maintenance"
        ),
        translate(
          "car.analytics.profitability.insurance",
          { ns: "car" },
          "Insurance"
        ),
        translate(
          "car.analytics.profitability.violation",
          { ns: "car" },
          "Violations"
        ),
        translate(
          "car.analytics.profitability.totalCost",
          { ns: "car" },
          "Total cost"
        ),
        translate(
          "car.analytics.profitability.profit",
          { ns: "car" },
          "Profit"
        ),
        translate(
          "car.analytics.profitability.roi",
          { ns: "car" },
          "ROI"
        ),
        translate("car.analytics.verdict", { ns: "car" }, "Verdict"),
      ],
      sortedRows.map((row) => [
        row.plate,
        row.brand,
        row.model,
        row.category,
        row.income,
        row.maintenanceCost,
        row.insuranceCost,
        row.violationCost,
        row.totalCost,
        row.profit,
        row.roi === null ? null : `${(row.roi * 100).toFixed(1)}%`,
        row.verdict,
      ])
    );
  };

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

      <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border bg-card p-3">
        <div className="flex flex-wrap items-end gap-4">
          <label className="space-y-1 text-xs text-muted-foreground">
            <span>
              {translate(
                "car.analytics.profitability.filterCategory",
                { ns: "car" },
                "Vehicle class"
              )}
            </span>
            <NativeSelect
              size="sm"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <NativeSelectOption value="all">
                {translate(
                  "car.analytics.profitability.allCategories",
                  { ns: "car" },
                  "All classes"
                )}
              </NativeSelectOption>
              {categoryOptions.map((option) => (
                <NativeSelectOption key={option} value={option}>
                  {option}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">
              {translate(
                "car.analytics.profitability.filterVerdict",
                { ns: "car" },
                "Verdict"
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-muted/30 p-0.5">
              {VERDICT_FILTERS.map((option) => (
                <Button
                  key={option.value}
                  variant={verdict === option.value ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setVerdict(option.value)}
                >
                  {translate(option.labelKey, { ns: "car" }, option.fallback)}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <AnalyticsExportButton onExport={exportRows} />
      </div>

      <AnalyticsCard
        title={translate(
          "car.analytics.profitability.chartTitle",
          { ns: "car" },
          "Income vs cost by vehicle"
        )}
        description={`${translate(
          "car.analytics.profitability.chartDescription",
          { ns: "car" },
          "Booked rental income compared to maintenance, insurance and violation costs"
        )} · ${chartScope}`}
      >
        <CardContent className="space-y-3 py-4">
          <div className="flex justify-end">
            <AnalyticsTopNSelect
              value={topN}
              onChange={setTopN}
              options={[10, 20, "all"]}
            />
          </div>
          <AnalyticsStates
            isLoading={isLoading}
            isError={isError}
            isEmpty={filteredRows.length === 0}
            onRetry={() => void refetch()}
          >
            <div className="h-72">
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
                  <Tooltip formatter={(value) => formatMoney(Number(value))} />
                  <Legend />
                  <Bar dataKey="income" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cost" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </AnalyticsStates>
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
          <AnalyticsStates
            isLoading={isLoading}
            isError={isError}
            isEmpty={filteredRows.length === 0}
            onRetry={() => void refetch()}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{translate("car.analytics.vehicle", { ns: "car" }, "Vehicle")}</TableHead>
                  <SortableTableHead
                    label={translate("car.analytics.profitability.income", { ns: "car" }, "Income")}
                    active={sortKey === "income"}
                    direction={sortDirection}
                    onClick={() => updateSort("income")}
                  />
                  <TableHead className="text-right">{translate("car.analytics.profitability.maintenance", { ns: "car" }, "Maintenance")}</TableHead>
                  <TableHead className="text-right">{translate("car.analytics.profitability.insurance", { ns: "car" }, "Insurance")}</TableHead>
                  <TableHead className="text-right">{translate("car.analytics.profitability.violation", { ns: "car" }, "Violations")}</TableHead>
                  <SortableTableHead
                    label={translate("car.analytics.profitability.totalCost", { ns: "car" }, "Total cost")}
                    active={sortKey === "totalCost"}
                    direction={sortDirection}
                    onClick={() => updateSort("totalCost")}
                  />
                  <SortableTableHead
                    label={translate("car.analytics.profitability.profit", { ns: "car" }, "Profit")}
                    active={sortKey === "profit"}
                    direction={sortDirection}
                    onClick={() => updateSort("profit")}
                  />
                  <SortableTableHead
                    label={translate("car.analytics.profitability.roi", { ns: "car" }, "ROI")}
                    active={sortKey === "roi"}
                    direction={sortDirection}
                    onClick={() => updateSort("roi")}
                  />
                  <TableHead>{translate("car.analytics.verdict", { ns: "car" }, "Verdict")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRows.map((row) => (
                  <TableRow
                    key={row.vehicleId}
                    className="cursor-pointer transition-colors hover:bg-accent/30"
                    onClick={() => navigate(`/scm_vehicles/profile/${row.vehicleId}`)}
                  >
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
              </TableBody>
            </Table>
          </AnalyticsStates>
        </CardContent>
      </AnalyticsCard>
    </div>
  );
}

function SortableTableHead({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
}) {
  return (
    <TableHead
      className="text-right"
      aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        className="ml-auto inline-flex items-center gap-1 hover:text-foreground"
        onClick={onClick}
      >
        {label}
        {active ? (
          direction === "asc" ? (
            <ChevronUp className="size-3.5" />
          ) : (
            <ChevronDown className="size-3.5" />
          )
        ) : null}
      </button>
    </TableHead>
  );
}

function VerdictBadge({ verdict }: { verdict: "winner" | "loser" | "neutral" }) {
  const translate = useTranslate();
  const config = {
    winner: {
      label: translate("car.analytics.profitability.verdictWinner", { ns: "car" }, "Money maker"),
      className: "border-emerald-600/30 text-emerald-700 dark:text-emerald-400",
      dot: "bg-emerald-500",
    },
    loser: {
      label: translate("car.analytics.profitability.verdictLoser", { ns: "car" }, "Losing money"),
      className: "border-red-600/30 text-red-700 dark:text-red-400",
      dot: "bg-red-500",
    },
    neutral: {
      label: translate("car.analytics.profitability.verdictNeutral", { ns: "car" }, "Break-even"),
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
