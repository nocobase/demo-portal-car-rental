import { useTranslate } from "@refinedev/core";
import { ArrowLeftRight, HandCoins, Landmark, WalletCards } from "lucide-react";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/components/car/value";
import { useCashflow, type AgingRow } from "@/lib/car/analytics";
import {
  AnalyticsAIShortcut,
  AnalyticsCard,
  AnalyticsKpiCard,
  AnalyticsPageHeader,
  useAnalyticsAIContext,
} from "./shared";

const AGING_BUCKETS: Array<{ key: AgingRow["bucket"]; label: string }> = [
  { key: "0-30", label: "0-30 days" },
  { key: "31-60", label: "31-60 days" },
  { key: "61-90", label: "61-90 days" },
  { key: "90+", label: "90+ days" },
];

export function CashflowPage() {
  const translate = useTranslate();
  const { data } = useCashflow();

  const receivableTotal = data?.receivableTotal ?? 0;
  const depositHeldTotal = data?.depositHeldTotal ?? 0;
  const refundDueTotal = data?.refundDueTotal ?? 0;

  const agingRows = useMemo(() => data?.aging ?? [], [data]);
  const depositRows = useMemo(() => data?.depositHeld ?? [], [data]);
  const refundRows = useMemo(() => data?.refundTodo ?? [], [data]);

  const agingSummary = useMemo(
    () =>
      AGING_BUCKETS.map((bucket) => ({
        ...bucket,
        total: agingRows
          .filter((row) => row.bucket === bucket.key)
          .reduce((sum, row) => sum + row.outstanding, 0),
      })),
    [agingRows]
  );

  const aiContext = useAnalyticsAIContext({
    contextId: "analytics-cashflow",
    titleKey: "car.analytics.cashflow.title",
    getContext: () => ({
      resource: "analytics",
      report: "cashflow",
      receivableTotal,
      depositHeldTotal,
      refundDueTotal,
      agingSummary,
      aging: agingRows.slice(0, 50),
      depositHeld: depositRows.slice(0, 50),
      refundTodo: refundRows.slice(0, 50),
    }),
  });

  return (
    <div ref={aiContext.ref} className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <AnalyticsPageHeader
          titleKey="car.analytics.cashflow.title"
          descriptionKey="car.analytics.cashflow.description"
        />
        <AnalyticsAIShortcut
          context={aiContext.context}
          contextId="analytics-cashflow"
          titleKey="car.analytics.cashflow.title"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnalyticsKpiCard
          icon={<Landmark className="size-4" />}
          label={translate("car.analytics.cashflow.receivable", { ns: "car" }, "Receivable")}
          value={formatMoney(receivableTotal)}
          hint={translate("car.analytics.cashflow.receivableHint", { ns: "car" }, "Completed but unpaid")}
          tone={receivableTotal > 0 ? "negative" : "positive"}
        />
        <AnalyticsKpiCard
          icon={<WalletCards className="size-4" />}
          label={translate("car.analytics.cashflow.depositHeld", { ns: "car" }, "Deposit retained")}
          value={formatMoney(depositHeldTotal)}
          hint={translate("car.analytics.cashflow.depositHint", { ns: "car" }, "Deposit minus refund")}
          tone={depositHeldTotal > 0 ? "warn" : "positive"}
        />
        <AnalyticsKpiCard
          icon={<ArrowLeftRight className="size-4" />}
          label={translate("car.analytics.cashflow.refundDue", { ns: "car" }, "Refund to-do")}
          value={formatMoney(refundDueTotal)}
          hint={translate("car.analytics.cashflow.refundHint", { ns: "car" }, "Deposits to return on completed orders")}
          tone={refundDueTotal > 0 ? "warn" : "positive"}
        />
      </div>

      <AnalyticsCard
        title={translate(
          "car.analytics.cashflow.agingTitle",
          { ns: "car" },
          "Accounts receivable aging"
        )}
        description={translate(
          "car.analytics.cashflow.agingDescription",
          { ns: "car" },
          "Completed orders with outstanding balance, aged by days since return"
        )}
      >
        <CardContent className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {agingSummary.map((bucket) => (
              <div key={bucket.key} className="rounded-lg border bg-background p-3">
                <div className="text-xs text-muted-foreground">{bucket.label}</div>
                <div
                  className={`mt-1 font-semibold tabular-nums ${
                    bucket.key === "90+"
                      ? "text-red-600 dark:text-red-400"
                      : bucket.key === "61-90"
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-foreground"
                  }`}
                >
                  {formatMoney(bucket.total)}
                </div>
              </div>
            ))}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{translate("car.analytics.cashflow.order", { ns: "car" }, "Order")}</TableHead>
                <TableHead>{translate("car.analytics.cashflow.customer", { ns: "car" }, "Customer")}</TableHead>
                <TableHead>{translate("car.analytics.vehicle", { ns: "car" }, "Vehicle")}</TableHead>
                <TableHead className="text-right">{translate("car.analytics.cashflow.amount", { ns: "car" }, "Amount")}</TableHead>
                <TableHead className="text-right">{translate("car.analytics.cashflow.paid", { ns: "car" }, "Paid")}</TableHead>
                <TableHead className="text-right">{translate("car.analytics.cashflow.outstanding", { ns: "car" }, "Outstanding")}</TableHead>
                <TableHead className="text-right">{translate("car.analytics.cashflow.aging", { ns: "car" }, "Aging (days)")}</TableHead>
                <TableHead>{translate("car.analytics.cashflow.bucket", { ns: "car" }, "Bucket")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agingRows.map((row) => (
                <TableRow key={row.orderId}>
                  <TableCell className="font-mono text-xs">{row.orderNo}</TableCell>
                  <TableCell>{row.customer}</TableCell>
                  <TableCell className="text-sm">{row.vehicle}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(row.amount)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatMoney(row.paid)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-red-600 dark:text-red-400">
                    {formatMoney(row.outstanding)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.daysAging}</TableCell>
                  <TableCell>
                    <AgingBadge bucket={row.bucket} />
                  </TableCell>
                </TableRow>
              ))}
              {agingRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    {translate("car.analytics.cashflow.noReceivable", { ns: "car" }, "No outstanding receivables.")}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </AnalyticsCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsCard
          title={translate(
            "car.analytics.cashflow.depositTitle",
            { ns: "car" },
            "Deposit retention"
          )}
          description={translate(
            "car.analytics.cashflow.depositDescription",
            { ns: "car" },
            "Deposits collected but not yet fully returned"
          )}
        >
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{translate("car.analytics.cashflow.order", { ns: "car" }, "Order")}</TableHead>
                  <TableHead>{translate("car.analytics.cashflow.customer", { ns: "car" }, "Customer")}</TableHead>
                  <TableHead className="text-right">{translate("car.analytics.cashflow.deposit", { ns: "car" }, "Deposit")}</TableHead>
                  <TableHead className="text-right">{translate("car.analytics.cashflow.refund", { ns: "car" }, "Refund")}</TableHead>
                  <TableHead className="text-right">{translate("car.analytics.cashflow.held", { ns: "car" }, "Held")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {depositRows.map((row) => (
                  <TableRow key={row.orderId}>
                    <TableCell className="font-mono text-xs">{row.orderNo}</TableCell>
                    <TableCell>{row.customer}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(row.deposit)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatMoney(row.refund)}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                      {formatMoney(row.held)}
                    </TableCell>
                  </TableRow>
                ))}
                {depositRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      {translate("car.analytics.cashflow.noDeposit", { ns: "car" }, "No retained deposits.")}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </AnalyticsCard>

        <AnalyticsCard
          title={translate(
            "car.analytics.cashflow.refundTitle",
            { ns: "car" },
            "Refund to-do"
          )}
          description={translate(
            "car.analytics.cashflow.refundDescription",
            { ns: "car" },
            "Deposits that should be returned on completed orders"
          )}
        >
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{translate("car.analytics.cashflow.order", { ns: "car" }, "Order")}</TableHead>
                  <TableHead>{translate("car.analytics.cashflow.customer", { ns: "car" }, "Customer")}</TableHead>
                  <TableHead className="text-right">{translate("car.analytics.cashflow.refundAmount", { ns: "car" }, "Refund due")}</TableHead>
                  <TableHead className="text-right">{translate("car.analytics.cashflow.aging", { ns: "car" }, "Aging (days)")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {refundRows.map((row) => (
                  <TableRow key={row.orderId}>
                    <TableCell className="font-mono text-xs">{row.orderNo}</TableCell>
                    <TableCell>{row.customer}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                      {formatMoney(row.refundDue)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.daysAging}</TableCell>
                  </TableRow>
                ))}
                {refundRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      {translate("car.analytics.cashflow.noRefund", { ns: "car" }, "No refunds to process.")}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </AnalyticsCard>
      </div>
    </div>
  );
}

function AgingBadge({ bucket }: { bucket: AgingRow["bucket"] }) {
  const translate = useTranslate();
  const labelMap: Record<AgingRow["bucket"], string> = {
    "0-30": translate("car.analytics.cashflow.bucket0", { ns: "car" }, "0-30 天"),
    "31-60": translate("car.analytics.cashflow.bucket1", { ns: "car" }, "31-60 天"),
    "61-90": translate("car.analytics.cashflow.bucket2", { ns: "car" }, "61-90 天"),
    "90+": translate("car.analytics.cashflow.bucket3", { ns: "car" }, "90+ 天"),
  };
  const tone =
    bucket === "90+"
      ? "border-red-600/30 text-red-700 dark:text-red-400"
      : bucket === "61-90"
        ? "border-amber-600/30 text-amber-700 dark:text-amber-400"
        : "border-border/80 text-muted-foreground";
  return (
    <Badge variant="outline" className={`h-6 gap-1.5 rounded-md bg-card px-2 text-[11px] font-medium ${tone}`}>
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${
          bucket === "90+"
            ? "bg-red-500"
            : bucket === "61-90"
              ? "bg-amber-500"
              : "bg-muted-foreground"
        }`}
      />
      {labelMap[bucket]}
    </Badge>
  );
}
