import { useInvalidate, useTranslate, type HttpError } from "@refinedev/core";
import type { UseTableReturnType } from "@refinedev/react-table";
import { useMutation } from "@tanstack/react-query";
import type {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import {
  BookmarkPlus,
  CalendarDays,
  Columns3,
  Download,
  Kanban,
  LayoutGrid,
  Link2,
  Loader2,
  Printer,
  Rows3,
  Star,
  Table2,
  Trash2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { nocobaseClient } from "@nocobase/portal-sdk/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { formatMoney, formatNumber } from "@/components/car/value";
import { cn } from "@/lib/utils";
import { resolveCarLabel } from "@/lib/car/labels";
import { fetchAllRecords } from "@/lib/car/fetch-all";
import { useResourceSummary } from "@/lib/car/operations";
import type { CarColumnConfig, CarResourceConfig } from "@/lib/car/types";

/**
 * Everything a list page needs beyond "rows on screen": saved views, column
 * and density preferences that survive a reload, a shareable URL, CSV export
 * of the *filtered* result set and multi-record actions.
 */

export type ListDensity = "compact" | "comfortable";

export type SavedView = {
  id: string;
  name: string;
  filters: ColumnFiltersState;
  sorting: SortingState;
  columnVisibility: VisibilityState;
};

export type ListLayout = "table" | "kanban" | "cards" | "calendar";

type StoredPreferences = {
  density: ListDensity;
  layout: ListLayout | null;
  columnVisibility: VisibilityState;
  views: SavedView[];
};

const EMPTY_PREFERENCES: StoredPreferences = {
  density: "comfortable",
  layout: null,
  columnVisibility: {},
  views: [],
};

const storageKey = (resource: string) => `car.list.${resource}`;

const readPreferences = (resource: string): StoredPreferences => {
  if (typeof window === "undefined") return EMPTY_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(storageKey(resource));
    if (!raw) return EMPTY_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<StoredPreferences>;
    return {
      density: parsed.density === "compact" ? "compact" : "comfortable",
      layout: parsed.layout ?? null,
      columnVisibility: parsed.columnVisibility ?? {},
      views: Array.isArray(parsed.views) ? parsed.views : [],
    };
  } catch {
    return EMPTY_PREFERENCES;
  }
};

const writePreferences = (resource: string, value: StoredPreferences) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(resource), JSON.stringify(value));
  } catch {
    // A full or blocked storage quota must never break the list.
  }
};

export function useListPreferences(resource: string) {
  const [preferences, setPreferences] = useState<StoredPreferences>(() =>
    readPreferences(resource)
  );

  useEffect(() => {
    setPreferences(readPreferences(resource));
  }, [resource]);

  const update = useCallback(
    (patch: Partial<StoredPreferences>) => {
      setPreferences((current) => {
        const next = { ...current, ...patch };
        writePreferences(resource, next);
        return next;
      });
    },
    [resource]
  );

  return { preferences, update };
}

/** Filter and sort state travel in the URL so a list view can be pasted into chat. */
const encodeState = (state: {
  filters: ColumnFiltersState;
  sorting: SortingState;
}): string => {
  try {
    return encodeURIComponent(JSON.stringify(state));
  } catch {
    return "";
  }
};

const decodeState = (
  raw: string | null
): { filters: ColumnFiltersState; sorting: SortingState } | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as {
      filters?: ColumnFiltersState;
      sorting?: SortingState;
    };
    return {
      filters: parsed.filters ?? [],
      sorting: parsed.sorting ?? [],
    };
  } catch {
    return null;
  }
};

export function useUrlListState<TData extends Record<string, unknown>>(
  table: UseTableReturnType<TData, HttpError>
) {
  const [restored, setRestored] = useState(false);

  // Restore once on mount so a shared link opens on the same rows.
  useEffect(() => {
    if (restored) return;
    setRestored(true);
    const params = new URLSearchParams(window.location.search);
    const state = decodeState(params.get("view"));
    if (!state) return;
    if (state.filters.length) table.reactTable.setColumnFilters(state.filters);
    if (state.sorting.length) table.reactTable.setSorting(state.sorting);
  }, [restored, table]);

  const shareUrl = useCallback(() => {
    const state = table.reactTable.getState();
    const encoded = encodeState({
      filters: state.columnFilters.filter(
        (filter) => filter.id !== "__global_search__"
      ),
      sorting: state.sorting,
    });
    const url = new URL(window.location.href);
    if (encoded) url.searchParams.set("view", encoded);
    else url.searchParams.delete("view");
    return url.toString();
  }, [table]);

  return { shareUrl };
}

