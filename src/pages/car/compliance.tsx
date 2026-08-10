import { useTranslate } from "@refinedev/core";
import { format } from "date-fns";
import {
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  IdCard,
  RotateCw,
  ShieldCheck,
  Siren,
  Wrench,
} from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/components/car/value";
import { cn } from "@/lib/utils";
import { useAIPageElementHandle } from "@/lib/car/ai";
import {
  useComplianceCalendar,
  type ComplianceItem,
  type ComplianceKind,
} from "@/lib/car/operations";

const HORIZON_OPTIONS = [30, 60, 90];

const KIND_META: Record<
  ComplianceKind,
  { icon: ReactNode; labelKey: string; fallback: string; className: string }
> = {
  insurance: {
    icon: <ShieldCheck className="size-3.5" />,
    labelKey: "car.compliance.kind.insurance",
    fallback: "Insurance",
    className: "text-sky-600 dark:text-sky-400",
  },
  maintenance: {
    icon: <Wrench className="size-3.5" />,
    labelKey: "car.compliance.kind.maintenance",
    fallback: "Service",
    className: "text-amber-600 dark:text-amber-400",
  },
  license: {
    icon: <IdCard className="size-3.5" />,
    labelKey: "car.compliance.kind.license",
    fallback: "Driving licence",
    className: "text-violet-600 dark:text-violet-400",
  },
  violation: {
    icon: <Siren className="size-3.5" />,
    labelKey: "car.compliance.kind.violation",
    fallback: "Traffic ticket",
    className: "text-red-600 dark:text-red-400",
  },
  todo: {
    icon: <ClipboardList className="size-3.5" />,
    labelKey: "car.compliance.kind.todo",
    fallback: "Task",
    className: "text-emerald-600 dark:text-emerald-400",
  },
};

const KIND_ORDER: ComplianceKind[] = [
  "insurance",
  "maintenance",
  "license",
  "violation",
  "todo",
];

/**
 * Everything with an expiry date in one queue: policies running out, services
 * coming due, customer licences expiring, unpaid tickets and open tasks.
 */
