import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTranslate } from "@refinedev/core";
import { nocobaseClient } from "@nocobase/portal-sdk/client";

type Option = { value: string; label: string };

function resolveLocale(): string {
  return nocobaseClient.getLocale() ?? "en-US";
}

export function CarRelationValue({
  value,
  labelField,
  subFields,
}: {
  value: Record<string, unknown> | undefined | null;
  labelField: string;
  subFields?: string[];
}) {
  if (!value) return <span className="text-muted-foreground">-</span>;
  const label = value[labelField];
  if (label === null || label === undefined) {
    return <span className="text-muted-foreground">-</span>;
  }
  const detail = (subFields ?? [])
    .map((field) => value[field])
    .filter((item) => item !== null && item !== undefined && item !== "")
    .join(" · ");
  return (
    <span className="inline-flex min-w-0 flex-col">
      <span className="truncate font-medium">{String(label)}</span>
      {detail ? (
        <span className="truncate text-xs text-muted-foreground">
          {detail}
        </span>
      ) : null}
    </span>
  );
}

export function CarStatusBadge({
  value,
  options,
  className,
}: {
  value?: string | null;
  options?: Option[];
  className?: string;
}) {
  const translate = useTranslate();
  if (!value) return <span className="text-muted-foreground">-</span>;
  const option = options?.find((item) => item.value === value);
  const label = option
    ? translate(option.label, { ns: "car" }, option.label)
    : value;
  const tone = toneForStatus(value);

  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 gap-1.5 rounded-md border-border/80 bg-card px-2 text-[11px] font-medium text-foreground shadow-none",
        tone,
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-1.5 rounded-full", toneDot(value))}
      />
      {label}
    </Badge>
  );
}

function toneForStatus(value: string): string {
  const active = ["available", "open", "paid", "completed", "resolved", "processed", "signed", "active", "done", "high"];
  const warn = ["rented", "pending", "processing", "appealing", "lead", "in_transit", "renovating", "medium"];
  const danger = ["maintenance", "cancelled", "blocked", "overdue", "scrapped", "churned", "void", "low"];

  if (active.includes(value)) return "text-emerald-600 dark:text-emerald-400";
  if (warn.includes(value)) return "text-amber-600 dark:text-amber-400";
  if (danger.includes(value)) return "text-red-600 dark:text-red-400";
  return "text-muted-foreground";
}

function toneDot(value: string): string {
  const active = ["available", "open", "paid", "completed", "resolved", "processed", "signed", "active", "done", "high"];
  const warn = ["rented", "pending", "processing", "appealing", "lead", "in_transit", "renovating", "medium"];
  const danger = ["maintenance", "cancelled", "blocked", "overdue", "scrapped", "churned", "void", "low"];

  if (active.includes(value)) return "bg-emerald-500";
  if (warn.includes(value)) return "bg-amber-500";
  if (danger.includes(value)) return "bg-red-500";
  return "bg-muted-foreground";
}

export function formatMoney(value?: number | null): string {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat(resolveLocale(), {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(
  value?: string | null,
  withTime = false
): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(resolveLocale(), {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
  }).format(date);
}

export function formatNumber(value?: number | null): string {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat(resolveLocale(), {
    maximumFractionDigits: 2,
  }).format(value);
}