export function CarListToolbar<TData extends Record<string, unknown>>({
  config,
  table,
  density,
  onDensityChange,
  views,
  onViewsChange,
}: {
  config: CarResourceConfig;
  table: UseTableReturnType<TData, HttpError>;
  density: ListDensity;
  onDensityChange: (density: ListDensity) => void;
  views: SavedView[];
  onViewsChange: (views: SavedView[]) => void;
}) {
  const translate = useTranslate();
  const t = (key: string, fallback: string) =>
    translate(key, { ns: "car" }, fallback);
  const { shareUrl } = useUrlListState(table);
  const [saveOpen, setSaveOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const [activeView, setActiveView] = useState("");
  const [exporting, setExporting] = useState(false);

  const hideableColumns = table.reactTable
    .getAllLeafColumns()
    .filter(
      (column) =>
        column.id !== "actions" &&
        column.id !== "__global_search__" &&
        column.id !== "__select__"
    );

  const activeFilters = table.reactTable
    .getState()
    .columnFilters.filter((filter) => filter.id !== "__global_search__");

  const applyView = (id: string) => {
    setActiveView(id);
    const view = views.find((item) => item.id === id);
    if (!view) {
      table.reactTable.resetColumnFilters();
      table.reactTable.resetSorting();
      return;
    }
    table.reactTable.setColumnFilters(view.filters);
    table.reactTable.setSorting(view.sorting);
    if (Object.keys(view.columnVisibility).length) {
      table.reactTable.setColumnVisibility(view.columnVisibility);
    }
  };

  const saveCurrentView = () => {
    const name = viewName.trim();
    if (!name) return;
    const state = table.reactTable.getState();
    const view: SavedView = {
      id: `${Date.now()}`,
      name,
      filters: state.columnFilters.filter(
        (filter) => filter.id !== "__global_search__"
      ),
      sorting: state.sorting,
      columnVisibility: state.columnVisibility,
    };
    onViewsChange([...views, view]);
    setActiveView(view.id);
    setViewName("");
    setSaveOpen(false);
    toast.success(t("car.list.view.saved", "View saved."));
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const appends = relationAppends(config);
      const result = await fetchAllRecords<Record<string, unknown>>({
        resource: config.name,
        filters: table.refineCore.filters,
        sorters: table.refineCore.sorters,
        meta: { appends },
      });
      if (!result.complete) {
        toast.error(
          t(
            "car.list.export.incomplete",
            "Export stopped because only {{count}} of {{total}} rows could be loaded."
          )
            .replace("{{count}}", String(result.rows.length))
            .replace("{{total}}", String(result.total))
        );
        return;
      }
      const rows = result.rows;
      if (!rows.length) {
        toast.error(t("car.list.export.empty", "Nothing to export."));
        return;
      }
      downloadCsv(
        `${config.name}-${new Date().toISOString().slice(0, 10)}.csv`,
        buildCsv(config, rows, translate)
      );
      toast.success(
        t("car.list.export.done", "{{count}} rows exported.").replace(
          "{{count}}",
          String(rows.length)
        )
      );
    } catch {
      toast.error(t("car.list.export.failed", "Export failed."));
    } finally {
      setExporting(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl());
      toast.success(t("car.list.share.copied", "Link copied."));
    } catch {
      toast.error(t("car.list.share.failed", "Could not copy the link."));
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <NativeSelect
          size="sm"
          value={activeView}
          onChange={(event) => applyView(event.target.value)}
          aria-label={t("car.list.view.label", "Saved views")}
        >
          <NativeSelectOption value="">
            {t("car.list.view.all", "All records")}
          </NativeSelectOption>
          {views.map((view) => (
            <NativeSelectOption key={view.id} value={view.id}>
              {view.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setSaveOpen(true)}
          disabled={!activeFilters.length && !table.reactTable.getState().sorting.length}
          title={t(
            "car.list.view.saveHint",
            "Filter or sort the list first, then save it as a view."
          )}
        >
          <BookmarkPlus />
          {t("car.list.view.save", "Save view")}
        </Button>

        {activeView ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              onViewsChange(views.filter((view) => view.id !== activeView));
              setActiveView("");
              table.reactTable.resetColumnFilters();
            }}
          >
            <Trash2 />
            {t("car.list.view.delete", "Delete view")}
          </Button>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          {activeFilters.length ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                table.reactTable.resetColumnFilters();
                setActiveView("");
              }}
            >
              <X />
              {t("car.list.clearFilters", "Clear filters")}
              <Badge variant="outline" className="ml-1 tabular-nums">
                {activeFilters.length}
              </Badge>
            </Button>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm">
                  <Columns3 />
                  {t("car.list.columns", "Columns")}
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                {t("car.list.columnsVisible", "Visible columns")}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {hideableColumns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(checked) =>
                    column.toggleVisibility(Boolean(checked))
                  }
                >
                  {columnLabel(config, column.id, translate)}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>
                {t("car.list.density", "Density")}
              </DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={density === "comfortable"}
                onCheckedChange={() => onDensityChange("comfortable")}
              >
                {t("car.list.densityComfortable", "Comfortable")}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={density === "compact"}
                onCheckedChange={() => onDensityChange("compact")}
              >
                {t("car.list.densityCompact", "Compact")}
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" onClick={copyLink}>
            <Link2 />
            {t("car.list.share", "Copy link")}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            disabled={exporting}
          >
            {exporting ? <Loader2 className="animate-spin" /> : <Download />}
            {t("car.list.export", "Export CSV")}
          </Button>

          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer />
            {t("car.list.print", "Print")}
          </Button>

          <Button
            variant="outline"
            size="icon-sm"
            aria-label={t("car.list.density", "Density")}
            title={t("car.list.density", "Density")}
            onClick={() =>
              onDensityChange(density === "compact" ? "comfortable" : "compact")
            }
          >
            <Rows3 />
          </Button>
        </div>
      </div>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("car.list.view.saveTitle", "Save this view")}</DialogTitle>
            <DialogDescription>
              {t(
                "car.list.view.saveDescription",
                "The current filters, sorting and visible columns are stored in this browser."
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="view-name">
              {t("car.list.view.name", "View name")}
            </Label>
            <Input
              id="view-name"
              value={viewName}
              autoFocus
              onChange={(event) => setViewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") saveCurrentView();
              }}
              placeholder={t("car.list.view.namePlaceholder", "Overdue this week")}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>
              {translate("buttons.cancel", "Cancel")}
            </Button>
            <Button onClick={saveCurrentView} disabled={!viewName.trim()}>
              <Star />
              {translate("buttons.save", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CarBulkBar<TData extends Record<string, unknown>>({
  config,
  table,
  statusColumn,
}: {
  config: CarResourceConfig;
  table: UseTableReturnType<TData, HttpError>;
  statusColumn?: CarColumnConfig;
}) {
  const translate = useTranslate();
  const invalidate = useInvalidate();
  const t = (key: string, fallback: string) =>
    translate(key, { ns: "car" }, fallback);
  const [pendingStatus, setPendingStatus] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const selected = table.reactTable.getSelectedRowModel().rows;
  const ids = selected
    .map((row) => (row.original as { id?: unknown }).id)
    .filter((id) => id !== undefined)
    .map(String);

  const bulkUpdate = useMutation({
    // One call per record: the batch form of filterByTk is not uniform across
    // NocoBase actions, and a page of selections is small enough for this.
    mutationFn: async (values: Record<string, unknown>) => {
      for (const id of ids) {
        await nocobaseClient.action(config.name, "update", {
          method: "POST",
          query: { filterByTk: id },
          body: values,
        });
      }
    },
    onSuccess: () => {
      invalidate({ resource: config.name, invalidates: ["resourceAll"] });
      table.reactTable.resetRowSelection();
      toast.success(
        t("car.list.bulk.updated", "{{count}} records updated.").replace(
          "{{count}}",
          String(ids.length)
        )
      );
    },
    onError: () => toast.error(t("car.list.bulk.failed", "The bulk action failed.")),
  });

  const bulkDelete = useMutation({
    mutationFn: async () => {
      for (const id of ids) {
        await nocobaseClient.action(config.name, "destroy", {
          method: "POST",
          query: { filterByTk: id },
        });
      }
    },
    onSuccess: () => {
      invalidate({ resource: config.name, invalidates: ["resourceAll"] });
      table.reactTable.resetRowSelection();
      setConfirmDelete(false);
      toast.success(
        t("car.list.bulk.deleted", "{{count}} records deleted.").replace(
          "{{count}}",
          String(ids.length)
        )
      );
    },
    onError: () => toast.error(t("car.list.bulk.failed", "The bulk action failed.")),
  });

  if (!ids.length) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <span className="text-sm font-medium">
          {t("car.list.bulk.selected", "{{count}} selected").replace(
            "{{count}}",
            String(ids.length)
          )}
        </span>

        {statusColumn?.options?.length &&
        config.fields.find((field) => field.name === statusColumn.accessor)
          ?.mutability !== "domain" ? (
          <div className="flex items-center gap-2">
            <NativeSelect
              size="sm"
              value={pendingStatus}
              onChange={(event) => setPendingStatus(event.target.value)}
            >
              <NativeSelectOption value="">
                {t("car.list.bulk.setStatus", "Set status to…")}
              </NativeSelectOption>
              {statusColumn.options.map((option) => (
                <NativeSelectOption key={option.value} value={option.value}>
                  {resolveCarLabel(option.label, option.label, translate)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <Button
              size="sm"
              disabled={!pendingStatus || bulkUpdate.isPending}
              onClick={() =>
                bulkUpdate.mutate({ [statusColumn.accessor]: pendingStatus })
              }
            >
              {bulkUpdate.isPending ? <Loader2 className="animate-spin" /> : null}
              {translate("buttons.apply", "Apply")}
            </Button>
          </div>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.reactTable.resetRowSelection()}
          >
            {t("car.list.bulk.clear", "Clear selection")}
          </Button>
          {config.canDelete !== false ? (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 />
              {translate("buttons.delete", "Delete")}
            </Button>
          ) : null}
        </div>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("car.list.bulk.deleteTitle", "Delete selected records?")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "car.list.bulk.deleteDescription",
                "{{count}} records will be removed. This cannot be undone."
              ).replace("{{count}}", String(ids.length))}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              {translate("buttons.cancel", "Cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={bulkDelete.isPending}
              onClick={() => bulkDelete.mutate()}
            >
              {bulkDelete.isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}
              {translate("buttons.delete", "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* CSV                                                                 */
/* ------------------------------------------------------------------ */

const relationAppends = (config: CarResourceConfig): string[] => {
  const fields = new Set<string>();
  for (const column of config.columns) {
    if (column.kind === "relation" && column.relation) fields.add(column.accessor);
    for (const field of column.composite ?? []) {
      if (field.kind === "relation" && field.relation) fields.add(field.accessor);
    }
  }
  return Array.from(fields);
};

const columnLabel = (
  config: CarResourceConfig,
  columnId: string,
  translate: ReturnType<typeof useTranslate>
): string => {
  const column = config.columns.find((item) => item.accessor === columnId);
  if (!column) return columnId;
  return resolveCarLabel(column.header, column.header, translate);
};

const csvCell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const text =
    typeof value === "object"
      ? JSON.stringify(value)
      : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const readPath = (record: Record<string, unknown>, path: string): unknown => {
  let current: unknown = record;
  for (const part of path.split(".")) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
};

function buildCsv(
  config: CarResourceConfig,
  rows: Array<Record<string, unknown>>,
  translate: ReturnType<typeof useTranslate>
): string {
  const columns = config.columns.flatMap((column) =>
    column.composite?.length
      ? column.composite.map((field) => ({
          accessor: field.accessor,
          relation: field.relation,
          header: resolveCarLabel(
            field.label ?? field.accessor,
            field.accessor,
            translate
          ),
        }))
      : [
          {
            accessor: column.accessor,
            relation: column.relation,
            header: resolveCarLabel(column.header, column.header, translate),
          },
        ]
  );

  const header = ["id", ...columns.map((column) => column.header)]
    .map(csvCell)
    .join(",");

  const body = rows.map((row) =>
    [
      csvCell(row.id),
      ...columns.map((column) => {
        const value = readPath(row, column.accessor);
        if (column.relation && value && typeof value === "object") {
          return csvCell(
            (value as Record<string, unknown>)[column.relation.labelField]
          );
        }
        return csvCell(value);
      }),
    ].join(",")
  );

  // The BOM keeps Excel from mangling non-ASCII plates and names.
  return `\uFEFF${[header, ...body].join("\n")}`;
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const LAYOUT_META: Record<
  ListLayout,
  { icon: ReactNode; labelKey: string; fallback: string }
> = {
  table: {
    icon: <Table2 className="size-4" />,
    labelKey: "car.list.layout.table",
    fallback: "Table",
  },
  kanban: {
    icon: <Kanban className="size-4" />,
    labelKey: "car.list.layout.kanban",
    fallback: "Board",
  },
  cards: {
    icon: <LayoutGrid className="size-4" />,
    labelKey: "car.list.layout.cards",
    fallback: "Cards",
  },
  calendar: {
    icon: <CalendarDays className="size-4" />,
    labelKey: "car.list.layout.calendar",
    fallback: "Calendar",
  },
};

/**
 * Table is always available — it is the only layout carrying filters, bulk
 * actions and export — with the collection's own preferred layout beside it.
 */
export function CarLayoutSwitcher({
  layouts,
  layout,
  onLayoutChange,
}: {
  layouts: ListLayout[];
  layout: ListLayout;
  onLayoutChange: (layout: ListLayout) => void;
}) {
  const translate = useTranslate();
  if (layouts.length < 2) return null;
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border p-0.5">
      {layouts.map((item) => {
        const meta = LAYOUT_META[item];
        return (
          <Button
            key={item}
            variant={layout === item ? "secondary" : "ghost"}
            size="sm"
            className="h-7"
            onClick={() => onLayoutChange(item)}
            title={translate(meta.labelKey, { ns: "car" }, meta.fallback)}
          >
            {meta.icon}
            <span className="hidden sm:inline">
              {translate(meta.labelKey, { ns: "car" }, meta.fallback)}
            </span>
          </Button>
        );
      })}
    </div>
  );
}

/**
 * Totals strip above the table. Every status segment is a filter shortcut, so
 * "38 pending" is one click away from the 38 rows behind it.
 */
export function CarListSummary({
  config,
  statusColumn,
  amountColumn,
  activeStatus,
  onSelectStatus,
}: {
  config: CarResourceConfig;
  statusColumn?: CarColumnConfig;
  amountColumn?: CarColumnConfig;
  activeStatus?: string;
  onSelectStatus: (status: string | null) => void;
}) {
  const translate = useTranslate();
  const summary = useResourceSummary(
    config.name,
    statusColumn?.accessor,
    amountColumn?.accessor
  );

  if (summary.isError) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-4 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <button
        type="button"
        onClick={() => onSelectStatus(null)}
        className={cn(
          "flex items-baseline gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-accent/60",
          !activeStatus && "bg-accent/50"
        )}
      >
        <span className="text-lg font-semibold tabular-nums">
          {summary.isLoading ? "—" : formatNumber(summary.data?.total ?? 0)}
        </span>
        <span className="text-xs text-muted-foreground">
          {translate("car.list.summary.total", { ns: "car" }, "total")}
        </span>
      </button>

      <span className="h-5 w-px bg-border" aria-hidden="true" />

      {(summary.data?.byStatus ?? []).map((segment) => {
        const option = statusColumn?.options?.find(
          (item) => item.value === segment.value
        );
        return (
          <button
            key={segment.value}
            type="button"
            onClick={() =>
              onSelectStatus(
                activeStatus === segment.value ? null : segment.value
              )
            }
            className={cn(
              "flex items-baseline gap-1.5 rounded-md px-2 py-1 text-sm transition-colors hover:bg-accent/60",
              activeStatus === segment.value && "bg-accent/70"
            )}
          >
            <span className="font-semibold tabular-nums">{segment.count}</span>
            <span className="text-xs text-muted-foreground">
              {option
                ? resolveCarLabel(option.label, option.label, translate)
                : segment.value}
            </span>
          </button>
        );
      })}

      {amountColumn && summary.data?.amountTotal !== null ? (
        <div className="ml-auto flex items-baseline gap-1.5 rounded-md px-2 py-1">
          <span className="text-xs text-muted-foreground">
            {resolveCarLabel(amountColumn.header, amountColumn.header, translate)}
          </span>
          <span className="font-semibold tabular-nums">
            {formatMoney(summary.data?.amountTotal ?? 0)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function useListSummaryColumns(config: CarResourceConfig) {
  return useMemo(() => {
    const statusColumn = config.columns.find(
      (column) => column.kind === "select" && column.options?.length
    );
    const amountColumn = config.columns.find(
      (column) =>
        column.kind === "number" &&
        /amount|premium|cost|fine|rate|deposit/i.test(column.accessor)
    );
    return { statusColumn, amountColumn };
  }, [config]);
}
