import { useTranslate } from "@refinedev/core";
import { AlertTriangle, Ban, ClipboardX, Percent, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useCancellation } from "@/lib/car/analytics";
import { cancelReasonOptions } from "@/lib/car/configs";
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

const HIGH_RATE_THRESHOLD = 0.25;

type SegmentFilter = {
  dimension: "customerType" | "category";
  key: string;
  label: string;
};

export function CancellationPage() {
  const translate = useTranslate();
  const navigate = useNavigate();
  const [segmentFilter, setSegmentFilter] = useState<SegmentFilter | null>(null);
  const { data, isLoading, isError, refetch } = useCancellation();
  const analysis = data;

  const total = analysis?.total ?? 0;
  const cancelled = analysis?.cancelled ?? 0;
  const rate = analysis?.rate ?? 0;

  const byCustomerTypeData = useMemo(
    () =>
      (analysis?.byCustomerType ?? []).map((segment) => ({
        key: segment.key,
        name: segment.label,
        rate: Math.round(segment.rate * 100),
        cancelled: segment.cancelled,
      })),
    [analysis]
  );

  const byCategoryData = useMemo(
    () =>
      (analysis?.byCategory ?? []).map((segment) => ({
        key: segment.key,
        name: segment.label,
        rate: Math.round(segment.rate * 100),
        cancelled: segment.cancelled,
      })),
    [analysis]
  );

  const filteredOrders = useMemo(() => {
    const orders = analysis?.cancelledOrders ?? [];
    if (!segmentFilter) return orders;
    if (segmentFilter.dimension === "customerType") {
      return orders.filter(
        (order) => (order.customerType ?? "unknown") === segmentFilter.key
      );
    }
    return orders.filter(
      (order) => (order.category ?? "Uncategorized") === segmentFilter.key
    );
  }, [analysis, segmentFilter]);

  const highRateSegments = useMemo(
    () =>
      (analysis?.byCustomerType ?? [])
        .concat(analysis?.byCategory ?? [])
        .filter((segment) => segment.total > 0 && segment.rate >= HIGH_RATE_THRESHOLD),
    [analysis]
  );

  const aiContext = useAnalyticsAIContext({
    contextId: "analytics-cancellation",
    titleKey: "car.analytics.cancellation.title",
    getContext: () => ({
      resource: "analytics",
      report: "cancellation",
      total,
      cancelled,
      rate,
      highRateSegments: highRateSegments.map((segment) => ({
        label: segment.label,
        cancelled: segment.cancelled,
        rate: segment.rate,
      })),
      byCustomerType: byCustomerTypeData,
      byCategory: byCategoryData,
      cancelledOrders: (analysis?.cancelledOrders ?? []).slice(0, 50),
    }),
  });

  const toggleSegmentFilter = (nextFilter: SegmentFilter) => {
    setSegmentFilter((current) =>
      current?.dimension === nextFilter.dimension &&
      current.key === nextFilter.key
        ? null
        : nextFilter
    );
  };

  const exportRows = () => {
    exportAnalyticsCsv(
      "cancelled-orders.csv",
      [
        translate(
          "car.analytics.cancellation.orderNo",
          { ns: "car" },
          "Order"
        ),
        translate(
          "car.analytics.cancellation.customer",
          { ns: "car" },
          "Customer"
        ),
        translate(
          "car.analytics.cancellation.customerType",
          { ns: "car" },
          "Customer type"
        ),
        translate("car.analytics.vehicle", { ns: "car" }, "Vehicle"),
        translate("car.analytics.category", { ns: "car" }, "Category"),
        translate(
          "car.analytics.cancellation.amount",
          { ns: "car" },
          "Amount"
        ),
        translate(
          "car.analytics.cancellation.reason",
          { ns: "car" },
          "Reason"
        ),
      ],
      filteredOrders.map((order) => [
        order.orderNo,
        order.customer,
        customerTypeLabel(order.customerType, translate),
        order.vehicle,
        order.category,
        order.amount,
        order.cancelReason,
      ])
    );
  };

  return (
    <div ref={aiContext.ref} className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <AnalyticsPageHeader
          titleKey="car.analytics.cancellation.title"
          descriptionKey="car.analytics.cancellation.description"
        />
        <AnalyticsAIShortcut
          context={aiContext.context}
          contextId="analytics-cancellation"
          titleKey="car.analytics.cancellation.title"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AnalyticsKpiCard
          icon={<ClipboardX className="size-4" />}
          label={translate("car.analytics.cancellation.total", { ns: "car" }, "Total orders")}
          value={String(total)}
        />
        <AnalyticsKpiCard
          icon={<Ban className="size-4" />}
          label={translate("car.analytics.cancellation.cancelled", { ns: "car" }, "Cancelled")}
          value={String(cancelled)}
          tone={cancelled > 0 ? "negative" : "positive"}
        />
        <AnalyticsKpiCard
          icon={<Percent className="size-4" />}
          label={translate("car.analytics.cancellation.rate", { ns: "car" }, "Cancellation rate")}
          value={`${(rate * 100).toFixed(1)}%`}
          tone={rate >= HIGH_RATE_THRESHOLD ? "negative" : "default"}
        />
        <AnalyticsKpiCard
          icon={<AlertTriangle className="size-4" />}
          label={translate("car.analytics.cancellation.riskSegments", { ns: "car" }, "High-risk segments")}
          value={String(highRateSegments.length)}
          hint={translate("car.analytics.cancellation.riskHint", { ns: "car" }, "Rate ≥ 25%")}
          tone={highRateSegments.length > 0 ? "warn" : "positive"}
        />
      </div>

      {highRateSegments.length > 0 ? (
        <Card className="gap-0 border-amber-600/30">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="text-sm">
              <div className="font-medium text-foreground">
                {translate(
                  "car.analytics.cancellation.warning",
                  { ns: "car" },
                  "High cancellation rate segments detected"
                )}
              </div>
              <div className="mt-1 flex flex-wrap gap-2">
                {highRateSegments.map((segment) => (
                  <Badge
                    key={segment.label}
                    variant="outline"
                    className="h-6 gap-1.5 rounded-md border-amber-600/30 bg-card px-2 text-[11px] font-medium text-amber-700 dark:text-amber-400"
                  >
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-amber-500" />
                    {segment.label} · {(segment.rate * 100).toFixed(0)}%
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsCard
          title={translate(
            "car.analytics.cancellation.byCustomerType",
            { ns: "car" },
            "Cancellation rate by customer type"
          )}
        >
          <CardContent className="p-0">
            <AnalyticsStates
              isLoading={isLoading}
              isError={isError}
              isEmpty={byCustomerTypeData.length === 0}
              onRetry={() => void refetch()}
            >
              <div className="h-64 py-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byCustomerTypeData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} fontSize={12} width={34} unit="%" domain={[0, 100]} />
                    <Tooltip formatter={(value) => [`${value}%`, translate("car.analytics.cancellation.rate", { ns: "car" }, "Rate")]} />
                    <Bar dataKey="rate" fill="var(--chart-4)" radius={[4, 4, 0, 0]}>
                      {byCustomerTypeData.map((segment) => (
                        <Cell
                          key={segment.key}
                          className="cursor-pointer"
                          onClick={() =>
                            toggleSegmentFilter({
                              dimension: "customerType",
                              key: segment.key,
                              label: segment.name,
                            })
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </AnalyticsStates>
          </CardContent>
        </AnalyticsCard>

        <AnalyticsCard
          title={translate(
            "car.analytics.cancellation.byCategory",
            { ns: "car" },
            "Cancellation rate by vehicle category"
          )}
        >
          <CardContent className="p-0">
            <AnalyticsStates
              isLoading={isLoading}
              isError={isError}
              isEmpty={byCategoryData.length === 0}
              onRetry={() => void refetch()}
            >
              <div className="h-64 py-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byCategoryData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} fontSize={12} width={34} unit="%" domain={[0, 100]} />
                    <Tooltip formatter={(value) => [`${value}%`, translate("car.analytics.cancellation.rate", { ns: "car" }, "Rate")]} />
                    <Bar dataKey="rate" fill="var(--chart-2)" radius={[4, 4, 0, 0]}>
                      {byCategoryData.map((segment) => (
                        <Cell
                          key={segment.key}
                          className="cursor-pointer"
                          onClick={() =>
                            toggleSegmentFilter({
                              dimension: "category",
                              key: segment.key,
                              label: segment.name,
                            })
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </AnalyticsStates>
          </CardContent>
        </AnalyticsCard>
      </div>

      <AnalyticsCard
        title={translate(
          "car.analytics.cancellation.cancelledOrders",
          { ns: "car" },
          "Cancelled orders with reasons"
        )}
        description={translate(
          "car.analytics.cancellation.cancelledOrdersDescription",
          { ns: "car" },
          "Review cancellation reasons to reduce avoidable cancellations."
        )}
      >
        <CardContent className="p-0">
          <div className="flex min-h-14 items-center justify-between gap-3 border-b px-4 py-3">
            <div>
              {segmentFilter ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSegmentFilter(null)}
                >
                  {segmentFilter.label}
                  <X className="size-3.5" />
                </Button>
              ) : null}
            </div>
            <AnalyticsExportButton onExport={exportRows} />
          </div>
          <AnalyticsStates
            isLoading={isLoading}
            isError={isError}
            isEmpty={filteredOrders.length === 0}
            onRetry={() => void refetch()}
          >
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{translate("car.analytics.cancellation.orderNo", { ns: "car" }, "Order")}</TableHead>
                <TableHead>{translate("car.analytics.cancellation.customer", { ns: "car" }, "Customer")}</TableHead>
                <TableHead>{translate("car.analytics.vehicle", { ns: "car" }, "Vehicle")}</TableHead>
                <TableHead className="text-right">{translate("car.analytics.cancellation.amount", { ns: "car" }, "Amount")}</TableHead>
                <TableHead>{translate("car.analytics.cancellation.reason", { ns: "car" }, "Reason")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer transition-colors hover:bg-accent/30"
                  onClick={() => navigate(`/scm_rental_orders/show/${order.id}`)}
                >
                  <TableCell className="font-mono text-xs">{order.orderNo}</TableCell>
                  <TableCell>
                    <div className="font-medium">{order.customer}</div>
                    <div className="text-xs text-muted-foreground">
                      {customerTypeLabel(order.customerType, translate)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{order.vehicle}</div>
                    <div className="text-xs text-muted-foreground">
                      {order.category ?? "—"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(order.amount)}
                  </TableCell>
                  <TableCell>
                    <CancelReasonBadge reason={order.cancelReason} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </AnalyticsStates>
        </CardContent>
      </AnalyticsCard>
    </div>
  );
}

function customerTypeLabel(
  type: string | null,
  translate: ReturnType<typeof useTranslate>
): string {
  if (type === "personal") {
    return translate("car.customer.type.personal", { ns: "car" }, "Individual");
  }
  if (type === "corporate") {
    return translate("car.customer.type.corporate", { ns: "car" }, "Corporate");
  }
  return "—";
}

function CancelReasonBadge({ reason }: { reason: string | null }) {
  const translate = useTranslate();
  if (!reason) return <span className="text-muted-foreground">—</span>;
  const option = cancelReasonOptions.find((item) => item.value === reason);
  const label = option
    ? translate(option.label, { ns: "car" }, option.label)
    : reason;
  return (
    <Badge
      variant="outline"
      className="h-6 gap-1.5 rounded-md border-border/80 bg-card px-2 text-[11px] font-medium text-muted-foreground"
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-muted-foreground" />
      {label}
    </Badge>
  );
}
