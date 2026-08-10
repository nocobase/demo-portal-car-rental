import { useTranslate } from "@refinedev/core";
import { nocobaseClient } from "@nocobase/portal-sdk/client";
import {
  AlertTriangle,
  CalendarClock,
  CarFront,
  ChevronDown,
  CircleDollarSign,
  Clock4,
  Gauge,
  HandCoins,
  KeyRound,
  Sparkles,
  TrendingDown,
  Undo2,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BuildStoryBanner, type BuildStory } from "@/components/build-story/build-story-banner";
import { cn } from "@/lib/utils";
import { useAIPageElementHandle } from "@/lib/car/ai";
import { resolveCarLabel } from "@/lib/car/labels";
import { orderStatusOptions } from "@/lib/car/configs";
import {
  useCarKpis,
  useCurrentMonthRevenue,
  useMonthlyRevenue,
  useOrderStatusChart,
  useTodayReturns,
  useTopCustomers,
  useTopModels,
} from "@/lib/car/queries";
import {
  startOfDay,
  useRentalDesk,
  useRevenueComposition,
  type RevenueSlice,
} from "@/lib/car/operations";
import {
  useCashflow,
  useCancellation,
  useProfitabilitySummary,
  useUtilization,
} from "@/lib/car/analytics";
import { AIChatProvider, useAI, AIPageContextScope } from "@/extensions/nocobase-ai";
import { AIChatWindow, ChatInline, AIEmployeeShortcut } from "@/extensions/nocobase-ai";
import { useAIChatController } from "@/extensions/nocobase-ai";
import { AIEmployeeTask, type AIWorkContextItem } from "@/extensions/nocobase-ai";
import { pickBusinessAIEmployee } from "@/lib/car/ai";

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const BUILD_STORY: BuildStory = {
  models: ["DeepSeek V4 Flash 0731"],
  intro: {
    en: "A car rental management system — vehicles, bookings, contracts, returns and violations, with a clear view of which cars are free and which are still out. This whole system was designed and built end-to-end by an AI coding agent. You can connect your own coding agent and keep developing it.",
    zh: "租车业务的管理系统:车辆、订单、合同、还车、违章都能管,哪台车空着、哪台还在外面一清二楚。整套系统从设计到实现,都由 AI coding agent 完成。你可以接入你的 Coding Agent,继续开发它。",
  },
  tracks: [
    {
      label: { en: "Data model — vehicles, orders, contracts", zh: "数据建模 — 车辆/订单/合同" },
      models: ["DeepSeek V4 Flash 0731"],
      start: 0,
      minutes: 15,
    },
    {
      label: { en: "Pages — dashboard, fleet, orders, analytics", zh: "页面 — 工作台/车队/订单/分析" },
      models: ["DeepSeek V4 Flash 0731"],
      start: 15,
      minutes: 25,
    },
    {
      label: { en: "Wire-up & polish", zh: "联调与打磨" },
      models: ["DeepSeek V4 Flash 0731"],
      start: 40,
      minutes: 10,
    },
  ],
  roles: [
    {
      name: { en: "Car Rental Admin", zh: "车队管理员" },
      can: { en: "Full access to fleet, orders, contracts", zh: "车队/订单/合同全权限" },
      account: "car_admin_demo@scm.demo",
      password: "demo123456",
    },
    {
      name: { en: "Fleet Operator", zh: "车队调度" },
      can: { en: "Vehicles, dispatch, maintenance", zh: "车辆、调度、保养" },
      account: "fleet_operator_demo@scm.demo",
      password: "demo123456",
    },
    {
      name: { en: "Front Desk", zh: "前台" },
      can: { en: "Customers, orders, contracts", zh: "客户、订单、合同" },
      account: "front_desk_demo@scm.demo",
      password: "demo123456",
    },
    {
      name: { en: "Finance", zh: "财务" },
      can: { en: "Payments, contracts, read-all", zh: "收款、合同、只读全局" },
      account: "finance_demo@scm.demo",
      password: "demo123456",
    },
    {
      name: { en: "Viewer", zh: "只读" },
      can: { en: "Read-only across the app", zh: "全应用只读" },
      account: "viewer_demo@scm.demo",
      password: "demo123456",
    },
  ],
};