export function CompliancePage() {
  const translate = useTranslate();
  const navigate = useNavigate();
  const t = (key: string, fallback: string) =>
    translate(key, { ns: "car" }, fallback);

  const [horizon, setHorizon] = useState(60);
  const [activeKinds, setActiveKinds] = useState<ComplianceKind[]>([]);
  const compliance = useComplianceCalendar(horizon);

  const items = useMemo(() => {
    const all = compliance.data?.items ?? [];
    if (!activeKinds.length) return all;
    return all.filter((item) => activeKinds.includes(item.kind));
  }, [compliance.data?.items, activeKinds]);

  const groups = useMemo(() => {
    const buckets: Array<{ label: string; items: ComplianceItem[] }> = [];
    for (const item of items) {
      const overdue = item.daysLeft < 0;
      const label = overdue
        ? "__overdue__"
        : format(item.dueDate, "MMMM yyyy");
      const last = buckets[buckets.length - 1];
      if (last && last.label === label) last.items.push(item);
      else buckets.push({ label, items: [item] });
    }
    return buckets;
  }, [items]);

  const pageContext = useAIPageElementHandle({
    id: "compliance-calendar",
    title: t("car.compliance.title", "Expiry & compliance"),
    kind: "table",
    getContext: () => ({
      horizonDays: horizon,
      overdue: compliance.data?.overdue ?? 0,
      dueThisWeek: compliance.data?.dueThisWeek ?? 0,
      byKind: compliance.data?.byKind ?? {},
      items: items.slice(0, 60).map((item) => ({
        kind: item.kind,
        title: item.title,
        subtitle: item.subtitle,
        due: format(item.dueDate, "yyyy-MM-dd"),
        daysLeft: item.daysLeft,
      })),
    }),
  });

  const toggleKind = (kind: ComplianceKind) => {
    setActiveKinds((current) =>
      current.includes(kind)
        ? current.filter((item) => item !== kind)
        : [...current, kind]
    );
  };

  return (
    <div ref={pageContext.ref} className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-[-0.035em]">
            {t("car.compliance.title", "Expiry & compliance")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {t(
              "car.compliance.description",
              "Policies, services, licences, tickets and tasks ordered by the date they come due."
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {HORIZON_OPTIONS.map((option) => (
            <Button
              key={option}
              variant={horizon === option ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setHorizon(option)}
            >
              {t("car.compliance.horizon", "{{count}} days").replace(
                "{{count}}",
                String(option)
              )}
            </Button>
          ))}
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={translate("buttons.refresh", "Refresh")}
            title={translate("buttons.refresh", "Refresh")}
            onClick={() => compliance.refetch()}
          >
            <RotateCw />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ComplianceKpi
          icon={<AlertTriangle className="size-4" />}
          label={t("car.compliance.kpi.overdue", "Already overdue")}
          value={String(compliance.data?.overdue ?? "-")}
          tone={(compliance.data?.overdue ?? 0) > 0 ? "warn" : undefined}
        />
        <ComplianceKpi
          icon={<CalendarClock className="size-4" />}
          label={t("car.compliance.kpi.week", "Due within 7 days")}
          value={String(compliance.data?.dueThisWeek ?? "-")}
        />
        <ComplianceKpi
          icon={<ShieldCheck className="size-4" />}
          label={t("car.compliance.kpi.insurance", "Policies in window")}
          value={String(compliance.data?.byKind.insurance ?? "-")}
        />
        <ComplianceKpi
          icon={<Wrench className="size-4" />}
          label={t("car.compliance.kpi.maintenance", "Services in window")}
          value={String(compliance.data?.byKind.maintenance ?? "-")}
        />
      </div>

      <Card className="gap-0">
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
          <span className="text-xs text-muted-foreground">
            {t("car.compliance.filterLabel", "Show")}
          </span>
          {KIND_ORDER.map((kind) => {
            const meta = KIND_META[kind];
            const active = activeKinds.includes(kind);
            return (
              <button
                key={kind}
                type="button"
                onClick={() => toggleKind(kind)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent/50"
                )}
              >
                <span className={active ? undefined : meta.className}>
                  {meta.icon}
                </span>
                {translate(meta.labelKey, { ns: "car" }, meta.fallback)}
                <span className="tabular-nums opacity-70">
                  {compliance.data?.byKind[kind] ?? 0}
                </span>
              </button>
            );
          })}
          {activeKinds.length ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7"
              onClick={() => setActiveKinds([])}
            >
              {translate("buttons.clear", "Clear")}
            </Button>
          ) : null}
        </div>

        <CardContent className="p-0">
          {compliance.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          ) : compliance.isError ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <p className="text-sm text-muted-foreground">
                {t("car.compliance.error", "The compliance queue could not be loaded.")}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => compliance.refetch()}
              >
                {translate("buttons.refresh", "Retry")}
              </Button>
            </div>
          ) : !items.length ? (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <p className="text-lg font-semibold">
                {t("car.compliance.empty.title", "Nothing comes due")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t(
                  "car.compliance.empty.description",
                  "Widen the horizon or clear the type filter."
                )}
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.label}>
                <div
                  className={cn(
                    "sticky top-0 z-10 border-y px-4 py-2 text-xs font-semibold",
                    group.label === "__overdue__"
                      ? "bg-red-500/10 text-red-600 dark:text-red-400"
                      : "bg-muted/60 text-muted-foreground"
                  )}
                >
                  {group.label === "__overdue__"
                    ? t("car.compliance.group.overdue", "Overdue")
                    : group.label}
                </div>
                <div className="divide-y">
                  {group.items.map((item) => (
                    <ComplianceRow
                      key={item.id}
                      item={item}
                      onOpen={() =>
                        navigate(`/${item.resource}/show/${item.recordId}`)
                      }
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ComplianceRow({
  item,
  onOpen,
}: {
  item: ComplianceItem;
  onOpen: () => void;
}) {
  const translate = useTranslate();
  const meta = KIND_META[item.kind];
  const overdue = item.daysLeft < 0;
  const urgent = item.daysLeft >= 0 && item.daysLeft <= 7;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/30"
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/60",
          meta.className
        )}
      >
        {meta.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{item.title}</span>
          <Badge variant="outline" className="text-[10px]">
            {translate(meta.labelKey, { ns: "car" }, meta.fallback)}
          </Badge>
        </div>
        {item.subtitle ? (
          <div className="truncate text-xs text-muted-foreground">
            {item.subtitle}
          </div>
        ) : null}
      </div>
      {item.amount ? (
        <span className="hidden shrink-0 text-sm tabular-nums text-muted-foreground sm:block">
          {formatMoney(item.amount)}
        </span>
      ) : null}
      <div className="shrink-0 text-right">
        <div className="text-sm tabular-nums">
          {format(item.dueDate, "d MMM yyyy")}
        </div>
        <div
          className={cn(
            "text-xs tabular-nums",
            overdue
              ? "font-medium text-red-600 dark:text-red-400"
              : urgent
                ? "font-medium text-amber-600 dark:text-amber-400"
                : "text-muted-foreground"
          )}
        >
          {overdue
            ? translate(
                "car.compliance.overdueBy",
                { ns: "car" },
                "{{count}} days late"
              ).replace("{{count}}", String(Math.abs(item.daysLeft)))
            : translate(
                "car.compliance.dueIn",
                { ns: "car" },
                "in {{count}} days"
              ).replace("{{count}}", String(item.daysLeft))}
        </div>
      </div>
    </button>
  );
}

function ComplianceKpi({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: "warn";
}) {
  return (
    <Card className="gap-0">
      <CardContent className="flex items-center gap-4 py-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p
            className={cn(
              "truncate text-2xl font-semibold tabular-nums",
              tone === "warn" && "text-amber-600 dark:text-amber-400"
            )}
          >
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
