import { useTranslate } from "@refinedev/core";
import { ArrowLeftRight, Landmark, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
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
import {
  AnalyticsExportButton,
  AnalyticsStates,
  exportAnalyticsCsv,
} from "./toolbar";

const AGING_BUCKETS: Array<{
  key: AgingRow["bucket"];
  labelKey: string;
  fallback: string;
}> = [
  {
    key: "0-30",
    labelKey: "car.analytics.cashflow.bucket0",
    fallback: "0-30 days",
  },
  {
    key: "31-60",
    labelKey: "car.analytics.cashflow.bucket1",
    fallback: "31-60 days",
  },
  {
    key: "61-90",
    labelKey: "car.analytics.cashflow.bucket2",
    fallback: "61-90 days",
  },
  {
    key: "90+",
    labelKey: "car.analytics.cashflow.bucket3",
    fallback: "90+ days",
  },
];

export function CashflowPage() {
  const translate = useTranslate();
  const navigate = useNavigate();
  const [agingBucketFilter, setAgingBucketFilter] =
    useState<AgingRow["bucket"] | null>(null);
  const { data, isLoading, isError, refetch } = useCashflow();

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
        count: agingRows.filter((row) => row.bucket === bucket.key).length,
        total: agingRows
          .filter((row) => row.bucket === bucket.key)
          .reduce((sum, row) => sum + row.outstanding, 0),
      })),
    [agingRows]
  );
  const filteredAgingRows = useMemo(
    () =>
      agingBucketFilter
        ? agingRows.filter((row) => row.bucket === agingBucketFilter)
        : agingRows,
    [agingBucketFilter, agingRows]
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

  const exportAging = () => {
    exportAnalyticsCsv(
      "accounts-receivable-aging.csv",
      [
        translate("car.analytics.cashflow.order", { ns: "car" }, "Order"),
        translate(
          "car.analytics.cashflow.customer",
          { ns: "car" },
          "Customer"
        ),
        translate("car.analytics.vehicle", { ns: "car" }, "Vehicle"),
        translate("car.analytics.cashflow.amount", { ns: "car" }, "Amount"),
        translate("car.analytics.cashflow.paid", { ns: "car" }, "Paid"),
        translate(
          "car.analytics.cashflow.outstanding",
          { ns: "car" },
          "Outstanding"
        ),
        translate(
          "car.analytics.cashflow.aging",
          { ns: "car" },
          "Aging (days)"
        ),
        translate("car.analytics.cashflow.bucket", { ns: "car" }, "Bucket"),
      ],
      filteredAgingRows.map((row) => [
        row.orderNo,
        row.customer,
        row.vehicle,
        row.amount,
        row.paid,
        row.outstanding,
        row.daysAging,
        translate(
          AGING_BUCKETS.find((bucket) => bucket.key === row.bucket)!.labelKey,
          { ns: "car" },
          AGING_BUCKETS.find((bucket) => bucket.key === row.bucket)!.fallback
        ),
      ])
    );
  };

  const exportDeposits = () => {
    exportAnalyticsCsv(
      "deposits-held.csv",
      [
        translate("car.analytics.cashflow.order", { ns: "car" }, "Order"),
        translate(
          "car.analytics.cashflow.customer",
          { ns: "car" },
          "Customer"
        ),
        translate("car.analytics.cashflow.deposit", { ns: "car" }, "Deposit"),
        translate("car.analytics.cashflow.refund", { ns: "car" }, "Refund"),
        translate("car.analytics.cashflow.held", { ns: "car" }, "Held"),
      ],
      depositRows.map((row) => [
        row.orderNo,
        row.customer,
        row.deposit,
        row.refund,
        row.held,
      ])
    );
  };

  const exportRefunds = () => {
    exportAnalyticsCsv(
      "refunds-due.csv",
      [
        translate("car.analytics.cashflow.order", { ns: "car" }, "Order"),
        translate(
          "car.analytics.cashflow.customer",
          { ns: "car" },
          "Customer"
        ),
        translate(
          "car.analytics.cashflow.refundAmount",
          { ns: "car" },
          "Refund due"
        ),
        translate(
          "car.analytics.cashflow.aging",
          { ns: "car" },
          "Aging (days)"
        ),
      ],
      refundRows.map((row) => [
        row.orderNo,
        row.customer,
        row.refundDue,
        row.daysAging,
      ])
    );
  };

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
          <div className="flex justify-end">
            <AnalyticsExportButton onExport={exportAging} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {agingSummary.map((bucket) => (
              <Button
                key={bucket.key}
                variant={agingBucketFilter === bucket.key ? "secondary" : "outline"}
                className="h-auto justify-start rounded-lg p-3 text-left"
                onClick={() =>
                  setAgingBucketFilter((current) =>
                    current === bucket.key ? null : bucket.key
                  )
                }
              >
                <div>
                  <div className="text-xs font-normal text-muted-foreground">
                    {translate(bucket.labelKey, { ns: "car" }, bucket.fallback)} ·{" "}
                    {translate(
                      "car.analytics.cashflow.bucketCount",
                      { ns: "car" },
                      "{{count}} records"
                    ).replace("{{count}}", String(bucket.count))}
                  </div>
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
              </Button>
            ))}
          </div>

          <AnalyticsStates
            isLoading={isLoading}
            isError={isError}
            isEmpty={filteredAgingRows.length === 0}
            onRetry={() => void refetch()}
          >
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
              {filteredAgingRows.map((row) => (
                <TableRow
                  key={row.orderId}
                  className="cursor-pointer transition-colors hover:bg-accent/30"
                  onClick={() => navigate(`/scm_rental_orders/show/${row.orderId}`)}
                >
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
            </TableBody>
            </Table>
          </AnalyticsStates>
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
            <div className="flex justify-end border-b p-3">
              <AnalyticsExportButton onExport={exportDeposits} />
            </div>
            <AnalyticsStates
              isLoading={isLoading}
              isError={isError}
              isEmpty={depositRows.length === 0}
              onRetry={() => void refetch()}
            >
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
                  <TableRow
                    key={row.orderId}
                    className="cursor-pointer transition-colors hover:bg-accent/30"
                    onClick={() => navigate(`/scm_rental_orders/show/${row.orderId}`)}
                  >
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
              </TableBody>
              </Table>
            </AnalyticsStates>
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
            <div className="flex justify-end border-b p-3">
              <AnalyticsExportButton onExport={exportRefunds} />
            </div>
            <AnalyticsStates
              isLoading={isLoading}
              isError={isError}
              isEmpty={refundRows.length === 0}
              onRetry={() => void refetch()}
            >
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
                  <TableRow
                    key={row.orderId}
                    className="cursor-pointer transition-colors hover:bg-accent/30"
                    onClick={() => navigate(`/scm_rental_orders/show/${row.orderId}`)}
                  >
                    <TableCell className="font-mono text-xs">{row.orderNo}</TableCell>
                    <TableCell>{row.customer}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                      {formatMoney(row.refundDue)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.daysAging}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </AnalyticsStates>
          </CardContent>
        </AnalyticsCard>
      </div>
    </div>
  );
}

function AgingBadge({ bucket }: { bucket: AgingRow["bucket"] }) {
  const translate = useTranslate();
  const labelMap: Record<AgingRow["bucket"], string> = {
    "0-30": translate("car.analytics.cashflow.bucket0", { ns: "car" }, "0-30 days"),
    "31-60": translate("car.analytics.cashflow.bucket1", { ns: "car" }, "31-60 days"),
    "61-90": translate("car.analytics.cashflow.bucket2", { ns: "car" }, "61-90 days"),
    "90+": translate("car.analytics.cashflow.bucket3", { ns: "car" }, "90+ days"),
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