export function DashboardPage() {
  const translate = useTranslate();
  const navigate = useNavigate();
  const kpis = useCarKpis();
  const orderChart = useOrderStatusChart();
  const todayReturns = useTodayReturns();
  const monthRevenue = useCurrentMonthRevenue();
  const topModels = useTopModels();
  const topCustomers = useTopCustomers();
  const monthlyRevenue = useMonthlyRevenue();
  const composition = useRevenueComposition();
  const [trendMonths, setTrendMonths] = useState(12);

  const trendData = useMemo(() => {
    const rows = (monthlyRevenue.data ?? [])
      .map((row) => ({
        month: String(row.month ?? ""),
        revenue: Number(row.revenue ?? 0),
      }))
      .filter((row) => row.month);
    return rows.slice(-trendMonths);
  }, [monthlyRevenue.data, trendMonths]);

  // Month on month uses the two most recent complete points in the series.
  const trendDelta = useMemo(() => {
    if (trendData.length < 2) return null;
    const previous = trendData[trendData.length - 2]?.revenue ?? 0;
    const latest = trendData[trendData.length - 1]?.revenue ?? 0;
    if (!previous) return null;
    return (latest - previous) / previous;
  }, [trendData]);

  const profitability = useProfitabilitySummary();
  const utilization = useUtilization(currentMonth());
  const cancellation = useCancellation();
  const cashflow = useCashflow();

  const utilizationRows = utilization.data ?? [];
  const lowUtilizationCount = utilizationRows.filter(
    (row) => row.lowUtilization
  ).length;
  const highRiskSegments = (cancellation.data?.byCustomerType ?? [])
    .concat(cancellation.data?.byCategory ?? [])
    .filter((segment) => segment.total > 0 && segment.rate >= 0.25);
  const fundsInDanger =
    (cashflow.data?.receivableTotal ?? 0) +
    (cashflow.data?.depositHeldTotal ?? 0) +
    (cashflow.data?.refundDueTotal ?? 0);

  const context = useAIPageElementHandle({
    id: "dashboard-overview",
    title: resolveCarLabel("car.dashboard.title", "Dashboard", translate),
    kind: "detail",
    getContext: () => ({
      resource: "dashboard",
      kpis: kpis.data,
      todayReturns: todayReturns.data,
      monthRevenue: monthRevenue.data,
      ordersByStatus: orderChart.data,
      alerts: {
        losers: profitability.losers,
        winners: profitability.winners,
        lowUtilizationCount,
        highRiskSegments: highRiskSegments.map((segment) => ({
          label: segment.label,
          rate: segment.rate,
        })),
        fundsInDanger,
        receivable: cashflow.data?.receivableTotal ?? 0,
        depositHeld: cashflow.data?.depositHeldTotal ?? 0,
        refundDue: cashflow.data?.refundDueTotal ?? 0,
      },
      topModels: topModels.data,
      topCustomers: topCustomers.data,
    }),
  });

  const orderData = useMemo(
    () =>
      (orderChart.data ?? []).map((row) => ({
        name: resolveOptionLabel(
          orderStatusOptions,
          String(row.status),
          translate
        ),
        value: row.order_count,
        raw: row.status,
      })),
    [orderChart.data, translate]
  );

  return (
    <div ref={context.ref} className="flex flex-col gap-6">
      <BuildStoryBanner story={BUILD_STORY} />
      <div>
        <h2 className="text-3xl font-semibold tracking-[-0.035em]">
          {translate("car.dashboard.title", { ns: "car" }, "Dashboard")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {translate(
            "car.dashboard.description",
            { ns: "car" },
            "Today's operations and anomaly alerts."
          )}
        </p>
      </div>

      <DashboardAssistant context={context.context} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Clock4 className="size-4" />}
          label={translate("car.dashboard.kpi.ongoing", { ns: "car" }, "Ongoing orders")}
          value={String(kpis.data?.ongoingOrders ?? "-")}
          onClick={() =>
            navigate(statusDrillUrl("scm_rental_orders", "status", "ongoing"))
          }
        />
        <KpiCard
          icon={<CalendarClock className="size-4" />}
          label={translate("car.dashboard.kpi.dueToday", { ns: "car" }, "Due today")}
          value={String(todayReturns.data ?? "-")}
          hint={translate(
            "car.dashboard.kpi.dueTodayHint",
            { ns: "car" },
            "Expected returns"
          )}
          onClick={() => navigate("/rental-desk")}
        />
        <KpiCard
          icon={<CarFront className="size-4" />}
          label={translate("car.dashboard.kpi.available", { ns: "car" }, "Available")}
          value={String(kpis.data?.availableVehicles ?? "-")}
          hint={translate(
            "car.dashboard.kpi.availableHint",
            { ns: "car" },
            "Ready to rent"
          )}
          onClick={() =>
            navigate(statusDrillUrl("scm_vehicles", "status", "available"))
          }
        />
        <KpiCard
          icon={<CircleDollarSign className="size-4" />}
          label={translate("car.dashboard.kpi.monthRevenue", { ns: "car" }, "Month revenue")}
          value={formatCurrency(monthRevenue.data)}
          hint={translate(
            "car.dashboard.kpi.monthRevenueHint",
            { ns: "car" },
            "Paid month-to-date"
          )}
        />
      </div>

      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
        <h3 className="text-base font-semibold tracking-tight">
          {translate(
            "car.dashboard.alerts.title",
            { ns: "car" },
            "Anomaly alerts"
          )}
        </h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AlertCard
          icon={<TrendingDown className="size-4" />}
          label={translate("car.dashboard.alerts.losers", { ns: "car" }, "Money-losing vehicles")}
          value={String(profitability.losers)}
          hint={translate(
            "car.dashboard.alerts.losersHint",
            { ns: "car" },
            "Open profitability report"
          )}
          tone={profitability.losers > 0 ? "warn" : "positive"}
          onClick={() => navigate("/analytics/profitability")}
        />
        <AlertCard
          icon={<Gauge className="size-4" />}
          label={translate("car.dashboard.alerts.lowUtilization", { ns: "car" }, "Low utilization")}
          value={String(lowUtilizationCount)}
          hint={translate(
            "car.dashboard.alerts.lowUtilizationHint",
            { ns: "car" },
            "Consider rent promotions"
          )}
          tone={lowUtilizationCount > 0 ? "warn" : "positive"}
          onClick={() => navigate("/analytics/utilization")}
        />
        <AlertCard
          icon={<AlertTriangle className="size-4" />}
          label={translate("car.dashboard.alerts.riskSegments", { ns: "car" }, "High cancellation segments")}
          value={String(highRiskSegments.length)}
          hint={translate(
            "car.dashboard.alerts.riskSegmentsHint",
            { ns: "car" },
            "Rate ≥ 25%"
          )}
          tone={highRiskSegments.length > 0 ? "warn" : "positive"}
          onClick={() => navigate("/analytics/cancellation")}
        />
        <AlertCard
          icon={<WalletCards className="size-4" />}
          label={translate("car.dashboard.alerts.funds", { ns: "car" }, "Funds in danger")}
          value={formatCurrency(fundsInDanger)}
          hint={translate(
            "car.dashboard.alerts.fundsHint",
            { ns: "car" },
            "Receivable + deposit + refund due"
          )}
          tone={fundsInDanger > 0 ? "warn" : "positive"}
          onClick={() => navigate("/analytics/cashflow")}
        />
      </div>

      <TodayAtTheCounter />

      <Card className="gap-0">
        <CardHeader className="flex flex-row items-start justify-between gap-4 border-b py-4">
          <div className="space-y-1">
            <CardTitle>
              {translate("car.dashboard.revenueTrend", { ns: "car" }, "Revenue trend")}
            </CardTitle>
            <CardDescription>
              {translate(
                "car.dashboard.revenueTrendDescription",
                { ns: "car" },
                "Settled payments per month"
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            {TREND_RANGES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setTrendMonths(option)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  trendMonths === option
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/50"
                )}
              >
                {translate(
                  "car.dashboard.trendMonths",
                  { ns: "car" },
                  "{{count}}m"
                ).replace("{{count}}", String(option))}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="h-72 py-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="car-revenue-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={12}
                width={54}
                tickFormatter={(value: number) => compactNumber(value)}
              />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--primary)"
                strokeWidth={2}
                fill="url(#car-revenue-fill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
        {trendDelta !== null ? (
          <div className="border-t px-5 py-3 text-xs text-muted-foreground">
            {translate(
              "car.dashboard.trendDelta",
              { ns: "car" },
              "Month on month"
            )}
            :{" "}
            <span
              className={cn(
                "font-semibold tabular-nums",
                trendDelta >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {trendDelta >= 0 ? "+" : ""}
              {(trendDelta * 100).toFixed(1)}%
            </span>
          </div>
        ) : null}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-0">
          <CardHeader className="border-b py-4">
            <CardTitle>
              {translate("car.dashboard.ordersByStatus", { ns: "car" }, "Orders by status")}
            </CardTitle>
            <CardDescription>
              {translate(
                "car.dashboard.ordersByStatusDescription",
                { ns: "car" },
                "Current rental order distribution"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={orderData}
                onClick={(state) => {
                  const payload = (
                    state as {
                      activePayload?: Array<{ payload?: { raw?: unknown } }>;
                    }
                  )?.activePayload;
                  const raw = payload?.[0]?.payload?.raw;
                  if (raw) {
                    navigate(statusDrillUrl("scm_rental_orders", "status", String(raw)));
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={28} />
                <Tooltip cursor={{ fill: "var(--accent)", opacity: 0.4 }} />
                <Bar
                  dataKey="value"
                  radius={[4, 4, 0, 0]}
                  fill="var(--primary)"
                  className="cursor-pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
          <div className="border-t px-5 py-2 text-xs text-muted-foreground">
            {translate(
              "car.dashboard.clickToDrill",
              { ns: "car" },
              "Click a bar to open the matching records."
            )}
          </div>
        </Card>

        <Card className="gap-0">
          <CardHeader className="border-b py-4">
            <CardTitle>
              {translate("car.dashboard.byBranch", { ns: "car" }, "Revenue by branch")}
            </CardTitle>
            <CardDescription>
              {translate(
                "car.dashboard.byBranchDescription",
                { ns: "car" },
                "Where the money is earned, and by which vehicle class"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 py-4">
            <CompositionList
              rows={composition.data?.byBranch ?? []}
              isLoading={composition.isLoading}
              emptyLabel={translate(
                "car.dashboard.noComposition",
                { ns: "car" },
                "No settled rentals yet."
              )}
            />
            <div className="border-t pt-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                {translate("car.dashboard.byCategory", { ns: "car" }, "By vehicle class")}
              </p>
              <CompositionList
                rows={(composition.data?.byCategory ?? []).slice(0, 5)}
                isLoading={composition.isLoading}
                emptyLabel=""
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RankingCard
          title={translate("car.dashboard.topModels", { ns: "car" }, "Top models")}
          description={translate(
            "car.dashboard.topModelsDescription",
            { ns: "car" },
            "Highest earning models across all rentals"
          )}
          rows={(topModels.data ?? []).map((row) => ({
            label: String(row.model ?? "—"),
            primary: formatCurrency(Number(row.revenue ?? 0)),
            secondary: translate(
              "car.dashboard.orderCount",
              { ns: "car" },
              "{{count}} rentals"
            ).replace("{{count}}", String(row.order_count ?? 0)),
          }))}
          isLoading={topModels.isLoading}
          onOpen={() => navigate("/analytics/profitability")}
        />
        <RankingCard
          title={translate("car.dashboard.topCustomers", { ns: "car" }, "Top customers")}
          description={translate(
            "car.dashboard.topCustomersDescription",
            { ns: "car" },
            "Accounts with the largest lifetime spend"
          )}
          rows={(topCustomers.data ?? []).map((row) => ({
            label: String(row.customer ?? "—"),
            primary: formatCurrency(Number(row.revenue ?? 0)),
            secondary: translate(
              "car.dashboard.orderCount",
              { ns: "car" },
              "{{count}} rentals"
            ).replace("{{count}}", String(row.order_count ?? 0)),
          }))}
          isLoading={topCustomers.isLoading}
          onOpen={() => navigate("/scm_customers")}
        />
      </div>
    </div>
  );
}

const TREND_RANGES = [6, 12];

/** Deep link into a list page with the status filter pre-applied. */
function statusDrillUrl(resource: string, field: string, value: string): string {
  const state = encodeURIComponent(
    JSON.stringify({ filters: [{ id: field, value }], sorting: [] })
  );
  return `/${resource}?layout=table&view=${state}`;
}

function compactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/** The counter's outstanding work, summarised straight on the landing page. */
function TodayAtTheCounter() {
  const translate = useTranslate();
  const navigate = useNavigate();
  const desk = useRentalDesk(startOfDay(new Date()));
  const data = desk.data;

  const tiles = [
    {
      key: "pickups",
      icon: <KeyRound className="size-4" />,
      label: translate("car.desk.kpi.pickups", { ns: "car" }, "Handovers due"),
      value: data?.pickups.length ?? 0,
    },
    {
      key: "returns",
      icon: <Undo2 className="size-4" />,
      label: translate("car.desk.kpi.returns", { ns: "car" }, "Returns due"),
      value: data?.returns.length ?? 0,
    },
    {
      key: "overdue",
      icon: <AlertTriangle className="size-4" />,
      label: translate("car.desk.kpi.overdue", { ns: "car" }, "Overdue on road"),
      value: data?.overdue.length ?? 0,
      warn: (data?.overdue.length ?? 0) > 0,
    },
    {
      key: "receivable",
      icon: <WalletCards className="size-4" />,
      label: translate("car.desk.kpi.receivable", { ns: "car" }, "Open balances"),
      value: data?.receivables.length ?? 0,
      warn: (data?.receivables.length ?? 0) > 0,
    },
  ];

  return (
    <Card className="gap-0">
      <CardHeader className="flex flex-row items-center justify-between gap-4 border-b py-4">
        <div className="space-y-1">
          <CardTitle>
            {translate("car.dashboard.today.title", { ns: "car" }, "Today at the counter")}
          </CardTitle>
          <CardDescription>
            {translate(
              "car.dashboard.today.description",
              { ns: "car" },
              "Open the rental desk to work through the queues."
            )}
          </CardDescription>
        </div>
        <button
          type="button"
          onClick={() => navigate("/rental-desk")}
          className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
        >
          {translate("car.dashboard.today.open", { ns: "car" }, "Open rental desk")}
        </button>
      </CardHeader>
      <CardContent className="grid gap-3 py-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <button
            key={tile.key}
            type="button"
            onClick={() => navigate("/rental-desk")}
            className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-accent/40"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
              {tile.icon}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs text-muted-foreground">
                {tile.label}
              </span>
              <span
                className={cn(
                  "block text-xl font-semibold tabular-nums",
                  tile.warn && "text-amber-600 dark:text-amber-400"
                )}
              >
                {desk.isLoading ? "—" : tile.value}
              </span>
            </span>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

function CompositionList({
  rows,
  isLoading,
  emptyLabel,
}: {
  rows: RevenueSlice[];
  isLoading: boolean;
  emptyLabel: string;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-6 animate-pulse rounded bg-muted" />
        ))}
      </div>
    );
  }
  if (!rows.length) {
    return emptyLabel ? (
      <p className="text-sm text-muted-foreground">{emptyLabel}</p>
    ) : null;
  }
  const max = Math.max(...rows.map((row) => row.revenue), 1);
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.key} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">{row.label}</span>
            <span className="shrink-0 font-medium tabular-nums">
              {formatCurrency(row.revenue)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary/70"
              style={{ width: `${(row.revenue / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function RankingCard({
  title,
  description,
  rows,
  isLoading,
  onOpen,
}: {
  title: string;
  description: string;
  rows: Array<{ label: string; primary: string; secondary: string }>;
  isLoading: boolean;
  onOpen: () => void;
}) {
  const translate = useTranslate();
  return (
    <Card className="gap-0">
      <CardHeader className="flex flex-row items-center justify-between gap-4 border-b py-4">
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
        >
          {translate("car.dashboard.viewAll", { ns: "car" }, "View all")}
        </button>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-8 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : !rows.length ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            {translate("car.dashboard.noRanking", { ns: "car" }, "Not enough data yet.")}
          </p>
        ) : (
          <ol className="divide-y">
            {rows.map((row, index) => (
              <li
                key={`${row.label}-${index}`}
                className="flex items-center gap-3 px-5 py-2.5"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold tabular-nums">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{row.label}</span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-semibold tabular-nums">
                    {row.primary}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {row.secondary}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function DashboardAssistant({
  context,
}: {
  context: AIWorkContextItem;
}) {
  const translate = useTranslate();
  const { employees } = useAI();
  const controller = useAIChatController();
  const [open, setOpen] = useState(false);
  const businessEmployee = useMemo(
    () => pickBusinessAIEmployee(employees),
    [employees]
  );

  const businessTasks = useMemo<AIEmployeeTask[]>(
    () => [
      {
        title: translate(
          "car.dashboard.ai.task.returns",
          { ns: "car" },
          "Due today"
        ),
        message: {
          user: translate(
            "car.dashboard.ai.task.returns.message",
            { ns: "car" },
            "Which vehicles are due to be returned today? Use the current dashboard data to explain."
          ),
        },
        autoSend: false,
      },
      {
        title: translate(
          "car.dashboard.ai.task.alerts",
          { ns: "car" },
          "Anomaly alerts"
        ),
        message: {
          user: translate(
            "car.dashboard.ai.task.alerts.message",
            { ns: "car" },
            "Based on the dashboard anomaly alerts, list the money-losing cars, low-utilization vehicles, and high-cancellation cases, and give recommendations."
          ),
        },
        autoSend: false,
      },
      {
        title: translate(
          "car.dashboard.ai.task.models",
          { ns: "car" },
          "Top models"
        ),
        message: {
          user: translate(
            "car.dashboard.ai.task.models.message",
            { ns: "car" },
            "Which models are the top performers this month? Explain sorted by revenue."
          ),
        },
        autoSend: false,
      },
    ],
    [translate]
  );

  if (!businessEmployee) {
    return (
      <Card className="gap-0">
        <CardHeader className="border-b py-4">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4" />
            {translate("car.dashboard.ai.title", { ns: "car" }, "AI assistant")}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-4 text-sm text-muted-foreground">
          {translate(
            "car.dashboard.ai.unavailable",
            { ns: "car" },
            "AI assistant is not available because no AI employee is configured."
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <AIPageContextScope context={context}>
      <AIChatProvider
        id="car-dashboard-assistant"
        controller={controller}
        defaultEmployee={businessEmployee.username}
      >
        <Card className="gap-0 overflow-hidden">
          <Collapsible open={open} onOpenChange={setOpen}>
            <CardHeader className="flex flex-row items-center justify-between gap-4 py-3.5">
              <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left transition-colors hover:bg-accent/40">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
                  <Sparkles className="size-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    {translate(
                      "car.dashboard.ai.title",
                      { ns: "car" },
                      "AI assistant"
                    )}
                    <span className="rounded-full border bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {translate("car.ai.collapsed", { ns: "car" }, "Click to expand")}
                    </span>
                  </CardTitle>
                  <CardDescription className="truncate text-xs">
                    {translate(
                      "car.dashboard.ai.description",
                      { ns: "car" },
                      "Ask about today's operations, alerts or revenue with the current dashboard as context."
                    )}
                  </CardDescription>
                </div>
                <ChevronDown
                  className={cn(
                    "mr-2 size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                    open && "rotate-180"
                  )}
                />
              </CollapsibleTrigger>
              <AIEmployeeShortcut
                aiEmployee={businessEmployee.username}
                label={translate(
                  "car.dashboard.ai.ask",
                  { ns: "car" },
                  "Ask assistant"
                )}
                size={32}
                target={controller}
                tasks={businessTasks}
                onTrigger={() => setOpen(true)}
              />
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="p-0">
                <div className="h-[520px] min-h-0 border-t">
                  <ChatInline className="h-full min-h-0 border-0 rounded-none">
                    <AIChatWindow />
                  </ChatInline>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </AIChatProvider>
    </AIPageContextScope>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  onClick?: () => void;
}) {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <KpiCard icon={icon} label={label} value={value} hint={hint} />
      </button>
    );
  }
  return (
    <Card className="car-kpi-card gap-0 transition-colors hover:border-primary/40">
      <CardContent className="flex items-center gap-4 py-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-2xl font-semibold tabular-nums">{value}</p>
          {hint ? (
            <p className="truncate text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function AlertCard({
  icon,
  label,
  value,
  hint,
  tone,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  tone: "positive" | "warn";
  onClick: () => void;
}) {
  const toneClass =
    tone === "warn"
      ? "text-amber-600 dark:text-amber-400"
      : "text-emerald-600 dark:text-emerald-400";
  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
    >
      <Card className="gap-0 transition-colors group-hover:border-primary/40">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted-foreground">{label}</p>
            <p className={cn("truncate text-2xl font-semibold tabular-nums", toneClass)}>
              {value}
            </p>
          </div>
          <HandCoins className="hidden size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 sm:block" />
        </CardContent>
        <div className="border-t px-4 py-2 text-xs text-muted-foreground">{hint}</div>
      </Card>
    </button>
  );
}

function resolveOptionLabel(
  options: { value: string; label: string }[] | undefined,
  value: string,
  translate: ReturnType<typeof useTranslate>
): string {
  const option = options?.find((item) => item.value === value);
  return option
    ? translate(option.label, { ns: "car" }, option.label)
    : value;
}

function formatCurrency(value?: number | null): string {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat(
    nocobaseClient.getLocale() ?? "en-US",
    {
      style: "currency",
      currency: "CNY",
      maximumFractionDigits: 0,
    }
  ).format(value);
}
