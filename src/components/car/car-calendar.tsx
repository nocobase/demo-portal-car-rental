import { useList, useTranslate } from "@refinedev/core";
import {
  createRouteSurfaceNavigationState,
} from "@nocobase/portal-sdk/routing";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import { CarRelationValue, CarStatusBadge } from "@/components/car/value";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { resolveCarLabel } from "@/lib/car/labels";
import type { CarResourceConfig } from "@/lib/car/types";

const WEEKDAYS = [
  "car.calendar.mon",
  "car.calendar.tue",
  "car.calendar.wed",
  "car.calendar.thu",
  "car.calendar.fri",
  "car.calendar.sat",
  "car.calendar.sun",
];

const getNestedValue = (
  record: Record<string, unknown>,
  path: string
): unknown => {
  const parts = path.split(".");
  let current: unknown = record;
  for (const part of parts) {
    if (
      current === null ||
      typeof current !== "object" ||
      !(part in (current as Record<string, unknown>))
    ) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
};

export function CarCalendarView({
  config,
  search,
}: {
  config: CarResourceConfig;
  search?: string;
}) {
  const translate = useTranslate();
  const navigate = useNavigate();
  const location = useLocation();
  const [month, setMonth] = useState(() => new Date());

  const startField = config.calendarField ?? "pickup_time";
  const endField = config.calendarEndField;

  const relationAppends = useMemo(() => {
    const fields = new Set<string>();
    for (const column of config.columns) {
      if (column.kind === "relation" && column.relation) {
        fields.add(column.accessor);
      }
      for (const field of column.composite ?? []) {
        if (field.kind === "relation" && field.relation) {
          fields.add(field.accessor);
        }
      }
    }
    return Array.from(fields);
  }, [config.columns]);

  const { result } = useList<Record<string, unknown>>({
    resource: config.name,
    pagination: { mode: "server", currentPage: 1, pageSize: 300 },
    meta: {
      appends: relationAppends,
    },
    queryOptions: { retry: false },
  });

  const rows = useMemo(() => {
    const all = result.data ?? [];
    const trimmed = (search ?? "").trim().toLowerCase();
    if (!trimmed) return all;
    const searchable = config.searchableFields ?? [];
    return all.filter((record) =>
      searchable.some((field) =>
        String(getNestedValue(record, field) ?? "")
          .toLowerCase()
          .includes(trimmed)
      )
    );
  }, [result.data, search, config.searchableFields]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const ordersByDay = useMemo(() => {
    const map: Record<string, Record<string, unknown>[]> = {};
    for (const record of rows) {
      const startValue = getNestedValue(record, startField);
      const endValue = endField ? getNestedValue(record, endField) : undefined;
      const startDate = startValue
        ? new Date(String(startValue))
        : null;
      const endDate = endValue
        ? new Date(String(endValue))
        : null;
      const key = (d: Date) => format(d, "yyyy-MM-dd");
      if (startDate && !Number.isNaN(startDate.getTime())) {
        (map[key(startDate)] ??= []).push(record);
      }
      if (endDate && !Number.isNaN(endDate.getTime())) {
        (map[key(endDate)] ??= []).push(record);
      }
    }
    return map;
  }, [rows, startField, endField]);

  const monthLabel = format(month, "yyyy-MM");

  const openContextual = (recordId: unknown) =>
    navigate(`/${config.name}/show/${String(recordId)}`, {
      state: createRouteSurfaceNavigationState(location),
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={translate(
              "car.calendar.prevMonth",
              { ns: "car" },
              "Previous month"
            )}
            onClick={() => setMonth((m) => addMonths(m, -1))}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={translate(
              "car.calendar.nextMonth",
              { ns: "car" },
              "Next month"
            )}
            onClick={() => setMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMonth(new Date())}
            className="text-sm font-medium"
          >
            {translate("car.calendar.today", { ns: "car" }, "Today")}
          </Button>
        </div>
        <div className="text-sm font-medium text-muted-foreground">
          {monthLabel}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <div className="grid min-w-[720px] grid-cols-7 border-b bg-muted/40">
          {WEEKDAYS.map((key) => (
            <div
              key={key}
              className="border-r px-2 py-2 text-center text-xs font-medium text-muted-foreground last:border-r-0"
            >
              {translate(key, { ns: "car" }, key)}
            </div>
          ))}
        </div>
        <div className="grid min-w-[720px] grid-cols-7">
          {days.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const dayOrders = ordersByDay[dayKey] ?? [];
            const inMonth = isSameMonth(day, month);
            const isToday = isSameDay(day, new Date());
            return (
              <div
                key={dayKey}
                className={cn(
                  "min-h-24 border-b border-r p-1.5 last:border-r-0",
                  !inMonth && "bg-muted/20",
                  isToday && "bg-primary/5"
                )}
              >
                <div
                  className={cn(
                    "mb-1 flex h-6 w-6 items-center justify-center rounded-md text-xs",
                    isToday
                      ? "bg-primary font-semibold text-primary-foreground"
                      : "text-muted-foreground",
                    !inMonth && "opacity-40"
                  )}
                >
                  {format(day, "d")}
                </div>
                <div className="space-y-1">
                  {dayOrders.slice(0, 3).map((order) => (
                    <CalendarOrderPill
                      key={String(order.id)}
                      config={config}
                      record={order}
                      startField={startField}
                      endField={endField}
                      dayKey={dayKey}
                      onOpen={() => openContextual(order.id)}
                    />
                  ))}
                  {dayOrders.length > 3 ? (
                    <div className="px-1 text-[10px] text-muted-foreground">
                      +{dayOrders.length - 3} more
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CalendarOrderPill({
  config,
  record,
  startField,
  endField,
  dayKey,
  onOpen,
}: {
  config: CarResourceConfig;
  record: Record<string, unknown>;
  startField: string;
  endField?: string;
  dayKey: string;
  onOpen: () => void;
}) {
  const translate = useTranslate();
  const startValue = getNestedValue(record, startField);
  const endValue = endField ? getNestedValue(record, endField) : undefined;

  const startDate = startValue ? new Date(String(startValue)) : null;
  const endDate = endValue ? new Date(String(endValue)) : null;
  const startDay = startDate ? format(startDate, "yyyy-MM-dd") : null;
  const endDay = endDate ? format(endDate, "yyyy-MM-dd") : null;

  const isPickup = startDay === dayKey;
  const isReturn = endDay === dayKey && !isPickup;
  const tag = isPickup
    ? translate("car.calendar.pickup", { ns: "car" }, "取")
    : isReturn
      ? translate("car.calendar.return", { ns: "car" }, "还")
      : translate("car.calendar.both", { ns: "car" }, "取还");

  const title = resolveCalendarTitle(config, record);

  const statusColumn = config.columns.find((c) => c.accessor === "status");
  const status = String(getNestedValue(record, "status") ?? "");
  const statusOptions = statusColumn?.options;

  return (
    <button
      type="button"
      onClick={onOpen}
      title={translate("buttons.show", "View")}
      className={cn(
        "flex w-full items-center gap-1 truncate rounded-md border px-1.5 py-1 text-left text-[11px] transition-colors hover:bg-accent/60",
        isPickup
          ? "border-primary/30 bg-primary/10 text-primary"
          : isReturn
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            : "border-muted bg-muted/40"
      )}
    >
      <span
        className={cn(
          "shrink-0 rounded px-1 text-[10px] font-semibold",
          isPickup ? "bg-primary text-primary-foreground" : "bg-emerald-500/20"
        )}
      >
        {tag}
      </span>
      <span className="truncate font-medium">{title}</span>
      {statusOptions ? (
        <CarStatusBadge
          value={status}
          options={statusOptions}
          className="ml-auto hidden shrink-0 sm:inline-flex"
        />
      ) : null}
    </button>
  );
}

function resolveCalendarTitle(
  config: CarResourceConfig,
  record: Record<string, unknown>
): string {
  const tryRelation = (
    accessor: string,
    relation?: { labelField?: string }
  ): string | null => {
    if (!relation?.labelField) return null;
    const related = getNestedValue(record, accessor) as
      | Record<string, unknown>
      | undefined;
    const label = related?.[relation.labelField];
    return label !== null && label !== undefined && label !== ""
      ? String(label)
      : null;
  };

  const findRelation = (accessor: string) => {
    for (const column of config.columns) {
      for (const field of column.composite ?? []) {
        if (field.accessor === accessor && field.kind === "relation") {
          return field.relation;
        }
      }
      if (column.accessor === accessor && column.kind === "relation") {
        return column.relation;
      }
    }
    return undefined;
  };

  // Honor an explicit calendar title field when set (e.g. vehicle plate).
  const titleField = config.calendarTitleField;
  if (titleField) {
    const relation = findRelation(titleField);
    if (relation) {
      const label = tryRelation(titleField, relation);
      if (label) return label;
    }
    const plain = getNestedValue(record, titleField);
    if (plain !== null && plain !== undefined && plain !== "") {
      return String(plain);
    }
  }

  // Otherwise prefer the first relation label found in composite/top columns.
  for (const column of config.columns) {
    for (const field of column.composite ?? []) {
      if (field.kind === "relation") {
        const label = tryRelation(field.accessor, field.relation);
        if (label) return label;
      }
    }
  }
  for (const column of config.columns) {
    if (column.kind === "relation" && column.relation) {
      const label = tryRelation(column.accessor, column.relation);
      if (label) return label;
    }
  }
  const fallback = config.boardTitle ?? "order_no";
  return (
    String(getNestedValue(record, fallback) ?? "") || String(record.id ?? "-")
  );
}
