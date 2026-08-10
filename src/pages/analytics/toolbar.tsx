import { useTranslate } from "@refinedev/core";
import { Download } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const csvCell = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function exportAnalyticsCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>
): void {
  const content = `\uFEFF${[
    headers.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ].join("\n")}`;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function AnalyticsExportButton({
  onExport,
  label,
}: {
  onExport: () => void;
  label?: string;
}) {
  const translate = useTranslate();
  return (
    <Button variant="outline" size="sm" onClick={onExport}>
      <Download className="size-3.5" />
      {label ??
        translate(
          "car.analytics.toolbar.export",
          { ns: "car" },
          "Export CSV"
        )}
    </Button>
  );
}

export function AnalyticsTopNSelect({
  value,
  onChange,
  options,
}: {
  value: number | "all";
  onChange: (value: number | "all") => void;
  options: Array<number | "all">;
}) {
  const translate = useTranslate();
  return (
    <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-0.5">
      {options.map((option) => (
        <Button
          key={option}
          variant={value === option ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onChange(option)}
        >
          {option === "all"
            ? translate(
                "car.analytics.toolbar.all",
                { ns: "car" },
                "All"
              )
            : option}
        </Button>
      ))}
    </div>
  );
}

export function AnalyticsStates({
  isLoading,
  isError,
  isEmpty,
  onRetry,
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  onRetry: () => void;
  children: ReactNode;
}) {
  const translate = useTranslate();

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          {translate(
            "car.analytics.toolbar.error",
            { ns: "car" },
            "This report could not be loaded."
          )}
        </p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          {translate(
            "car.analytics.toolbar.retry",
            { ns: "car" },
            "Retry"
          )}
        </Button>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="px-6 py-16 text-center text-sm text-muted-foreground">
        {translate(
          "car.analytics.toolbar.empty",
          { ns: "car" },
          "No data available."
        )}
      </div>
    );
  }

  return children;
}
