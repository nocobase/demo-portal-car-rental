import { useTranslate, type CrudFilters } from "@refinedev/core";
import { useQuery } from "@tanstack/react-query";
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
import { fetchAllRecords } from "@/lib/car/fetch-all";
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
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);
  const visibleStart = days[0];
  const visibleEnd = days[days.length - 1];
  const visibleStartIso = visibleStart.toISOString();
  const visibleEndExclusiveIso = new Date(
    visibleEnd.getFullYear(),
    visibleEnd.getMonth(),
    visibleEnd.getDate() + 1
  ).toISOString();

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

  const filters = useMemo<CrudFilters>(() => {
    const dateFilters: CrudFilters = endField
      ? [
          {
            field: startField,
            operator: "lt",
            value: visibleEndExclusiveIso,
          },
          {
            field: endField,
            operator: "gte",
            value: visibleStartIso,
          },
        ]
      : [
          {
            field: startField,
            operator: "gte",
            value: visibleStartIso,
          },
          {
            field: startField,
            operator: "lt",
            value: visibleEndExclusiveIso,
          },
        ];
    if (config.name === "scm_rental_orders") {
      dateFilters.push({ field: "status", operator: "ne", value: "cancelled" });
    }
    return dateFilters;
  }, [config.name, endField, startField, visibleEndExclusiveIso, visibleStartIso]);

  const calendarQuery = useQuery({
    queryKey: [
      "car",
      "calendar",
      config.name,
      startField,
      endField,
      visibleStartIso,
      visibleEndExclusiveIso,
    ],
    queryFn: async () => {
      const result = await fetchAllRecords<Record<string, unknown>>({
        resource: config.name,
        filters,
        sorters: [{ field: startField, order: "asc" }],
        meta: { appends: relationAppends },
      });
      if (!result.complete) {
        throw new Error(
          `Only ${result.rows.length} of ${result.total} calendar records loaded.`
        );
      }
      return result.rows;
    },
    retry: false,
  });

  const rows = useMemo(() => {
    const all = calendarQuery.data ?? [];
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
  }, [calendarQuery.data, search, config.searchableFields]);

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
      if (!startDate || Number.isNaN(startDate.getTime())) continue;
      const validEnd =
        endDate &&
        !Number.isNaN(endDate.getTime()) &&
        endDate.getTime() >= startDate.getTime()
          ? endDate
          : startDate;
      const clippedStart = new Date(
        Math.max(startDate.getTime(), visibleStart.getTime())
      );
      const clippedEnd = new Date(
        Math.min(validEnd.getTime(), visibleEnd.getTime())
      );
      if (clippedStart.getTime() > clippedEnd.getTime()) continue;
      for (const occupiedDay of eachDayOfInterval({
        start: clippedStart,
        end: clippedEnd,
      })) {
        const dayKey = format(occupiedDay, "yyyy-MM-dd");
        (map[dayKey] ??= []).push(record);
      }
    }
    return map;
  }, [rows, startField, endField, visibleEnd, visibleStart]);

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

      {calendarQuery.isError ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <span>
            {translate(
              "car.calendar.loadError",
              { ns: "car" },
              "Calendar records could not be loaded."
            )}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void calendarQuery.refetch()}
          >
            {translate("buttons.refresh", "Retry")}
          </Button>
        </div>
      ) : null}

      {calendarQuery.isLoading ? (
        <div className="rounded-lg border px-4 py-8 text-center text-sm text-muted-foreground">
          {translate("car.calendar.loading", { ns: "car" }, "Loading calendar…")}
        </div>
      ) : null}

      {!calendarQuery.isLoading && !calendarQuery.isError ? (
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
      ) : null}
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
    ? translate("car.calendar.pickup", { ns: "car" }, "Pickup")
    : isReturn
      ? translate("car.calendar.return", { ns: "car" }, "Return")
      : translate("car.calendar.occupied", { ns: "car" }, "Rental");

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
