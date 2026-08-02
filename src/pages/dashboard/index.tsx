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
  Sparkles,
  TrendingDown,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
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
  useOrderStatusChart,
  useTodayReturns,
  useTopCustomers,
  useTopModels,
} from "@/lib/car/queries";
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
    en: "Fleet rental operations — vehicles, orders, contracts, dispatch, violations.",
    zh: "车队租赁运营 —— 车辆、订单、合同、调度、违章。",
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
        />
        <KpiCard
          icon={<CircleDollarSign className="size-4" />}
          label={translate("car.dashboard.kpi.monthRevenue", { ns: "car" }, "Month revenue")}
          value={formatCurrency(monthRevenue.data)}
          hint={translate(
            "car.dashboard.kpi.monthRevenueHint",
            { ns: "car" },
            "Current month payments"
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
            <BarChart data={orderData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={28} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="var(--primary)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
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
                      {translate("car.ai.collapsed", { ns: "car" }, "点击展开")}
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
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="car-kpi-card gap-0">
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
