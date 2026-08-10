import { useTranslate } from "@refinedev/core";
import { useQuery } from "@tanstack/react-query";
import { differenceInCalendarDays, format } from "date-fns";
import {
  CarFront,
  Check,
  CircleDollarSign,
  FileText,
  Gauge,
  Printer,
  Receipt,
  ShieldAlert,
} from "lucide-react";
import { type ReactNode } from "react";
import { useNavigate } from "react-router";

import { nocobaseClient } from "@nocobase/portal-sdk/client";
import { fetchAllRecords } from "@/lib/car/fetch-all";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderActionBar } from "@/components/car/car-order-actions";
import {
  printContract,
  printRentalAgreement,
  printSettlement,
} from "@/components/car/car-print";
import { formatMoney, formatNumber } from "@/components/car/value";
import { cn } from "@/lib/utils";
import {
  computeOrderEconomics,
  getOrderTimelineIssues,
  parseDate,
  useVehicleProfile,
  vehicleLabel,
  type OrderRecord,
  type OrderStatus,
} from "@/lib/car/operations";
import type { CarResourceConfig } from "@/lib/car/types";

/**
 * Per-collection panels appended to the generic record drawer: the parts of a
 * detail screen a rental system has that a CRUD scaffold does not — lifecycle
 * controls, a settlement breakdown, counterparty risk and printable paperwork.
 */
