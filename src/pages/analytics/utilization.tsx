import { useTranslate } from "@refinedev/core";
import { CalendarDays, Gauge, Megaphone, Percent } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/components/car/value";
import { useUtilization } from "@/lib/car/analytics";
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

function buildMonthOptions(): string[] {
  const options: string[] = [];
  const now = new Date();
  for (let offset = 0; offset < 6; offset++) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    options.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  }
  return options;
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function previousCalendarMonth(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number);
  const date = new Date(year, monthIndex - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function UtilizationPage() {
  const translate = useTranslate();
  const navigate = useNavigate();
  const [month, setMonth] = useState<string>(currentMonth());
  const [topN, setTopN] = useState<number | "all">(15);
  const monthOptions = useMemo(buildMonthOptions, []);
  const previousMonth = useMemo(() => previousCalendarMonth(month), [month]);
  const { data, isLoading, isError, refetch } = useUtilization(month);
  const {
    data: previousData,
    isLoading: isPreviousLoading,
    isError: isPreviousError,
    refetch: refetchPrevious,
  } = useUtilization(previousMonth);
  const rows = useMemo(() => data ?? [], [data]);
  const previousRows = useMemo(() => previousData ?? [], [previousData]);

  const avgUtilization = useMemo(
    () =>
      rows.length > 0
        ? rows.reduce((sum, row) => sum + row.utilization, 0) / rows.length
        : 0,
    [rows]
  );
  const lowCount = useMemo(
    () => rows.filter((row) => row.lowUtilization).length,
    [rows]
  );
  const previousAvgUtilization = useMemo(
    () =>
      previousRows.length > 0
        ? previousRows.reduce((sum, row) => sum + row.utilization, 0) /
          previousRows.length
        : 0,
    [previousRows]
  );
  const utilizationChange = (avgUtilization - previousAvgUtilization) * 100;
  const maxUtilization = useMemo(
    () =>
      rows.length > 0
        ? Math.max(...rows.map((row) => row.utilization))
        : 0,
    [rows]
  );

  const aiContext = useAnalyticsAIContext({
    contextId: "analytics-utilization",
    titleKey: "car.analytics.utilization.title",
    getContext: () => ({
      resource: "analytics",
      report: "utilization",
      month,
      avgUtilization,
      lowCount,
      rows: [...rows]
        .sort((a, b) => a.utilization - b.utilization)
        .slice(0, 50)
        .map((row) => ({
          plate: row.plate,
          vehicle: `${row.brand} ${row.model}`,
          category: row.category,
          occupiedDays: row.occupiedDays,
          daysInMonth: row.daysInMonth,
          utilization: row.utilization,
          lowUtilization: row.lowUtilization,
        })),
    }),
  });

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => a.utilization - b.utilization),
    [rows]
  );
  const chartRows = useMemo(
    () => (topN === "all" ? sortedRows : sortedRows.slice(0, topN)),
    [sortedRows, topN]
  );
  const chartData = useMemo(
    () =>
      chartRows.map((row) => ({
        name: row.plate,
        utilization: Math.round(row.utilization * 100),
        low: row.lowUtilization,
      })),
    [chartRows]
  );
  const previousByVehicle = useMemo(
    () => new Map(previousRows.map((row) => [row.vehicleId, row.utilization])),
    [previousRows]
  );
  const chartScope =
    topN === "all"
      ? translate(
          "car.analytics.utilization.chartAll",
          { ns: "car" },
          "All lowest-utilization vehicles"
        )
      : translate(
          "car.analytics.utilization.chartTopN",
          { ns: "car" },
          "{{count}} lowest-utilization vehicles"
        ).replace("{{count}}", String(topN));
  const comparisonHint = translate(
    "car.analytics.utilization.changeHint",
    { ns: "car" },
    "{{change}} pts vs {{month}}"
  )
    .replace(
      "{{change}}",
      `${utilizationChange >= 0 ? "+" : ""}${utilizationChange.toFixed(1)}`
    )
    .replace("{{month}}", previousMonth);
  const utilizationDeltaLabel = (change: number) =>
    translate(
      "car.analytics.utilization.deltaValue",
      { ns: "car" },
      "{{change}} pts"
    ).replace(
      "{{change}}",
      `${change >= 0 ? "+" : ""}${change.toFixed(1)}`
    );

  const exportRows = () => {
    exportAnalyticsCsv(
      `vehicle-utilization-${month}.csv`,
      [
        translate("car.analytics.plate", { ns: "car" }, "Plate"),
        translate("car.analytics.brand", { ns: "car" }, "Brand"),
        translate("car.analytics.model", { ns: "car" }, "Model"),
        translate("car.analytics.category", { ns: "car" }, "Category"),
        translate(
          "car.analytics.utilization.occupied",
          { ns: "car" },
          "Occupied days"
        ),
        translate(
          "car.analytics.utilization.totalDays",
          { ns: "car" },
          "Days"
        ),
        translate(
          "car.analytics.utilization.rate",
          { ns: "car" },
          "Utilization"
        ),
        translate(
          "car.analytics.utilization.dailyRate",
          { ns: "car" },
          "Daily rate"
        ),
        translate(
          "car.analytics.utilization.lowUtilization",
          { ns: "car" },
          "Low utilization"
        ),
      ],
      sortedRows.map((row) => [
        row.plate,
        row.brand,
        row.model,
        row.category,
        row.occupiedDays,
        row.daysInMonth,
        `${(row.utilization * 100).toFixed(1)}%`,
        row.dailyRate,
        String(row.lowUtilization),
      ])
    );
  };

  return (
    <div ref={aiContext.ref} className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <AnalyticsPageHeader
          titleKey="car.analytics.utilization.title"
          descriptionKey="car.analytics.utilization.description"
        />
        <div className="flex items-center gap-2">
          <Select
            value={month}
            onValueChange={(value) => {
              if (value) setMonth(value);
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AnalyticsAIShortcut
            context={aiContext.context}
            contextId="analytics-utilization"
            titleKey="car.analytics.utilization.title"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AnalyticsKpiCard
          icon={<Percent className="size-4" />}
          label={translate("car.analytics.utilization.avg", { ns: "car" }, "Average utilization")}
          value={`${(avgUtilization * 100).toFixed(1)}%`}
          hint={comparisonHint}
          tone={utilizationChange > 0 ? "positive" : utilizationChange < 0 ? "warn" : "default"}
        />
        <AnalyticsKpiCard
          icon={<Gauge className="size-4" />}
          label={translate("car.analytics.utilization.max", { ns: "car" }, "Highest utilization")}
          value={`${(maxUtilization * 100).toFixed(1)}%`}
        />
        <AnalyticsKpiCard
          icon={<CalendarDays className="size-4" />}
          label={translate("car.analytics.utilization.lowCount", { ns: "car" }, "Low-utilization vehicles")}
          value={String(lowCount)}
          hint={translate("car.analytics.utilization.lowHint", { ns: "car" }, "Below 40% occupied days")}
          tone={lowCount > 0 ? "warn" : "positive"}
        />
        <AnalyticsKpiCard
          icon={<Megaphone className="size-4" />}
          label={translate("car.analytics.utilization.promo", { ns: "car" }, "Promotion suggestion")}
          value={translate("car.analytics.utilization.promoValue", { ns: "car" }, "Discount rent")}
          hint={translate("car.analytics.utilization.promoHint", { ns: "car" }, "Target low-utilization fleet")}
          tone="warn"
        />
      </div>

      <div className="flex justify-end">
        <AnalyticsExportButton onExport={exportRows} />
      </div>

      <AnalyticsCard
        title={translate(
          "car.analytics.utilization.chartTitle",
          { ns: "car" },
          "Utilization by vehicle"
        )}
        description={`${month} · ${translate("car.analytics.utilization.chartDescription", { ns: "car" }, "Occupied days ÷ days in month")} · ${chartScope}`}
      >
        <CardContent className="space-y-3 py-4">
          <div className="flex justify-end">
            <AnalyticsTopNSelect
              value={topN}
              onChange={setTopN}
              options={[15, 30, "all"]}
            />
          </div>
          <AnalyticsStates
            isLoading={isLoading || isPreviousLoading}
            isError={isError || isPreviousError}
            isEmpty={rows.length === 0}
            onRetry={() => {
              void refetch();
              void refetchPrevious();
            }}
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
                    width={34}
                    unit="%"
                    domain={[0, 100]}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}%`, translate("car.analytics.utilization.rate", { ns: "car" }, "Utilization")]}
                  />
                  <Bar dataKey="utilization" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.low ? "var(--chart-4)" : "var(--chart-1)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </AnalyticsStates>
        </CardContent>
      </AnalyticsCard>

      <AnalyticsCard
        title={translate(
          "car.analytics.utilization.tableTitle",
          { ns: "car" },
          "Vehicle utilization details"
        )}
        description={translate(
          "car.analytics.utilization.tableDescription",
          { ns: "car" },
          "Sorted by utilization ascending. Low-utilization vehicles are flagged for promotion."
        )}
      >
        <CardContent className="p-0">
          <AnalyticsStates
            isLoading={isLoading || isPreviousLoading}
            isError={isError || isPreviousError}
            isEmpty={rows.length === 0}
            onRetry={() => {
              void refetch();
              void refetchPrevious();
            }}
          >
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{translate("car.analytics.vehicle", { ns: "car" }, "Vehicle")}</TableHead>
                <TableHead className="text-right">{translate("car.analytics.utilization.occupied", { ns: "car" }, "Occupied days")}</TableHead>
                <TableHead className="text-right">{translate("car.analytics.utilization.totalDays", { ns: "car" }, "Days")}</TableHead>
                <TableHead className="w-48">{translate("car.analytics.utilization.rate", { ns: "car" }, "Utilization")}</TableHead>
                <TableHead className="text-right">{translate("car.analytics.utilization.delta", { ns: "car" }, "Δ vs prev")}</TableHead>
                <TableHead className="text-right">{translate("car.analytics.utilization.dailyRate", { ns: "car" }, "Daily rate")}</TableHead>
                <TableHead>{translate("car.analytics.flag", { ns: "car" }, "Flag")}</TableHead>
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
                  <TableCell className="text-right tabular-nums">{row.occupiedDays}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {row.daysInMonth}
                  </TableCell>
                  <TableCell>
                    <UtilizationBar
                      utilization={row.utilization}
                      low={row.lowUtilization}
                    />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {previousByVehicle.has(row.vehicleId)
                      ? utilizationDeltaLabel(
                          (row.utilization - previousByVehicle.get(row.vehicleId)!) *
                            100
                        )
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.dailyRate ? formatMoney(row.dailyRate) : "-"}
                  </TableCell>
                  <TableCell>
                    {row.lowUtilization ? (
                      <Badge
                        variant="outline"
                        className="h-6 gap-1.5 rounded-md border-amber-600/30 bg-card px-2 text-[11px] font-medium text-amber-700 dark:text-amber-400"
                      >
                        <span aria-hidden="true" className="size-1.5 rounded-full bg-amber-500" />
                        {translate("car.analytics.utilization.promote", { ns: "car" }, "Promote")}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
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

function UtilizationBar({
  utilization,
  low,
}: {
  utilization: number;
  low: boolean;
}) {
  const percent = Math.round(utilization * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${
            low ? "bg-amber-500" : "bg-emerald-500"
          }`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
      <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
        {percent}%
      </span>
    </div>
  );
}
