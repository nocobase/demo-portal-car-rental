import { useTranslate } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";

import { DataTable } from "@/components/data-table/data-table";
import {
  DataTableFilterCombobox,
  DataTableFilterDropdownText,
} from "@/components/data-table/data-table-filter";
import { DataTableSorter } from "@/components/data-table/data-table-sorter";
import { DeleteButton } from "@/components/resources/buttons/delete";
import { EditButton } from "@/components/resources/buttons/edit";
import { ShowButton } from "@/components/resources/buttons/show";
import { ListView } from "@/components/resources/views/list-view";
import {
  CarRelationValue,
  CarStatusBadge,
  formatDate,
  formatNumber,
} from "@/components/car/value";
import { CarSearchBar } from "@/components/car/car-search";
import { CarAIAssistantPanel } from "@/components/car/car-ai-assistant";
import { CarKanbanView } from "@/components/car/car-kanban";
import { CarCardsView } from "@/components/car/car-cards";
import { CarCalendarView } from "@/components/car/car-calendar";
import { CarAttachmentValue } from "@/components/car/car-attachment";
import {
  InlineNumberEdit,
  InlineSelectEdit,
} from "@/components/car/car-inline-edit";
import { useAIPageElementHandle } from "@/lib/car/ai";
import { resolveCarLabel } from "@/lib/car/labels";
import { useRelationOptions } from "@/lib/car/relations";
import type {
  CarColumnConfig,
  CarColumnFieldRef,
  CarResourceConfig,
} from "@/lib/car/types";

