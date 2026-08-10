import { useTranslate } from "@refinedev/core";
import { differenceInCalendarDays, format } from "date-fns";
import {
  ArrowLeft,
  ArrowLeftRight,
  CircleDollarSign,
  Gauge,
  Pencil,
  ShieldCheck,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CarStatusBadge, formatMoney, formatNumber } from "@/components/car/value";
import { cn } from "@/lib/utils";
import { useAIPageElementHandle } from "@/lib/car/ai";
import { orderStatusOptions } from "@/lib/car/configs";
import {
  VEHICLE_UTILIZATION_WINDOW_DAYS,
  computeOrderEconomics,
  useVehicleProfile,
  vehicleLabel,
} from "@/lib/car/operations";

const vehicleStatusOptions = [
  { value: "available", label: "car.vehicle.status.available" },
  { value: "rented", label: "car.vehicle.status.rented" },
  { value: "maintenance", label: "car.vehicle.status.maintenance" },
  { value: "scrapped", label: "car.vehicle.status.scrapped" },
];

const violationStatusOptions = [
  { value: "pending", label: "car.violation.status.pending" },
  { value: "appealing", label: "car.violation.status.appealing" },
  { value: "processed", label: "car.violation.status.processed" },
];

const dispatchStatusOptions = [
  { value: "pending", label: "car.dispatch.status.pending" },
  { value: "in_transit", label: "car.dispatch.status.in_transit" },
  { value: "completed", label: "car.dispatch.status.completed" },
];

/**
 * Single-vehicle ledger: what the car earned, what it cost, how hard it worked
 * and every rental, service, policy, ticket and transfer attached to it.
 */
