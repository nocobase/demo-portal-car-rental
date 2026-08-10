import { useTranslate } from "@refinedev/core";
import { format } from "date-fns";
import {
  AlertTriangle,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock4,
  KeyRound,
  RotateCw,
  ShieldAlert,
  Undo2,
  WalletCards,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { useNavigate } from "react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderActionBar } from "@/components/car/car-order-actions";
import { CarStatusBadge, formatMoney } from "@/components/car/value";
import { cn } from "@/lib/utils";
import { useAIPageElementHandle } from "@/lib/car/ai";
import { orderStatusOptions } from "@/lib/car/configs";
import {
  addDays,
  computeOrderEconomics,
  getOrderTimelineIssues,
  startOfDay,
  useRentalDesk,
  vehicleLabel,
  type OrderRecord,
  type PaymentRecord,
} from "@/lib/car/operations";

/**
 * The counter's working day: what has to be handed over, what has to come back,
 * what is already late and what is still unpaid — each row carrying the action
 * that clears it.
 */
export function RentalDeskPage() {
  const translate = useTranslate();
  const navigate = useNavigate();
  const t = (key: string, fallback: string) =>
    translate(key, { ns: "car" }, fallback);

  const [day, setDay] = useState(() => startOfDay(new Date()));
  const desk = useRentalDesk(day);
  const data = desk.data;

  const receivableTotal = (data?.receivables ?? []).reduce(
    (sum, payment) => sum + Number(payment.amount ?? 0),
    0
  );

  const pageContext = useAIPageElementHandle({
    id: "rental-desk",
    title: t("car.desk.title", "Rental desk"),
    kind: "detail",
    getContext: () => ({
      resource: "scm_rental_orders",
      day: format(day, "yyyy-MM-dd"),
      pickups: (data?.pickups ?? []).map(compactOrder),
      returns: (data?.returns ?? []).map(compactOrder),
      overdue: (data?.overdue ?? []).map(compactOrder),
      receivableTotal,
      ongoing: data?.ongoing ?? 0,
    }),
  });

  const isToday = day.getTime() === startOfDay(new Date()).getTime();

  return (
    <div ref={pageContext.ref} className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-[-0.035em]">
            {t("car.desk.title", "Rental desk")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {t(
              "car.desk.description",
              "Handovers, returns, late cars and open balances for the selected day."
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={t("car.desk.previousDay", "Previous day")}
            title={t("car.desk.previousDay", "Previous day")}
            onClick={() => setDay((current) => addDays(current, -1))}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant={isToday ? "secondary" : "outline"}
            size="sm"
            onClick={() => setDay(startOfDay(new Date()))}
          >
            {format(day, "EEE d MMM yyyy")}
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={t("car.desk.nextDay", "Next day")}
            title={t("car.desk.nextDay", "Next day")}
            onClick={() => setDay((current) => addDays(current, 1))}
          >
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={translate("buttons.refresh", "Refresh")}
            title={translate("buttons.refresh", "Refresh")}
            onClick={() => desk.refetch()}
          >
            <RotateCw />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DeskKpi
          icon={<KeyRound className="size-4" />}
          label={t("car.desk.kpi.pickups", "Handovers due")}
          value={String(data?.pickups.length ?? "-")}
        />
        <DeskKpi
          icon={<Undo2 className="size-4" />}
          label={t("car.desk.kpi.returns", "Returns due")}
          value={String(data?.returns.length ?? "-")}
        />
        <DeskKpi
          icon={<AlertTriangle className="size-4" />}
          label={t("car.desk.kpi.overdue", "Overdue on road")}
          value={String(data?.overdue.length ?? "-")}
          tone={data && data.overdue.length > 0 ? "warn" : undefined}
        />
        <DeskKpi
          icon={<WalletCards className="size-4" />}
          label={t("car.desk.kpi.receivable", "Open balances")}
          value={data ? formatMoney(receivableTotal) : "-"}
          tone={receivableTotal > 0 ? "warn" : undefined}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <DeskQueue
          icon={<KeyRound className="size-4" />}
          title={t("car.desk.queue.pickups", "Handovers")}
          description={t(
            "car.desk.queue.pickupsHint",
            "Bookings scheduled to leave the branch on this day."
          )}
          isLoading={desk.isLoading}
          isError={desk.isError}
          onRetry={() => desk.refetch()}
          emptyLabel={t("car.desk.queue.pickupsEmpty", "Nothing to hand over.")}
          count={data?.pickups.length ?? 0}
        >
          {(data?.pickups ?? []).map((order) => (
            <DeskOrderRow
              key={order.id}
              order={order}
              timeField="pickup_time"
              onOpen={() => navigate(`/scm_rental_orders/show/${order.id}`)}
              onDone={() => desk.refetch()}
            />
          ))}
        </DeskQueue>

        <DeskQueue
          icon={<Undo2 className="size-4" />}
          title={t("car.desk.queue.returns", "Returns")}
          description={t(
            "car.desk.queue.returnsHint",
            "Cars expected back at the counter on this day."
          )}
          isLoading={desk.isLoading}
          isError={desk.isError}
          onRetry={() => desk.refetch()}
          emptyLabel={t("car.desk.queue.returnsEmpty", "No returns expected.")}
          count={data?.returns.length ?? 0}
        >
          {(data?.returns ?? []).map((order) => (
            <DeskOrderRow
              key={order.id}
              order={order}
              timeField="expected_return"
              onOpen={() => navigate(`/scm_rental_orders/show/${order.id}`)}
              onDone={() => desk.refetch()}
            />
          ))}
        </DeskQueue>

        <DeskQueue
          icon={<AlertTriangle className="size-4" />}
          title={t("car.desk.queue.overdue", "Overdue")}
          description={t(
            "car.desk.queue.overdueHint",
            "Past the agreed return time — late fees accrue daily."
          )}
          isLoading={desk.isLoading}
          isError={desk.isError}
          onRetry={() => desk.refetch()}
          emptyLabel={t("car.desk.queue.overdueEmpty", "Nothing is late.")}
          count={data?.overdue.length ?? 0}
          tone="warn"
        >
          {(data?.overdue ?? []).map((order) => (
            <DeskOrderRow
              key={order.id}
              order={order}
              timeField="expected_return"
              showLateFee
              onOpen={() => navigate(`/scm_rental_orders/show/${order.id}`)}
              onDone={() => desk.refetch()}
            />
          ))}
        </DeskQueue>

        <DeskQueue
          icon={<WalletCards className="size-4" />}
          title={t("car.desk.queue.receivables", "Open balances")}
          description={t(
            "car.desk.queue.receivablesHint",
            "Settlements still marked pending."
          )}
          isLoading={desk.isLoading}
          isError={desk.isError}
          onRetry={() => desk.refetch()}
          emptyLabel={t("car.desk.queue.receivablesEmpty", "Everything is settled.")}
          count={data?.receivables.length ?? 0}
        >
          {(data?.receivables ?? []).map((payment) => (
            <ReceivableRow
              key={payment.id}
              payment={payment}
              onOpen={() => navigate(`/scm_payments/show/${payment.id}`)}
            />
          ))}
        </DeskQueue>
      </div>
    </div>
  );
}

function DeskQueue({
  icon,
  title,
  description,
  count,
  children,
  isLoading,
  isError,
  onRetry,
  emptyLabel,
  tone,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  count: number;
  children: ReactNode;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  emptyLabel: string;
  tone?: "warn";
}) {
  const translate = useTranslate();
  return (
    <Card className="gap-0">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            tone === "warn"
              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
              : "bg-gradient-to-br from-primary/15 to-primary/5 text-primary"
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            {title}
            <Badge variant="outline" className="tabular-nums">
              {count}
            </Badge>
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {description}
          </div>
        </div>
      </div>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              {translate("car.desk.error", { ns: "car" }, "Could not load this queue.")}
            </p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              {translate("buttons.refresh", "Retry")}
            </Button>
          </div>
        ) : count === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            {emptyLabel}
          </div>
        ) : (
          <div className="divide-y">{children}</div>
        )}
      </CardContent>
    </Card>
  );
}

function DeskOrderRow({
  order,
  timeField,
  showLateFee,
  onOpen,
  onDone,
}: {
  order: OrderRecord;
  timeField: "pickup_time" | "expected_return";
  showLateFee?: boolean;
  onOpen: () => void;
  onDone: () => void;
}) {
  const translate = useTranslate();
  const t = (key: string, fallback: string) =>
    translate(key, { ns: "car" }, fallback);
  const economics = computeOrderEconomics(order);
  const timelineIssues = getOrderTimelineIssues(order);
  const time = order[timeField];

  return (
    <div className="flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-accent/30 sm:flex-row sm:items-center">
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 space-y-1 text-left"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{order.order_no ?? `#${order.id}`}</span>
          <CarStatusBadge value={order.status} options={orderStatusOptions} />
          {timelineIssues.length ? (
            <Badge variant="outline" className="text-destructive">
              {t("car.order.timeline.invalid", "Timeline issue")}
            </Badge>
          ) : null}
          {order.customer?.is_blacklisted ? (
            <Badge variant="outline" className="gap-1 text-destructive">
              <ShieldAlert className="size-3" />
              {t("car.desk.blacklisted", "Blacklisted")}
            </Badge>
          ) : null}
          {order.customer?.credit_level === "low" ? (
            <Badge variant="outline" className="text-amber-600 dark:text-amber-400">
              {t("car.customer.credit_level.low", "Low credit")}
            </Badge>
          ) : null}
        </div>
        <div className="truncate text-sm text-muted-foreground">
          {[order.customer?.name, vehicleLabel(order.vehicle)]
            .filter(Boolean)
            .join(" · ")}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock4 className="size-3" />
            {time ? format(new Date(String(time)), "d MMM HH:mm") : "-"}
          </span>
          <span className="tabular-nums">
            {t("car.desk.plannedDays", "{{count}} d").replace(
              "{{count}}",
              String(economics.plannedDays)
            )}
          </span>
          <span className="tabular-nums">{formatMoney(economics.baseAmount)}</span>
          {showLateFee && economics.overdueDays > 0 ? (
            <span className="tabular-nums font-medium text-amber-600 dark:text-amber-400">
              +{formatMoney(economics.lateFee)}{" "}
              {t("car.desk.lateFeeSuffix", "late fee")}
            </span>
          ) : null}
        </div>
      </button>
      <div className="shrink-0">
        <OrderActionBar order={order} onDone={onDone} />
      </div>
    </div>
  );
}

function ReceivableRow({
  payment,
  onOpen,
}: {
  payment: PaymentRecord;
  onOpen: () => void;
}) {
  const translate = useTranslate();
  const order = payment.order;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/30"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="font-medium">
          {order?.order_no ?? `#${payment.id}`}
        </div>
        <div className="truncate text-sm text-muted-foreground">
          {[order?.customer?.name, vehicleLabel(order?.vehicle)]
            .filter(Boolean)
            .join(" · ")}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarClock className="size-3" />
            {payment.payment_time
              ? format(new Date(payment.payment_time), "d MMM yyyy")
              : translate("car.desk.noPaymentDate", { ns: "car" }, "Not scheduled")}
          </span>
          <span>{payment.payment_method ?? "-"}</span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="font-semibold tabular-nums">
          {formatMoney(payment.amount)}
        </div>
        {Number(payment.deposit ?? 0) > 0 ? (
          <div className="text-xs text-muted-foreground tabular-nums">
            {translate("car.payment.deposit", { ns: "car" }, "Deposit")}{" "}
            {formatMoney(payment.deposit)}
          </div>
        ) : null}
      </div>
    </button>
  );
}

function DeskKpi({
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

function compactOrder(order: OrderRecord) {
  return {
    order_no: order.order_no,
    status: order.status,
    customer: order.customer?.name ?? null,
    vehicle: vehicleLabel(order.vehicle),
    pickup_time: order.pickup_time,
    expected_return: order.expected_return,
    total_amount: order.total_amount,
  };
}