export function CarDetailExtras({
  config,
  record,
}: {
  config: CarResourceConfig;
  record: Record<string, unknown>;
}) {
  if (config.name === "scm_rental_orders") {
    return <OrderExtras recordId={String(record.id)} />;
  }
  if (config.name === "scm_contracts") {
    return <ContractExtras record={record} />;
  }
  if (config.name === "scm_customers") {
    return <CustomerExtras record={record} />;
  }
  if (config.name === "scm_vehicles") {
    return <VehicleExtras recordId={String(record.id)} />;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

const LIFECYCLE: OrderStatus[] = ["reserved", "ongoing", "completed"];

const useOrderDetail = (recordId: string) =>
  useQuery({
    queryKey: ["car", "order-detail", recordId],
    queryFn: async () => {
      const [response, payments] = await Promise.all([
        nocobaseClient.action<OrderRecord>("scm_rental_orders", "get", {
          method: "GET",
          query: {
            filterByTk: recordId,
            appends: ["vehicle", "customer"],
          },
        }),
        fetchAllRecords<NonNullable<OrderRecord["payments"]>[number]>({
          resource: "scm_payments",
          filters: [{ field: "orderId", operator: "eq", value: recordId }],
          sorters: [{ field: "payment_time", order: "asc" }],
        }),
      ]);
      if (!payments.complete) {
        throw new Error(
          `Only ${payments.rows.length} of ${payments.total} payments loaded.`
        );
      }
      return response ? { ...response, payments: payments.rows } : null;
    },
  });

function OrderExtras({ recordId }: { recordId: string }) {
  const translate = useTranslate();
  const t = (key: string, fallback: string) =>
    translate(key, { ns: "car" }, fallback);
  const query = useOrderDetail(recordId);
  const order = query.data;

  if (query.isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }
  if (query.isError) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        <span>
          {t(
            "car.order.detailLoadError",
            "Order settlement details could not be loaded."
          )}
        </span>
        <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
          {translate("buttons.refresh", "Retry")}
        </Button>
      </div>
    );
  }
  if (!order) return null;

  const economics = computeOrderEconomics(order);
  const timelineIssues = getOrderTimelineIssues(order);
  const cancelled = order.status === "cancelled";
  const activeIndex = cancelled
    ? -1
    : LIFECYCLE.indexOf((order.status ?? "reserved") as OrderStatus);

  const agreementLabels = {
    title: t("car.print.agreement.title", "Rental agreement"),
    printedAt: t("car.print.printedAt", "Printed"),
    customer: t("car.print.customer", "Customer"),
    customerName: t("car.customer.name", "Name"),
    phone: t("car.customer.phone", "Phone"),
    creditLevel: t("car.customer.credit_level.label", "Credit level"),
    licenceExpiry: t("car.customer.license_expiry", "Licence expiry"),
    vehicle: t("car.print.vehicle", "Vehicle"),
    plate: t("car.vehicle.plate_number", "Plate"),
    model: t("car.vehicle.model", "Model"),
    color: t("car.vehicle.color", "Colour"),
    odometer: t("car.vehicle.mileage", "Odometer (km)"),
    rental: t("car.print.rental", "Rental"),
    pickup: t("car.order.pickup_time", "Pick-up"),
    expectedReturn: t("car.order.expected_return", "Expected return"),
    days: t("car.print.days", "Days"),
    dailyRate: t("car.order.daily_rate", "Daily rate"),
    total: t("car.order.total_amount", "Total"),
    deposit: t("car.payment.deposit", "Deposit"),
    terms: t("car.print.terms", "Terms"),
    termsBody: t(
      "car.print.termsBody",
      "The vehicle is handed over in the condition recorded above. Overdue returns are charged at 150% of the daily rate for each started day. Fines and damage caused during the rental are charged to the renter."
    ),
    customerSignature: t("car.print.customerSignature", "Customer signature"),
    staffSignature: t("car.print.staffSignature", "Staff signature"),
  };

  const settlementLabels = {
    title: t("car.print.settlement.title", "Settlement receipt"),
    period: t("car.print.period", "Rental period"),
    pickup: agreementLabels.pickup,
    expectedReturn: agreementLabels.expectedReturn,
    actualReturn: t("car.order.actual_return", "Actual return"),
    charges: t("car.print.charges", "Charges"),
    rentalLine: t("car.print.rentalLine", "Rental"),
    lateFeeLine: t("car.print.lateFeeLine", "Late return"),
    paidLine: t("car.print.paidLine", "Already paid"),
    refundLine: t("car.print.refundLine", "Refund"),
    balanceDue: t("car.print.balanceDue", "Balance due"),
    creditDue: t("car.order.settlement.credit", "Customer credit"),
    depositNote: t("car.print.depositNote", "Deposit held:"),
    estimateNote: t(
      "car.print.estimateNote",
      "Late fees are calculated at 150% of the daily rate per started day."
    ),
    customerSignature: agreementLabels.customerSignature,
    staffSignature: agreementLabels.staffSignature,
  };

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-medium">
        {t("car.order.lifecycle.title", "Rental lifecycle")}
      </h3>

      {timelineIssues.length ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <div className="font-medium">
            {t("car.order.timeline.invalid", "Order timeline needs correction")}
          </div>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {timelineIssues.map((issue) => (
              <li key={issue}>
                {t(
                  `car.order.timeline.${issue}`,
                  {
                    expectedNotAfterPickup:
                      "Expected return is not after the scheduled pickup.",
                    actualBeforePickup:
                      "Actual return is earlier than the scheduled pickup.",
                    reservedPastDue:
                      "This reservation passed its expected return without starting.",
                    ongoingBeforePickup:
                      "This rental is ongoing even though its pickup is still in the future.",
                  }[issue]
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {cancelled ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm">
          <span className="font-medium text-red-600 dark:text-red-400">
            {t("car.order.status.cancelled", "Cancelled")}
          </span>
          {order.cancel_reason ? (
            <span className="ml-2 text-muted-foreground">
              {translate(
                `car.order.cancel_reason.${order.cancel_reason}`,
                { ns: "car" },
                order.cancel_reason
              )}
            </span>
          ) : null}
        </div>
      ) : (
        <ol className="flex items-center gap-2">
          {LIFECYCLE.map((step, index) => {
            const done = index < activeIndex;
            const active = index === activeIndex;
            return (
              <li key={step} className="flex flex-1 items-center gap-2">
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold",
                    done && "border-emerald-500 bg-emerald-500 text-white",
                    active && "border-primary bg-primary text-primary-foreground",
                    !done && !active && "text-muted-foreground"
                  )}
                >
                  {done ? <Check className="size-3" /> : index + 1}
                </span>
                <span
                  className={cn(
                    "text-xs",
                    active ? "font-medium" : "text-muted-foreground"
                  )}
                >
                  {translate(`car.order.status.${step}`, { ns: "car" }, step)}
                </span>
                {index < LIFECYCLE.length - 1 ? (
                  <span
                    className={cn(
                      "h-px flex-1",
                      done ? "bg-emerald-500" : "bg-border"
                    )}
                    aria-hidden="true"
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      )}

      <OrderActionBar order={order} onDone={() => query.refetch()} />

      <Separator />

      <h3 className="text-sm font-medium">
        {t("car.order.settlement.title", "Settlement")}
      </h3>
      <dl className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 text-sm sm:grid-cols-4">
        <ExtraCell
          label={t("car.order.settlement.plannedDays", "Booked days")}
          value={String(economics.plannedDays)}
        />
        <ExtraCell
          label={t("car.order.settlement.base", "Rental")}
          value={formatMoney(economics.baseAmount)}
        />
        <ExtraCell
          label={t("car.order.settlement.lateFee", "Late fee (est.)")}
          value={formatMoney(economics.lateFee)}
          tone={economics.lateFee > 0 ? "warn" : undefined}
        />
        <ExtraCell
          label={t("car.order.settlement.balance", "Balance due")}
          value={formatMoney(economics.balanceDue)}
          tone={economics.balanceDue > 0 ? "warn" : undefined}
        />
        {economics.creditDue > 0 ? (
          <ExtraCell
            label={t("car.order.settlement.credit", "Customer credit")}
            value={formatMoney(economics.creditDue)}
            tone="warn"
          />
        ) : null}
        <ExtraCell
          label={t("car.payment.status.label", "Payment status")}
          value={
            order.payments?.length
              ? t(
                  "car.order.settlement.paymentCount",
                  "{{paid}} of {{total}} transactions paid"
                )
                  .replace(
                    "{{paid}}",
                    String(
                      order.payments.filter(
                        (payment) => payment.status === "paid"
                      ).length
                    )
                  )
                  .replace("{{total}}", String(order.payments.length))
              : t("car.order.settlement.noPayment", "No settlement record")
          }
        />
        <ExtraCell
          label={t("car.payment.deposit", "Deposit held")}
          value={formatMoney(economics.depositHeld)}
        />
        <ExtraCell
          label={t("car.payment.refund", "Refunded")}
          value={formatMoney(economics.refunded)}
        />
        <ExtraCell
          label={t("car.order.settlement.overdue", "Overdue")}
          value={
            economics.overdueDays > 0
              ? t("car.order.settlement.overdueDaysValue", "{{count}} days").replace(
                  "{{count}}",
                  String(economics.overdueDays)
                )
              : t("car.order.settlement.onTime", "On time")
          }
          tone={economics.overdueDays > 0 ? "warn" : undefined}
        />
      </dl>
      <p className="text-xs text-muted-foreground">
        {t(
          "car.order.settlement.note",
          "Late fees are an on-screen estimate at 150% of the daily rate per started day; the backend has no late-fee field."
        )}
      </p>

      {order.customer ? (
        <>
          <Separator />
          <h3 className="text-sm font-medium">
            {t("car.order.counterparty", "Renter")}
          </h3>
          <CustomerRiskStrip customer={order.customer} />
        </>
      ) : null}

      <Separator />
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => printRentalAgreement(order, agreementLabels)}
          disabled={timelineIssues.length > 0}
        >
          <FileText />
          {t("car.print.agreement.action", "Print agreement")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => printSettlement(order, settlementLabels)}
          disabled={timelineIssues.length > 0}
        >
          <Receipt />
          {t("car.print.settlement.action", "Print settlement")}
        </Button>
      </div>
    </section>
  );
}

function CustomerRiskStrip({
  customer,
}: {
  customer: NonNullable<OrderRecord["customer"]>;
}) {
  const translate = useTranslate();
  const t = (key: string, fallback: string) =>
    translate(key, { ns: "car" }, fallback);
  const expiry = parseDate(customer.license_expiry);
  const daysToExpiry = expiry
    ? differenceInCalendarDays(expiry, new Date())
    : null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline" className="font-medium">
        {customer.name ?? "-"}
      </Badge>
      {customer.phone ? (
        <span className="text-xs text-muted-foreground">{customer.phone}</span>
      ) : null}
      {customer.is_blacklisted ? (
        <Badge variant="outline" className="gap-1 text-destructive">
          <ShieldAlert className="size-3" />
          {t("car.customer.blacklisted", "Blacklisted")}
        </Badge>
      ) : null}
      {customer.credit_level ? (
        <Badge
          variant="outline"
          className={cn(
            customer.credit_level === "low" &&
              "text-red-600 dark:text-red-400",
            customer.credit_level === "high" &&
              "text-emerald-600 dark:text-emerald-400"
          )}
        >
          {translate(
            `car.customer.credit_level.${customer.credit_level}`,
            { ns: "car" },
            customer.credit_level
          )}
        </Badge>
      ) : null}
      {customer.member_level ? (
        <Badge variant="outline">{customer.member_level}</Badge>
      ) : null}
      {daysToExpiry !== null ? (
        <Badge
          variant="outline"
          className={cn(
            daysToExpiry < 0 && "text-red-600 dark:text-red-400",
            daysToExpiry >= 0 &&
              daysToExpiry <= 60 &&
              "text-amber-600 dark:text-amber-400"
          )}
        >
          {daysToExpiry < 0
            ? t("car.customer.licenceExpired", "Licence expired")
            : t("car.customer.licenceExpires", "Licence until")}{" "}
          {expiry ? format(expiry, "d MMM yyyy") : ""}
        </Badge>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Contracts                                                           */
/* ------------------------------------------------------------------ */

function ContractExtras({ record }: { record: Record<string, unknown> }) {
  const translate = useTranslate();
  const t = (key: string, fallback: string) =>
    translate(key, { ns: "car" }, fallback);

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium">
        {t("car.contract.paperwork", "Paperwork")}
      </h3>
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          printContract(record, {
            title: t("car.print.contract.title", "Rental contract"),
            printedAt: t("car.print.printedAt", "Printed"),
            parties: t("car.print.parties", "Parties"),
            customerName: t("car.customer.name", "Customer"),
            phone: t("car.customer.phone", "Phone"),
            orderNo: t("car.order.order_no", "Order"),
            signDate: t("car.contract.sign_date", "Signed on"),
            status: t("car.contract.status.label", "Status"),
            body: t("car.contract.content", "Contract body"),
            emptyBody: t(
              "car.print.contract.emptyBody",
              "No contract text has been captured on this record."
            ),
            customerSignature: t("car.print.customerSignature", "Customer signature"),
            staffSignature: t("car.print.staffSignature", "Staff signature"),
          })
        }
      >
        <Printer />
        {t("car.print.contract.action", "Print contract")}
      </Button>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Customers                                                           */
/* ------------------------------------------------------------------ */

function CustomerExtras({ record }: { record: Record<string, unknown> }) {
  const translate = useTranslate();
  const t = (key: string, fallback: string) =>
    translate(key, { ns: "car" }, fallback);

  const history = useQuery({
    queryKey: ["car", "customer-history", record.id],
    queryFn: async () => {
      const orders = await nocobaseClient.action<OrderRecord[]>(
        "scm_rental_orders",
        "list",
        {
          method: "GET",
          query: {
            pageSize: 200,
            sort: "-pickup_time",
            appends: ["vehicle"],
            filter: JSON.stringify({ customerId: { $eq: record.id } }),
          },
        }
      );
      return Array.isArray(orders) ? orders : [];
    },
  });

  const orders = history.data ?? [];
  const completed = orders.filter((order) => order.status === "completed");
  const cancelled = orders.filter((order) => order.status === "cancelled");
  const spend = orders
    .filter((order) => order.status !== "cancelled")
    .reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0);
  const lateReturns = completed.filter(
    (order) => computeOrderEconomics(order).overdueDays > 0
  ).length;

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-medium">
        {t("car.customer.relationship", "Relationship")}
      </h3>
      <CustomerRiskStrip
        customer={{
          id: Number(record.id),
          name: record.name as string | null,
          phone: record.phone as string | null,
          credit_level: record.credit_level as string | null,
          member_level: record.member_level as string | null,
          is_blacklisted: record.is_blacklisted as boolean | null,
          license_expiry: record.license_expiry as string | null,
        }}
      />

      {history.isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : (
        <dl className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 text-sm sm:grid-cols-4">
          <ExtraCell
            label={t("car.customer.stats.rentals", "Rentals")}
            value={String(orders.length)}
          />
          <ExtraCell
            label={t("car.customer.stats.spend", "Lifetime spend")}
            value={formatMoney(spend)}
          />
          <ExtraCell
            label={t("car.customer.stats.cancelled", "Cancelled")}
            value={String(cancelled.length)}
            tone={cancelled.length > 2 ? "warn" : undefined}
          />
          <ExtraCell
            label={t("car.customer.stats.lateReturns", "Late returns")}
            value={String(lateReturns)}
            tone={lateReturns > 0 ? "warn" : undefined}
          />
        </dl>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Vehicles                                                            */
/* ------------------------------------------------------------------ */

function VehicleExtras({ recordId }: { recordId: string }) {
  const translate = useTranslate();
  const navigate = useNavigate();
  const t = (key: string, fallback: string) =>
    translate(key, { ns: "car" }, fallback);
  const profile = useVehicleProfile(recordId);
  const data = profile.data;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">
          {t("car.vehicle.ledger", "Vehicle ledger")}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/scm_vehicles/profile/${recordId}`)}
        >
          <CarFront />
          {t("car.vehicle.openProfile", "Open full profile")}
        </Button>
      </div>

      {profile.isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : (
        <dl className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 text-sm sm:grid-cols-4">
          <ExtraCell
            label={t("car.vehicleProfile.kpi.revenue", "Revenue")}
            value={formatMoney(data?.revenue)}
            icon={<CircleDollarSign className="size-3.5" />}
          />
          <ExtraCell
            label={t("car.vehicleProfile.kpi.profit", "Profit")}
            value={formatMoney(data?.profit)}
            tone={(data?.profit ?? 0) < 0 ? "warn" : undefined}
          />
          <ExtraCell
            label={t("car.vehicleProfile.kpi.utilization", "Utilization")}
            value={`${((data?.utilization ?? 0) * 100).toFixed(1)}%`}
            icon={<Gauge className="size-3.5" />}
          />
          <ExtraCell
            label={t("car.vehicleProfile.kpi.rentals", "Rentals")}
            value={formatNumber(data?.orders.length ?? 0)}
          />
        </dl>
      )}

      {data?.vehicle ? (
        <p className="text-xs text-muted-foreground">
          {vehicleLabel(data.vehicle)}
        </p>
      ) : null}
    </section>
  );
}

function ExtraCell({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone?: "warn";
  icon?: ReactNode;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-[11px] text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd
        className={cn(
          "font-semibold tabular-nums",
          tone === "warn" && "text-amber-600 dark:text-amber-400"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
