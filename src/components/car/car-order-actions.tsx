import { useInvalidate, useTranslate } from "@refinedev/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, KeyRound, Loader2, Undo2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { nocobaseClient } from "@nocobase/portal-sdk/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { formatMoney } from "@/components/car/value";
import { cancelReasonOptions } from "@/lib/car/configs";
import {
  canTransitionOrder,
  computeOrderEconomics,
  getOrderTimelineIssues,
  vehicleLabel,
  type OrderRecord,
} from "@/lib/car/operations";

/**
 * The rental lifecycle is advanced with explicit counter actions — hand over,
 * check in, cancel — rather than by editing the status field. Each action also
 * carries the side effects a real system performs: the vehicle changes state,
 * the return time is stamped, the odometer is updated.
 */

type OrderPatch = Record<string, unknown>;

const previousValues = (
  record: Record<string, unknown> | null | undefined,
  patch: OrderPatch
): OrderPatch =>
  Object.fromEntries(
    Object.keys(patch).map((key) => [key, record?.[key] ?? null])
  );

function useOrderTransition(order: OrderRecord, onDone?: () => void) {
  const invalidate = useInvalidate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderPatch,
      vehiclePatch,
    }: {
      orderPatch: OrderPatch;
      vehiclePatch?: OrderPatch;
    }) => {
      const vehicleId = order.vehicleId ?? order.vehicle?.id;
      if (vehiclePatch && !vehicleId) {
        throw new Error(
          "The linked vehicle could not be resolved, so the order was not changed."
        );
      }
      const orderRollback = previousValues(
        order as unknown as Record<string, unknown>,
        orderPatch
      );
      await nocobaseClient.action("scm_rental_orders", "update", {
        method: "POST",
        query: { filterByTk: String(order.id) },
        body: orderPatch,
      });
      if (vehiclePatch && vehicleId) {
        try {
          await nocobaseClient.action("scm_vehicles", "update", {
            method: "POST",
            query: { filterByTk: String(vehicleId) },
            body: vehiclePatch,
          });
        } catch {
          try {
            await nocobaseClient.action("scm_rental_orders", "update", {
              method: "POST",
              query: { filterByTk: String(order.id) },
              body: orderRollback,
            });
          } catch {
            throw new Error(
              "Vehicle update failed and the order rollback also failed. The records may need manual reconciliation."
            );
          }
          throw new Error(
            "Vehicle update failed. The order change was rolled back; no transition was completed."
          );
        }
      }
    },
    onSuccess: () => {
      invalidate({ resource: "scm_rental_orders", invalidates: ["resourceAll"] });
      invalidate({ resource: "scm_vehicles", invalidates: ["resourceAll"] });
      queryClient.invalidateQueries({ queryKey: ["car"] });
      onDone?.();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "The order transition failed. No success was recorded."
      );
    },
  });
}

export function OrderActionBar({
  order,
  size = "sm",
  onDone,
}: {
  order: OrderRecord;
  size?: "sm" | "default";
  onDone?: () => void;
}) {
  const translate = useTranslate();
  const t = (key: string, fallback: string) =>
    translate(key, { ns: "car" }, fallback);
  const [dialog, setDialog] = useState<null | "checkout" | "checkin" | "cancel">(
    null
  );
  const timelineIssues = getOrderTimelineIssues(order);

  const canCheckOut =
    canTransitionOrder(order.status, "ongoing") &&
    !timelineIssues.includes("reservedPastDue") &&
    !timelineIssues.includes("expectedNotAfterPickup");
  const canCheckIn =
    canTransitionOrder(order.status, "completed") &&
    !timelineIssues.includes("ongoingBeforePickup") &&
    !timelineIssues.includes("expectedNotAfterPickup");
  const canCancel = canTransitionOrder(order.status, "cancelled");

  if (!canCheckOut && !canCheckIn && !canCancel) {
    return (
      <span className="text-xs text-muted-foreground">
        {timelineIssues.length
          ? t(
              "car.order.actions.timelineBlocked",
              "Transition blocked — correct the order timeline first"
            )
          : t("car.order.actions.closed", "Closed — no further transitions")}
      </span>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {canCheckOut ? (
          <Button size={size} onClick={() => setDialog("checkout")}>
            <KeyRound />
            {t("car.order.actions.checkOut", "Hand over")}
          </Button>
        ) : null}
        {canCheckIn ? (
          <Button size={size} onClick={() => setDialog("checkin")}>
            <Undo2 />
            {t("car.order.actions.checkIn", "Check in")}
          </Button>
        ) : null}
        {canCancel ? (
          <Button
            size={size}
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setDialog("cancel")}
          >
            <XCircle />
            {t("car.order.actions.cancel", "Cancel booking")}
          </Button>
        ) : null}
      </div>

      <CheckOutDialog
        order={order}
        open={dialog === "checkout"}
        onOpenChange={(open) => setDialog(open ? "checkout" : null)}
        onDone={onDone}
      />
      <CheckInDialog
        order={order}
        open={dialog === "checkin"}
        onOpenChange={(open) => setDialog(open ? "checkin" : null)}
        onDone={onDone}
      />
      <CancelDialog
        order={order}
        open={dialog === "cancel"}
        onOpenChange={(open) => setDialog(open ? "cancel" : null)}
        onDone={onDone}
      />
    </>
  );
}