export function VehicleProfilePage() {
  const translate = useTranslate();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const t = (key: string, fallback: string) =>
    translate(key, { ns: "car" }, fallback);

  const profile = useVehicleProfile(id);
  const [tab, setTab] = useState("rentals");
  const data = profile.data;
  const vehicle = data?.vehicle ?? null;

  const pageContext = useAIPageElementHandle({
    id: `vehicle-profile-${id ?? "current"}`,
    title: vehicle ? vehicleLabel(vehicle) : t("car.vehicle.title", "Vehicle"),
    kind: "detail",
    getContext: () => ({
      resource: "scm_vehicles",
      vehicle: vehicle
        ? {
            plate: vehicle.plate_number,
            brand: vehicle.brand,
            model: vehicle.model,
            status: vehicle.status,
            mileage: vehicle.mileage,
            branch: vehicle.branch?.name ?? null,
            category: vehicle.category?.name ?? null,
          }
        : null,
      economics: data
        ? {
            revenue: data.revenue,
            maintenanceCost: data.maintenanceCost,
            insuranceCost: data.insuranceCost,
            violationCost: data.violationCost,
            profit: data.profit,
            utilization: data.utilization,
          }
        : null,
      counts: data
        ? {
            orders: data.orders.length,
            maintenance: data.maintenance.length,
            insurance: data.insurance.length,
            violations: data.violations.length,
            dispatch: data.dispatch.length,
          }
        : null,
    }),
  });

  if (profile.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (profile.isError || !vehicle) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <p className="text-lg font-semibold">
          {t("car.vehicleProfile.missing.title", "Vehicle not found")}
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {t(
            "car.vehicleProfile.missing.description",
            "The record may have been removed, or you may not have permission to view it."
          )}
        </p>
        <Button variant="outline" onClick={() => navigate("/scm_vehicles")}>
          <ArrowLeft />
          {t("car.vehicleProfile.backToFleet", "Back to fleet")}
        </Button>
      </div>
    );
  }

  const today = new Date();
  const serviceDays = data?.nextServiceDate
    ? differenceInCalendarDays(data.nextServiceDate, today)
    : null;
  const insuranceDays = data?.insuranceExpiry
    ? differenceInCalendarDays(data.insuranceExpiry, today)
    : null;
  const openViolations = (data?.violations ?? []).filter(
    (record) => record.status === "pending"
  ).length;

  return (
    <div ref={pageContext.ref} className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 h-7 px-2 text-muted-foreground"
            onClick={() => navigate("/scm_vehicles")}
          >
            <ArrowLeft />
            {t("car.vehicleProfile.backToFleet", "Back to fleet")}
          </Button>
          <h2 className="text-3xl font-semibold tracking-[-0.035em]">
            {vehicle.plate_number ?? `#${vehicle.id}`}
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>
              {[vehicle.brand, vehicle.model, vehicle.color]
                .filter(Boolean)
                .join(" · ")}
            </span>
            <CarStatusBadge
              value={vehicle.status}
              options={vehicleStatusOptions}
            />
            {vehicle.category?.name ? (
              <Badge variant="outline">{vehicle.category.name}</Badge>
            ) : null}
            {vehicle.branch?.name ? (
              <Badge variant="outline">{vehicle.branch.name}</Badge>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/scm_vehicles/edit/${vehicle.id}`)}
          >
            <Pencil />
            {translate("buttons.edit", "Edit")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/fleet-schedule")}
          >
            <Gauge />
            {t("car.vehicleProfile.openSchedule", "Open schedule")}
          </Button>
        </div>
      </div>

      {(serviceDays !== null && serviceDays <= 30) ||
      (insuranceDays !== null && insuranceDays <= 30) ||
      openViolations > 0 ? (
        <div className="flex flex-wrap gap-2">
          {serviceDays !== null && serviceDays <= 30 ? (
            <AlertPill
              tone={serviceDays < 0 ? "danger" : "warn"}
              icon={<Wrench className="size-3.5" />}
              label={
                serviceDays < 0
                  ? t("car.vehicleProfile.alert.serviceOverdue", "Service overdue")
                  : t("car.vehicleProfile.alert.serviceSoon", "Service due soon")
              }
              detail={`${format(data!.nextServiceDate!, "d MMM yyyy")} (${serviceDays}d)`}
            />
          ) : null}
          {insuranceDays !== null && insuranceDays <= 30 ? (
            <AlertPill
              tone={insuranceDays < 0 ? "danger" : "warn"}
              icon={<ShieldCheck className="size-3.5" />}
              label={
                insuranceDays < 0
                  ? t("car.vehicleProfile.alert.insuranceExpired", "Insurance expired")
                  : t("car.vehicleProfile.alert.insuranceSoon", "Insurance expiring")
              }
              detail={`${format(data!.insuranceExpiry!, "d MMM yyyy")} (${insuranceDays}d)`}
            />
          ) : null}
          {openViolations > 0 ? (
            <AlertPill
              tone="warn"
              icon={<ArrowLeftRight className="size-3.5" />}
              label={t("car.vehicleProfile.alert.violations", "Unresolved tickets")}
              detail={String(openViolations)}
            />
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ProfileKpi
          icon={<CircleDollarSign className="size-4" />}
          label={t("car.vehicleProfile.kpi.revenue", "Lifetime revenue")}
          value={formatMoney(data?.revenue)}
        />
        <ProfileKpi
          icon={<TrendingUp className="size-4" />}
          label={t("car.vehicleProfile.kpi.profit", "Profit after costs")}
          value={formatMoney(data?.profit)}
          tone={(data?.profit ?? 0) < 0 ? "negative" : "positive"}
          hint={t(
            "car.vehicleProfile.kpi.profitHint",
            "Revenue − service − insurance − fines"
          )}
        />
        <ProfileKpi
          icon={<Gauge className="size-4" />}
          label={t("car.vehicleProfile.kpi.utilization", "Utilization")}
          value={`${((data?.utilization ?? 0) * 100).toFixed(1)}%`}
          hint={t(
            "car.vehicleProfile.kpi.utilizationHint",
            "Last {{days}} days"
          ).replace("{{days}}", String(VEHICLE_UTILIZATION_WINDOW_DAYS))}
        />
        <ProfileKpi
          icon={<Wrench className="size-4" />}
          label={t("car.vehicleProfile.kpi.mileage", "Odometer")}
          value={`${formatNumber(vehicle.mileage)} km`}
          hint={
            data?.nextServiceDate
              ? `${t("car.vehicleProfile.kpi.nextService", "Next service")}: ${format(
                  data.nextServiceDate,
                  "d MMM yyyy"
                )}`
              : undefined
          }
        />
      </div>

      <Card className="gap-0">
        <Tabs value={tab} onValueChange={(value) => setTab(String(value))}>
          <div className="border-b px-4 py-3">
            <TabsList>
              <TabsTrigger value="rentals">
                {t("car.vehicleProfile.tab.rentals", "Rentals")} (
                {data?.orders.length ?? 0})
              </TabsTrigger>
              <TabsTrigger value="maintenance">
                {t("car.vehicleProfile.tab.maintenance", "Service")} (
                {data?.maintenance.length ?? 0})
              </TabsTrigger>
              <TabsTrigger value="insurance">
                {t("car.vehicleProfile.tab.insurance", "Insurance")} (
                {data?.insurance.length ?? 0})
              </TabsTrigger>
              <TabsTrigger value="violations">
                {t("car.vehicleProfile.tab.violations", "Tickets")} (
                {data?.violations.length ?? 0})
              </TabsTrigger>
              <TabsTrigger value="dispatch">
                {t("car.vehicleProfile.tab.dispatch", "Transfers")} (
                {data?.dispatch.length ?? 0})
              </TabsTrigger>
            </TabsList>
          </div>

          <CardContent className="p-0">
            <TabsContent value="rentals">
              <ProfileTable
                emptyLabel={t(
                  "car.vehicleProfile.empty.rentals",
                  "This car has never been rented out."
                )}
                headers={[
                  t("car.order.order_no", "Order"),
                  t("car.order.customer", "Customer"),
                  t("car.order.pickup_time", "Pick-up"),
                  t("car.order.expected_return", "Return"),
                  t("car.order.status.label", "Status"),
                  t("car.order.total_amount", "Amount"),
                ]}
                rows={(data?.orders ?? []).map((order) => {
                  const economics = computeOrderEconomics(order);
                  return {
                    key: order.id,
                    href: `/scm_rental_orders/show/${order.id}`,
                    cells: [
                      order.order_no ?? `#${order.id}`,
                      order.customer?.name ?? "-",
                      order.pickup_time
                        ? format(new Date(order.pickup_time), "d MMM yyyy")
                        : "-",
                      order.actual_return ?? order.expected_return
                        ? format(
                            new Date(
                              String(order.actual_return ?? order.expected_return)
                            ),
                            "d MMM yyyy"
                          )
                        : "-",
                      <CarStatusBadge
                        key="status"
                        value={order.status}
                        options={orderStatusOptions}
                      />,
                      formatMoney(economics.baseAmount),
                    ],
                  };
                })}
              />
            </TabsContent>

            <TabsContent value="maintenance">
              <ProfileTable
                emptyLabel={t(
                  "car.vehicleProfile.empty.maintenance",
                  "No workshop visits recorded."
                )}
                headers={[
                  t("car.maintenance.date", "Date"),
                  t("car.maintenance.type.label", "Type"),
                  t("car.maintenance.next_date", "Next due"),
                  t("car.maintenance.cost", "Cost"),
                  t("car.maintenance.description", "Notes"),
                ]}
                rows={(data?.maintenance ?? []).map((record) => ({
                  key: record.id,
                  href: `/scm_maintenance/show/${record.id}`,
                  cells: [
                    record.date ? format(new Date(record.date), "d MMM yyyy") : "-",
                    record.type ?? "-",
                    record.next_date
                      ? format(new Date(record.next_date), "d MMM yyyy")
                      : "-",
                    formatMoney(record.cost),
                    record.description ?? "-",
                  ],
                }))}
              />
            </TabsContent>

            <TabsContent value="insurance">
              <ProfileTable
                emptyLabel={t(
                  "car.vehicleProfile.empty.insurance",
                  "No policy is attached to this car."
                )}
                headers={[
                  t("car.insurance.type.label", "Type"),
                  t("car.insurance.provider", "Provider"),
                  t("car.insurance.policy_number", "Policy no."),
                  t("car.insurance.start_date", "From"),
                  t("car.insurance.end_date", "Until"),
                  t("car.insurance.premium", "Premium"),
                ]}
                rows={(data?.insurance ?? []).map((record) => ({
                  key: record.id,
                  href: `/scm_insurance/show/${record.id}`,
                  cells: [
                    record.type ?? "-",
                    record.provider ?? "-",
                    record.policy_number ?? "-",
                    record.start_date
                      ? format(new Date(record.start_date), "d MMM yyyy")
                      : "-",
                    record.end_date
                      ? format(new Date(record.end_date), "d MMM yyyy")
                      : "-",
                    formatMoney(record.premium),
                  ],
                }))}
              />
            </TabsContent>

            <TabsContent value="violations">
              <ProfileTable
                emptyLabel={t(
                  "car.vehicleProfile.empty.violations",
                  "A clean record — no tickets."
                )}
                headers={[
                  t("car.violation.date", "Date"),
                  t("car.violation.location", "Location"),
                  t("car.violation.points", "Points"),
                  t("car.violation.fine_amount", "Fine"),
                  t("car.violation.status.label", "Status"),
                ]}
                rows={(data?.violations ?? []).map((record) => ({
                  key: record.id,
                  href: `/scm_violations/show/${record.id}`,
                  cells: [
                    record.date ? format(new Date(record.date), "d MMM yyyy") : "-",
                    record.location ?? "-",
                    String(record.points ?? "-"),
                    formatMoney(record.fine_amount),
                    <CarStatusBadge
                      key="status"
                      value={record.status}
                      options={violationStatusOptions}
                    />,
                  ],
                }))}
              />
            </TabsContent>

            <TabsContent value="dispatch">
              <ProfileTable
                emptyLabel={t(
                  "car.vehicleProfile.empty.dispatch",
                  "This car has never changed branch."
                )}
                headers={[
                  t("car.dispatch.dispatch_no", "Transfer"),
                  t("car.dispatch.dispatch_date", "Date"),
                  t("car.dispatch.from_branch", "From"),
                  t("car.dispatch.to_branch", "To"),
                  t("car.dispatch.status.label", "Status"),
                ]}
                rows={(data?.dispatch ?? []).map((record) => ({
                  key: record.id,
                  href: `/scm_dispatch/show/${record.id}`,
                  cells: [
                    record.dispatch_no ?? `#${record.id}`,
                    record.dispatch_date
                      ? format(new Date(record.dispatch_date), "d MMM yyyy")
                      : "-",
                    record.from_branch?.name ?? "-",
                    record.to_branch?.name ?? "-",
                    <CarStatusBadge
                      key="status"
                      value={record.status}
                      options={dispatchStatusOptions}
                    />,
                  ],
                }))}
              />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}

type ProfileRow = {
  key: number | string;
  href: string;
  cells: ReactNode[];
};

function ProfileTable({
  headers,
  rows,
  emptyLabel,
}: {
  headers: string[];
  rows: ProfileRow[];
  emptyLabel: string;
}) {
  const navigate = useNavigate();
  if (!rows.length) {
    return (
      <div className="px-6 py-14 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/45 text-left text-xs text-muted-foreground">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-2 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => (
            <tr
              key={row.key}
              onClick={() => navigate(row.href)}
              className="cursor-pointer transition-colors hover:bg-accent/30"
            >
              {row.cells.map((cell, index) => (
                <td key={index} className="px-4 py-2.5 align-middle">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AlertPill({
  tone,
  icon,
  label,
  detail,
}: {
  tone: "warn" | "danger";
  icon: ReactNode;
  label: string;
  detail: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
        tone === "danger"
          ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
          : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
      )}
    >
      {icon}
      {label}
      <span className="font-normal opacity-80">{detail}</span>
    </span>
  );
}

function ProfileKpi({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: "positive" | "negative";
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
              tone === "positive" && "text-emerald-600 dark:text-emerald-400",
              tone === "negative" && "text-red-600 dark:text-red-400"
            )}
          >
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
