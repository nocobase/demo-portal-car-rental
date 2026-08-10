import { useTranslate } from "@refinedev/core";
import { format, isSameDay, isWeekend } from "date-fns";
import {
  CalendarRange,
  CarFront,
  ChevronLeft,
  ChevronRight,
  Gauge,
  RotateCw,
  Wrench,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { CarStatusBadge } from "@/components/car/value";
import { cn } from "@/lib/utils";
import { useAIPageElementHandle } from "@/lib/car/ai";
import {
  MS_PER_DAY,
  addDays,
  startOfDay,
  useFleetSchedule,
  useOperationFilterOptions,
  vehicleLabel,
  type FleetScheduleFilters,
  type ScheduleBlock,
  type ScheduleVehicleRow,
} from "@/lib/car/operations";

const RANGE_OPTIONS = [7, 14, 30];
const ROW_HEIGHT = 44;
const LABEL_WIDTH = 240;

const vehicleStatusOptions = [
  { value: "available", label: "car.vehicle.status.available" },
  { value: "rented", label: "car.vehicle.status.rented" },
  { value: "maintenance", label: "car.vehicle.status.maintenance" },
  { value: "scrapped", label: "car.vehicle.status.scrapped" },
];

/**
 * Vehicle × date availability board. Every row is one car, every bar is a slot
 * where the car is not rentable: a booking, a workshop visit or a transfer
 * between branches. This is the view a rental counter plans the week from.
 */
export function FleetSchedulePage() {
  const translate = useTranslate();
  const navigate = useNavigate();
  const t = (key: string, fallback: string) =>
    translate(key, { ns: "car" }, fallback);

  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [days, setDays] = useState(14);
  const [filters, setFilters] = useState<FleetScheduleFilters>({});
  const [searchDraft, setSearchDraft] = useState("");

  const options = useOperationFilterOptions();
  const schedule = useFleetSchedule(anchor, days, filters);

  const dayCells = useMemo(
    () => Array.from({ length: days }, (_, index) => addDays(anchor, index)),
    [anchor, days]
  );
  const windowStart = anchor.getTime();
  const windowEnd = addDays(anchor, days).getTime();
  const today = startOfDay(new Date());

  const rows = schedule.data?.rows ?? [];

  const pageContext = useAIPageElementHandle({
    id: "fleet-schedule",
    title: t("car.schedule.title", "Fleet schedule"),
    kind: "table",
    getContext: () => ({
      resource: "scm_vehicles",
      window: {
        start: format(anchor, "yyyy-MM-dd"),
        days,
      },
      utilization: schedule.data?.utilization ?? 0,
      vehicles: rows.slice(0, 40).map((row) => ({
        plate: row.vehicle.plate_number,
        model: [row.vehicle.brand, row.vehicle.model].filter(Boolean).join(" "),
        status: row.vehicle.status,
        bookedDays: Number(row.bookedDays.toFixed(1)),
        blocks: row.blocks.map((block) => ({
          kind: block.kind,
          title: block.title,
          from: format(block.start, "yyyy-MM-dd HH:mm"),
          to: format(block.end, "yyyy-MM-dd HH:mm"),
          overdue: block.overdue,
        })),
      })),
    }),
  });

  const applySearch = () => {
    setFilters((current) => ({ ...current, search: searchDraft.trim() }));
  };

  return (
    <div ref={pageContext.ref} className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-[-0.035em]">
            {t("car.schedule.title", "Fleet schedule")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {t(
              "car.schedule.description",
              "Which car is free, which is out and which is in the workshop — day by day."
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={t("car.schedule.previous", "Previous period")}
            title={t("car.schedule.previous", "Previous period")}
            onClick={() => setAnchor((current) => addDays(current, -days))}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAnchor(startOfDay(new Date()))}
          >
            {t("car.schedule.today", "Today")}
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={t("car.schedule.next", "Next period")}
            title={t("car.schedule.next", "Next period")}
            onClick={() => setAnchor((current) => addDays(current, days))}
          >
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={translate("buttons.refresh", "Refresh")}
            title={translate("buttons.refresh", "Refresh")}
            onClick={() => schedule.refetch()}
          >
            <RotateCw />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ScheduleKpi
          icon={<CarFront className="size-4" />}
          label={t("car.schedule.kpi.vehicles", "Vehicles in view")}
          value={String(schedule.data?.totalVehicles ?? "-")}
        />
        <ScheduleKpi
          icon={<CalendarRange className="size-4" />}
          label={t("car.schedule.kpi.booked", "Booked at least once")}
          value={String(schedule.data?.bookedVehicles ?? "-")}
        />
        <ScheduleKpi
          icon={<Wrench className="size-4" />}
          label={t("car.schedule.kpi.blocked", "Workshop or transfer")}
          value={String(schedule.data?.blockedVehicles ?? "-")}
        />
        <ScheduleKpi
          icon={<Gauge className="size-4" />}
          label={t("car.schedule.kpi.utilization", "Window utilization")}
          value={
            schedule.data
              ? `${(schedule.data.utilization * 100).toFixed(1)}%`
              : "-"
          }
        />
      </div>

      <Card className="gap-0">
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
          <Input
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") applySearch();
            }}
            onBlur={applySearch}
            placeholder={t(
              "car.schedule.searchPlaceholder",
              "Plate, brand or model"
            )}
            className="h-8 w-52"
          />
          <NativeSelect
            size="sm"
            value={filters.branchId ?? ""}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                branchId: event.target.value || undefined,
              }))
            }
          >
            <NativeSelectOption value="">
              {t("car.schedule.allBranches", "All branches")}
            </NativeSelectOption>
            {(options.data?.branches ?? []).map((branch) => (
              <NativeSelectOption key={branch.id} value={String(branch.id)}>
                {branch.name ?? String(branch.id)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect
            size="sm"
            value={filters.categoryId ?? ""}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                categoryId: event.target.value || undefined,
              }))
            }
          >
            <NativeSelectOption value="">
              {t("car.schedule.allCategories", "All categories")}
            </NativeSelectOption>
            {(options.data?.categories ?? []).map((category) => (
              <NativeSelectOption key={category.id} value={String(category.id)}>
                {category.name ?? String(category.id)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect
            size="sm"
            value={filters.status ?? ""}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                status: event.target.value || undefined,
              }))
            }
          >
            <NativeSelectOption value="">
              {t("car.schedule.allStatuses", "Any vehicle status")}
            </NativeSelectOption>
            {vehicleStatusOptions.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {t(option.label, option.value)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <div className="ml-auto flex items-center gap-1">
            {RANGE_OPTIONS.map((option) => (
              <Button
                key={option}
                variant={days === option ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setDays(option)}
              >
                {t("car.schedule.rangeDays", "{{count}} days").replace(
                  "{{count}}",
                  String(option)
                )}
              </Button>
            ))}
          </div>
        </div>

        <CardContent className="p-0">
          {schedule.isLoading ? (
            <ScheduleSkeleton days={days} />
          ) : schedule.isError ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <p className="text-sm font-medium">
                {t("car.schedule.error", "The schedule could not be loaded.")}
              </p>
              <Button variant="outline" size="sm" onClick={() => schedule.refetch()}>
                {translate("buttons.refresh", "Retry")}
              </Button>
            </div>
          ) : !rows.length ? (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <p className="text-lg font-semibold">
                {t("car.schedule.empty.title", "No vehicles match the filters")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t(
                  "car.schedule.empty.description",
                  "Widen the branch, category or status filter to see more of the fleet."
                )}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div style={{ minWidth: LABEL_WIDTH + days * 56 }}>
                <div className="flex border-b bg-muted/45">
                  <div
                    className="sticky left-0 z-20 shrink-0 border-r bg-muted/45 px-3 py-2 text-xs font-medium text-muted-foreground"
                    style={{ width: LABEL_WIDTH }}
                  >
                    {t("car.schedule.vehicleColumn", "Vehicle")}
                  </div>
                  <div className="flex flex-1">
                    {dayCells.map((day) => (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          "flex-1 border-r px-1 py-2 text-center text-[11px] last:border-r-0",
                          isWeekend(day) && "bg-muted/60",
                          isSameDay(day, today) && "bg-primary/10 font-semibold"
                        )}
                      >
                        <div className="text-muted-foreground">
                          {format(day, "EEE")}
                        </div>
                        <div className="tabular-nums">{format(day, "d MMM")}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {rows.map((row) => (
                  <ScheduleRow
                    key={row.vehicle.id}
                    row={row}
                    windowStart={windowStart}
                    windowEnd={windowEnd}
                    days={days}
                    onOpenBlock={(block) =>
                      navigate(blockTarget(block), {
                        state: { returnTo: "/fleet-schedule" },
                      })
                    }
                    onOpenVehicle={() =>
                      navigate(`/scm_vehicles/profile/${row.vehicle.id}`)
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>

        <div className="flex flex-wrap items-center gap-4 border-t px-4 py-3 text-xs text-muted-foreground">
          <LegendSwatch className="bg-primary/80" label={t("car.schedule.legend.ongoing", "On rent")} />
          <LegendSwatch className="bg-sky-500/80" label={t("car.schedule.legend.reserved", "Reserved")} />
          <LegendSwatch className="bg-red-500/80" label={t("car.schedule.legend.overdue", "Overdue")} />
          <LegendSwatch className="bg-amber-500/80" label={t("car.schedule.legend.maintenance", "Maintenance")} />
          <LegendSwatch className="bg-violet-500/80" label={t("car.schedule.legend.dispatch", "Transfer")} />
        </div>
      </Card>
    </div>
  );
}

function ScheduleRow({
  row,
  windowStart,
  windowEnd,
  days,
  onOpenBlock,
  onOpenVehicle,
}: {
  row: ScheduleVehicleRow;
  windowStart: number;
  windowEnd: number;
  days: number;
  onOpenBlock: (block: ScheduleBlock) => void;
  onOpenVehicle: () => void;
}) {
  const windowMs = windowEnd - windowStart;
  const utilization = windowMs ? (row.bookedDays * MS_PER_DAY) / windowMs : 0;

  return (
    <div className="flex border-b last:border-b-0 hover:bg-accent/30">
      <button
        type="button"
        onClick={onOpenVehicle}
        className="sticky left-0 z-10 flex shrink-0 flex-col justify-center gap-0.5 border-r bg-card px-3 py-1.5 text-left transition-colors hover:bg-accent/60"
        style={{ width: LABEL_WIDTH, height: ROW_HEIGHT }}
      >
        <span className="truncate text-sm font-medium">
          {vehicleLabel(row.vehicle)}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <CarStatusBadge
            value={row.vehicle.status}
            options={vehicleStatusOptions}
            className="h-4 px-1 text-[10px]"
          />
          <span className="tabular-nums">
            {(utilization * 100).toFixed(0)}%
          </span>
        </span>
      </button>
      <div
        className="relative flex-1"
        style={{ height: ROW_HEIGHT }}
      >
        <div className="absolute inset-0 flex">
          {Array.from({ length: days }).map((_, index) => (
            <div key={index} className="flex-1 border-r last:border-r-0" />
          ))}
        </div>
        {row.blocks.map((block) => {
          const from = Math.max(block.start.getTime(), windowStart);
          const to = Math.min(block.end.getTime(), windowEnd);
          if (to <= from) return null;
          const left = ((from - windowStart) / windowMs) * 100;
          const width = ((to - from) / windowMs) * 100;
          return (
            <button
              key={block.id}
              type="button"
              onClick={() => onOpenBlock(block)}
              title={blockTooltip(block)}
              className={cn(
                "absolute top-1/2 flex -translate-y-1/2 items-center overflow-hidden rounded-md px-2 text-[11px] font-medium text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                blockClass(block)
              )}
              style={{
                left: `${left}%`,
                width: `calc(${width}% - 2px)`,
                height: ROW_HEIGHT - 14,
              }}
            >
              <span className="truncate">{block.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function blockClass(block: ScheduleBlock): string {
  if (block.kind === "maintenance") return "bg-amber-500/85";
  if (block.kind === "dispatch") return "bg-violet-500/85";
  if (block.overdue) return "bg-red-500/85";
  if (block.status === "reserved") return "bg-sky-500/85";
  return "bg-primary/85";
}

function blockTooltip(block: ScheduleBlock): string {
  const range = `${format(block.start, "d MMM HH:mm")} → ${format(
    block.end,
    "d MMM HH:mm"
  )}`;
  return [block.title, block.subtitle, range].filter(Boolean).join(" · ");
}

function blockTarget(block: ScheduleBlock): string {
  if (block.kind === "maintenance") {
    return `/scm_maintenance/show/${block.recordId}`;
  }
  if (block.kind === "dispatch") return `/scm_dispatch/show/${block.recordId}`;
  return `/scm_rental_orders/show/${block.recordId}`;
}

function LegendSwatch({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-2.5 rounded-sm", className)} aria-hidden="true" />
      {label}
    </span>
  );
}

function ScheduleKpi({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="gap-0">
      <CardContent className="flex items-center gap-4 py-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-2xl font-semibold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ScheduleSkeleton({ days }: { days: number }) {
  return (
    <div className="space-y-2 p-4">
      <Skeleton className="h-8 w-full" />
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="flex gap-2">
          <Skeleton className="h-9 shrink-0" style={{ width: LABEL_WIDTH }} />
          <Skeleton
            className="h-9 flex-1"
            style={{ opacity: 1 - (index % Math.max(1, days / 8)) * 0.05 }}
          />
        </div>
      ))}
    </div>
  );
}