const getNestedValue = (
  record: Record<string, unknown>,
  path: string
): unknown => {
  const parts = path.split(".");
  let current: unknown = record;
  for (const part of parts) {
    if (
      current === null ||
      typeof current !== "object" ||
      !(part in (current as Record<string, unknown>))
    ) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
};

function CarValueText({
  field,
  value,
}: {
  field: CarColumnFieldRef;
  value: unknown;
}) {
  if (field.kind === "select") {
    return (
      <CarStatusBadge value={String(value ?? "")} options={field.options} />
    );
  }
  if (field.kind === "number") {
    return (
      <span className="tabular-nums">
        {typeof value === "number" ? formatNumber(value) : "-"}
      </span>
    );
  }
  if (field.kind === "date") {
    return formatDate(String(value ?? ""));
  }
  if (field.kind === "datetime") {
    return formatDate(String(value ?? ""), true);
  }
  if (field.kind === "relation" && field.relation) {
    return (
      <CarRelationValue
        value={value as Record<string, unknown> | undefined}
        labelField={field.relation.labelField}
        subFields={field.relation.subFields}
      />
    );
  }
  if (value === null || value === undefined || value === "") return "-";
  const text = String(value);
  // Cells are fixed-width, so clip long text with an ellipsis and keep the
  // full value reachable through the native tooltip.
  return (
    <span className="block truncate" title={text}>
      {text}
    </span>
  );
}

function CarColumnCell({
  column,
  value,
  record,
  translate,
}: {
  column: CarColumnConfig;
  value: unknown;
  record?: Record<string, unknown>;
  translate: ReturnType<typeof useTranslate>;
}): ReactNode {
  if (column.render) return column.render(record ?? {});

  if (column.kind === "attachment") {
    return (
      <CarAttachmentValue fieldName={column.accessor} record={record} />
    );
  }

  if (column.composite?.length) {
    return (
      <div className="flex min-w-0 flex-col gap-1">
        {column.composite.map((field) => {
          const fieldValue = getNestedValue(record ?? {}, field.accessor);
          const label = field.label
            ? resolveCarLabel(field.label, field.accessor, translate)
            : undefined;
          const rendered = (
            <CarValueText field={field} value={fieldValue} />
          );
          if (field.priority === "primary") {
            return (
              <span
                key={field.accessor}
                className="truncate text-sm font-semibold"
              >
                {rendered}
              </span>
            );
          }
          if (!label) return <div key={field.accessor}>{rendered}</div>;
          return (
            <div
              key={field.accessor}
              className="flex min-w-0 items-center gap-1.5"
            >
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {label}
              </span>
              <span className="min-w-0 flex-1 truncate">{rendered}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <CarValueText field={column as CarColumnFieldRef} value={value} />
  );
}

export function CarResourceList({ config }: { config: CarResourceConfig }) {
  const translate = useTranslate();
  const navigate = useNavigate();
  const relationResources = useMemo(
    () =>
      Array.from(
        new Set(
          config.columns
            .filter((column) => column.kind === "relation" && column.relation)
            .map((column) => column.relation!.resource)
        )
      ),
    [config.columns]
  );

  const relationOptionsMap = useRelationOptions(relationResources);
  const searchableFields = useMemo(
    () => config.searchableFields ?? [],
    [config.searchableFields]
  );

  const openShow = useCallback(
    (id: unknown) => {
      navigate(`/${config.name}/show/${String(id)}`, {
        state: { returnTo: `/${config.name}` },
      });
    },
    [config.name, navigate]
  );

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<Record<string, unknown>>();
    const businessColumns: ColumnDef<Record<string, unknown>, unknown>[] =
      config.columns.map((column) =>
      columnHelper.accessor(
        (record) => getNestedValue(record, column.accessor),
        {
          id: column.accessor,
          header: ({ column: tableColumn, table: tableInstance }) => (
            <div className="flex items-center gap-1">
              <span>
                {resolveCarLabel(column.header, column.header, translate)}
              </span>
              {column.sortable !== false ? (
                <DataTableSorter column={tableColumn} />
              ) : null}
              {column.kind === "select" && column.options ? (
                <DataTableFilterCombobox
                  column={tableColumn}
                  table={tableInstance}
                  options={(column.options ?? []).map((option) => ({
                    value: option.value,
                    label: resolveCarLabel(option.label, option.label, translate),
                  }))}
                  defaultOperator="eq"
                  operators={["eq", "ne"]}
                />
              ) : column.kind === "relation" && column.relation ? (
                <DataTableFilterCombobox
                  column={tableColumn}
                  table={tableInstance}
                  options={relationOptionsMap[column.relation.resource] ?? []}
                  defaultOperator="eq"
                  operators={["eq", "ne"]}
                />
              ) : column.kind === "text" ? (
                <DataTableFilterDropdownText
                  column={tableColumn}
                  table={tableInstance}
                  defaultOperator="contains"
                  operators={["contains", "eq", "startswith"]}
                />
              ) : null}
            </div>
          ),
          enableSorting: column.sortable !== false && !column.composite,
          size: column.size,
          cell: ({ row, getValue }) => {
            const id = row.original.id;
            const value = getValue();

            // Status and money fields support inline editing directly.
            if (column.kind === "select" && column.options && id !== undefined) {
              return (
                <InlineSelectEdit
                  resource={config.name}
                  recordId={String(id)}
                  fieldName={column.accessor}
                  fieldLabel={resolveCarLabel(column.header, column.header, translate)}
                  value={value}
                  options={(column.options ?? []).map((option) => ({
                    value: option.value,
                    label: resolveCarLabel(option.label, option.label, translate),
                  }))}
                  display={
                    <CarStatusBadge
                      value={String(value ?? "")}
                      options={column.options}
                    />
                  }
                />
              );
            }

            if (column.kind === "number" && id !== undefined) {
              return (
                <InlineNumberEdit
                  resource={config.name}
                  recordId={String(id)}
                  fieldName={column.accessor}
                  fieldLabel={resolveCarLabel(column.header, column.header, translate)}
                  value={value}
                  display={
                    <span className="tabular-nums">
                      {typeof value === "number" ? formatNumber(value) : "-"}
                    </span>
                  }
                />
              );
            }

            const clickable = column.clickable !== false;
            const content = (
              <CarColumnCell
                column={column}
                value={value}
                record={row.original}
                translate={translate}
              />
            );
            if (!clickable) return content;
            return (
              <button
                type="button"
                onClick={() => openShow(id)}
                className="flex w-full min-w-0 items-center rounded-md px-1 py-0.5 text-left transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                title={translate("buttons.show", "View")}
              >
                {content}
              </button>
            );
          },
        }
      )
    );

    businessColumns.push(
      columnHelper.display({
        id: "actions",
        header: resolveCarLabel("car.actions", "Actions", translate),
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <EditButton
              resource={config.name}
              recordItemId={String(row.original.id)}
              variant="ghost"
              size="icon"
              aria-label={translate("buttons.edit", "Edit")}
              title={translate("buttons.edit", "Edit")}
            >
              <Pencil />
            </EditButton>
            <ShowButton
              resource={config.name}
              recordItemId={String(row.original.id)}
              variant="ghost"
              size="icon"
              aria-label={translate("buttons.show", "View")}
              title={translate("buttons.show", "View")}
            >
              <Eye />
            </ShowButton>
            {config.canDelete !== false ? (
              <DeleteButton
                resource={config.name}
                recordItemId={String(row.original.id)}
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                aria-label={translate("buttons.delete", "Delete")}
                title={translate("buttons.delete", "Delete")}
              >
                <Trash2 />
              </DeleteButton>
            ) : null}
          </div>
        ),
        enableSorting: false,
        size: 144,
        enablePinning: true,
      })
    );

    if (searchableFields.length) {
      businessColumns.push(
        columnHelper.accessor(() => undefined, {
          id: "__global_search__",
          header: () => null,
          cell: () => null,
          enableSorting: false,
          enableHiding: true,
          size: 0,
          meta: {
            filterOperator: "or",
            filterKey: "__global_search__",
          },
        })
      );
    }

    return businessColumns;
  }, [config, translate, relationOptionsMap, searchableFields, openShow]);

  const relationAppends = useMemo(() => {
    const fields = new Set<string>();
    for (const column of config.columns) {
      if (column.kind === "relation" && column.relation) {
        fields.add(column.accessor);
      }
      if (column.kind === "attachment") {
        fields.add(column.accessor);
      }
      for (const field of column.composite ?? []) {
        if (field.kind === "relation" && field.relation) {
          fields.add(field.accessor);
        }
      }
    }
    return Array.from(fields);
  }, [config.columns]);

  const table = useTable<Record<string, unknown>>({
    columns,
    refineCoreProps: {
      resource: config.name,
      syncWithLocation: false,
      meta: {
        appends: relationAppends,
      },
      sorters: {
        initial: [{ field: "createdAt", order: "desc" as const }],
      },
    },
    initialState: {
      columnPinning: {
        right: ["actions"],
      },
      columnVisibility: {
        __global_search__: false,
      },
    },
  });

  const [searchValue, setSearchValue] = useState("");

  const handleSearch = useCallback(
    (value: string) => {
      setSearchValue(value);
      const trimmed = value.trim();
      if (!trimmed || !searchableFields.length) {
        table.reactTable.setColumnFilters((current) =>
          current.filter((filter) => filter.id !== "__global_search__")
        );
        return;
      }
      table.reactTable.setColumnFilters((current) => {
        const others = current.filter(
          (filter) => filter.id !== "__global_search__"
        );
        return [
          ...others,
          {
            id: "__global_search__",
            value: searchableFields.map((field) => ({
              field,
              operator: "contains",
              value: trimmed,
            })),
          },
        ];
      });
    },
    [searchableFields, table]
  );

  const searchPlaceholder = translate(
    "car.search.placeholder",
    { ns: "car" },
    "Search..."
  );

  const tableContext = useAIPageElementHandle({
    id: `${config.name}-table`,
    title: resolveCarLabel(config.titleKey, config.name, translate),
    kind: "table",
    getContext: () => ({
      resource: config.name,
      page: table.refineCore.currentPage,
      pageSize: table.refineCore.pageSize,
      total: table.refineCore.tableQuery.data?.total ?? 0,
      rows: (table.refineCore.tableQuery.data?.data ?? []).map((record) =>
        compactRecord(record, config)
      ),
    }),
  });

  return (
    <ListView resource={config.name}>
      {config.aiAssistant ? <CarAIAssistantPanel config={config} /> : null}
      {searchableFields.length ? (
        <div className="flex items-center justify-between gap-3">
          <CarSearchBar placeholder={searchPlaceholder} onSearch={handleSearch} />
        </div>
      ) : null}
      {config.view === "kanban" ? (
        <div ref={tableContext.ref}>
          <CarKanbanView config={config} search={searchValue} />
        </div>
      ) : config.view === "cards" ? (
        <div ref={tableContext.ref}>
          <CarCardsView config={config} search={searchValue} />
        </div>
      ) : config.view === "calendar" ? (
        <div ref={tableContext.ref}>
          <CarCalendarView config={config} search={searchValue} />
        </div>
      ) : (
        <div ref={tableContext.ref}>
          <DataTable table={table} />
        </div>
      )}
    </ListView>
  );
}

function compactRecord(
  record: Record<string, unknown>,
  config: CarResourceConfig
): Record<string, unknown> {
  const result: Record<string, unknown> = { id: record.id };
  for (const column of config.columns) {
    if (column.kind === "relation" && column.relation) {
      const related = record[column.accessor] as
        | Record<string, unknown>
        | undefined;
      result[column.accessor] = related?.[column.relation.labelField] ?? null;
    } else {
      result[column.accessor] = record[column.accessor] ?? null;
    }
  }
  return result;
}
