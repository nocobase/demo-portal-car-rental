import { useTranslate } from "@refinedev/core";
import { BarChart3, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { AIEmployeeShortcut, useAI, useAIPageElementHandle } from "@/extensions/nocobase-ai";
import { resolveCarLabel } from "@/lib/car/labels";

export function AnalyticsPageHeader({
  titleKey,
  descriptionKey,
}: {
  titleKey: string;
  descriptionKey: string;
}) {
  const translate = useTranslate();
  return (
    <div>
      <h2 className="text-3xl font-semibold tracking-[-0.035em]">
        {translate(titleKey, { ns: "car" }, titleKey)}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        {translate(descriptionKey, { ns: "car" }, descriptionKey)}
      </p>
    </div>
  );
}

export function AnalyticsKpiCard({
  icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "positive" | "negative" | "warn";
}) {
  const toneClass = {
    default: "text-foreground",
    positive: "text-emerald-600 dark:text-emerald-400",
    negative: "text-red-600 dark:text-red-400",
    warn: "text-amber-600 dark:text-amber-400",
  }[tone];
  return (
    <Card className="gap-0">
      <CardContent className="flex items-center gap-4 py-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className={`truncate text-2xl font-semibold tabular-nums ${toneClass}`}>
            {value}
          </p>
          {hint ? (
            <p className="truncate text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function AnalyticsCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`gap-0 ${className ?? ""}`}>
      <div className="border-b px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="font-semibold tracking-tight">{title}</div>
            {description ? (
              <div className="text-xs text-muted-foreground">{description}</div>
            ) : null}
          </div>
        </div>
      </div>
      {children}
    </Card>
  );
}

/**
 * Registers the analytics data as an AI page context element and renders a
 * compact shortcut that opens the global assistant with that data attached.
 */
export function useAnalyticsAIContext({
  contextId,
  titleKey,
  getContext,
}: {
  contextId: string;
  titleKey: string;
  getContext: () => unknown;
}) {
  const translate = useTranslate();
  const handle = useAIPageElementHandle({
    id: contextId,
    title: resolveCarLabel(titleKey, titleKey, translate),
    kind: "detail",
    getContext,
  });
  return handle;
}

export function AnalyticsAIShortcut({
  context,
}: {
  context: ReturnType<typeof useAIPageElementHandle>["context"];
  contextId: string;
  titleKey: string;
}) {
  const translate = useTranslate();
  const { employees } = useAI();
  const businessEmployee = useMemo(() => {
    const excluded = ["nathan", "dara", "lina", "orin"];
    return (
      employees.find(
        (employee) =>
          !excluded.includes(employee.username.toLowerCase()) &&
          employee.username.toLowerCase() === "atlas"
      ) ??
      employees.find(
        (employee) => !excluded.includes(employee.username.toLowerCase())
      ) ??
      employees[0]
    );
  }, [employees]);

  if (!businessEmployee) return null;

  return (
    <AIEmployeeShortcut
      aiEmployee={businessEmployee.username}
      context={[context]}
      label={translate(
        "car.analytics.ai.ask",
        { ns: "car" },
        "Ask assistant"
      )}
      size={36}
      className="h-9 rounded-full px-2"
    />
  );
}

export function SectionIcon() {
  return <BarChart3 className="size-4" />;
}

export function AskSparkIcon() {
  return <Sparkles className="size-4" />;
}