function CheckOutDialog({
  order,
  open,
  onOpenChange,
  onDone,
}: {
  order: OrderRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}) {
  const translate = useTranslate();
  const t = (key: string, fallback: string) =>
    translate(key, { ns: "car" }, fallback);
  const [mileage, setMileage] = useState("");
  const transition = useOrderTransition(order, () => {
    toast.success(t("car.order.toast.checkedOut", "Vehicle handed over."));
    onOpenChange(false);
    onDone?.();
  });

  useEffect(() => {
    if (open) setMileage(String(order.vehicle?.mileage ?? ""));
  }, [open, order.vehicle?.mileage]);

  const submit = () => {
    const parsed = Number(mileage);
    transition.mutate({
      orderPatch: {
        status: "ongoing",
      },
      vehiclePatch: {
        status: "rented",
        ...(Number.isFinite(parsed) && parsed > 0 ? { mileage: parsed } : {}),
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t("car.order.checkOut.title", "Hand over vehicle")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "car.order.checkOut.description",
              "Confirm the vehicle and current odometer before handing over the keys."
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <OrderSummaryLine order={order} />
          <div className="space-y-1.5">
            <Label htmlFor="checkout-mileage">
              {t("car.order.check.mileageOut", "Odometer at handover (km)")}
            </Label>
            <Input
              id="checkout-mileage"
              inputMode="numeric"
              value={mileage}
              onChange={(event) => setMileage(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {translate("buttons.cancel", "Cancel")}
          </Button>
          <Button
            onClick={submit}
            disabled={transition.isPending}
          >
            {transition.isPending ? <Loader2 className="animate-spin" /> : <KeyRound />}
            {t("car.order.actions.checkOut", "Hand over")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CheckInDialog({
  order,
  open,
  onOpenChange,
  onDone,
}: {
  order: OrderRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}) {
  const translate = useTranslate();
  const t = (key: string, fallback: string) =>
    translate(key, { ns: "car" }, fallback);
  const [mileage, setMileage] = useState("");
  const economics = computeOrderEconomics(order);
  const transition = useOrderTransition(order, () => {
    toast.success(t("car.order.toast.checkedIn", "Return recorded."));
    onOpenChange(false);
    onDone?.();
  });

  useEffect(() => {
    if (open) {
      setMileage(String(order.vehicle?.mileage ?? ""));
    }
  }, [open, order.vehicle?.mileage]);

  const submit = () => {
    const parsed = Number(mileage);
    transition.mutate({
      orderPatch: {
        status: "completed",
        actual_return: new Date().toISOString(),
      },
      vehiclePatch: {
        status: "available",
        ...(Number.isFinite(parsed) && parsed > 0 ? { mileage: parsed } : {}),
      },
    });
  };

  const startMileage = Number(order.vehicle?.mileage ?? 0);
  const parsedMileage = Number(mileage);
  const driven =
    Number.isFinite(parsedMileage) && parsedMileage > startMileage
      ? parsedMileage - startMileage
      : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("car.order.checkIn.title", "Check in vehicle")}</DialogTitle>
          <DialogDescription>
            {t(
              "car.order.checkIn.description",
              "Confirm the return time and current odometer."
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <OrderSummaryLine order={order} />

          <dl className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 text-sm sm:grid-cols-4">
            <SettlementCell
              label={t("car.order.settlement.base", "Rental")}
              value={formatMoney(economics.baseAmount)}
            />
            <SettlementCell
              label={t("car.order.settlement.overdueDays", "Overdue days")}
              value={String(economics.overdueDays)}
              tone={economics.overdueDays > 0 ? "warn" : undefined}
            />
            <SettlementCell
              label={t("car.order.settlement.lateFee", "Late fee (est.)")}
              value={formatMoney(economics.lateFee)}
              tone={economics.lateFee > 0 ? "warn" : undefined}
            />
            <SettlementCell
              label={t("car.order.settlement.total", "Total (est.)")}
              value={formatMoney(economics.estimatedTotal)}
            />
          </dl>

          <div className="space-y-1.5">
            <Label htmlFor="checkin-mileage">
              {t("car.order.check.mileageIn", "Odometer at return (km)")}
            </Label>
            <Input
              id="checkin-mileage"
              inputMode="numeric"
              value={mileage}
              onChange={(event) => setMileage(event.target.value)}
            />
            {driven > 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("car.order.check.driven", "Distance this rental")}:{" "}
                <span className="tabular-nums">{driven} km</span>
              </p>
            ) : null}
          </div>

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {translate("buttons.cancel", "Cancel")}
          </Button>
          <Button
            onClick={submit}
            disabled={transition.isPending}
          >
            {transition.isPending ? <Loader2 className="animate-spin" /> : <CircleCheck />}
            {t("car.order.actions.confirmReturn", "Confirm return")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelDialog({
  order,
  open,
  onOpenChange,
  onDone,
}: {
  order: OrderRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}) {
  const translate = useTranslate();
  const t = (key: string, fallback: string) =>
    translate(key, { ns: "car" }, fallback);
  const [reason, setReason] = useState("");
  const transition = useOrderTransition(order, () => {
    toast.success(t("car.order.toast.cancelled", "Booking cancelled."));
    onOpenChange(false);
    onDone?.();
  });

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("car.order.cancelDialog.title", "Cancel booking")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "car.order.cancelDialog.description",
              "A reason is required — cancellations are reported by segment."
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <OrderSummaryLine order={order} />
          <div className="space-y-1.5">
            <Label htmlFor="cancel-reason">
              {t("car.order.cancel_reason.label", "Cancellation reason")}
            </Label>
            <NativeSelect
              id="cancel-reason"
              className="w-full"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            >
              <NativeSelectOption value="">
                {t("car.order.cancelDialog.choose", "Choose a reason")}
              </NativeSelectOption>
              {cancelReasonOptions.map((option) => (
                <NativeSelectOption key={option.value} value={option.value}>
                  {translate(option.label, { ns: "car" }, option.value)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {translate("buttons.cancel", "Back")}
          </Button>
          <Button
            variant="destructive"
            disabled={!reason || transition.isPending}
            onClick={() =>
              transition.mutate({
                orderPatch: { status: "cancelled", cancel_reason: reason },
                ...(order.status === "ongoing"
                  ? {}
                  : { vehiclePatch: { status: "available" } }),
              })
            }
          >
            {transition.isPending ? <Loader2 className="animate-spin" /> : <XCircle />}
            {t("car.order.actions.confirmCancel", "Cancel booking")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OrderSummaryLine({ order }: { order: OrderRecord }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
      <div className="font-medium">{order.order_no ?? `#${order.id}`}</div>
      <div className="text-xs text-muted-foreground">
        {[order.customer?.name, vehicleLabel(order.vehicle)]
          .filter(Boolean)
          .join(" · ")}
      </div>
    </div>
  );
}

function SettlementCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warn";
}) {
  return (
    <div>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd
        className={
          tone === "warn"
            ? "font-semibold tabular-nums text-amber-600 dark:text-amber-400"
            : "font-semibold tabular-nums"
        }
      >
        {value}
      </dd>
    </div>
  );
}
