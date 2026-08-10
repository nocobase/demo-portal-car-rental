import { useList, useTranslate } from "@refinedev/core";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router";
import { useMemo } from "react";

import { DeleteButton } from "@/components/resources/buttons/delete";
import {
  CarRelationValue,
  CarStatusBadge,
} from "@/components/car/value";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  hasGenericEditFields,
  type CarResourceConfig,
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

export function CarKanbanView({
  config,
  search,
}: {
  config: CarResourceConfig;
  search?: string;
}) {
  const translate = useTranslate();
  const navigate = useNavigate();
  const boardField = config.boardField ?? "status";
  const boardOptions =
    config.boardOptions ??
    config.fields.find((field) => field.name === boardField)?.options ??
    [];
  const boardFieldIsDomain =
    config.fields.find((field) => field.name === boardField)?.mutability ===
    "domain";

  const { result } = useList<Record<string, unknown>>({
    resource: config.name,
    pagination: { mode: "server", currentPage: 1, pageSize: 200 },
    meta: {
      appends: config.columns
        .filter((column) => column.kind === "relation" && column.relation)
        .map((column) => column.accessor),
    },
    queryOptions: { retry: false },
  });

  const rows = useMemo(() => {
    const all = result.data ?? [];
    const trimmed = (search ?? "").trim().toLowerCase();
    if (!trimmed) return all;
    const searchable = config.searchableFields ?? [];
    return all.filter((record) =>
      searchable.some((field) =>
        String(getNestedValue(record, field) ?? "")
          .toLowerCase()
          .includes(trimmed)
      )
    );
  }, [result.data, search, config.searchableFields]);

  const columns = boardOptions.map((option) => ({
    ...option,
    items: rows.filter(
      (record) => String(getNestedValue(record, boardField)) === option.value
    ),
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((column) => (
          <div
            key={column.value}
            className="flex flex-col rounded-xl border bg-muted/30 p-3"
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <CarStatusBadge value={column.value} options={boardOptions} />
                <span className="text-xs text-muted-foreground">
                  {column.items.length}
                </span>
              </div>
              {config.canCreate !== false && !boardFieldIsDomain ? (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={translate("buttons.create", "Create")}
                  title={translate("buttons.create", "Create")}
                  onClick={() =>
                    navigate(`/${config.name}/create`, {
                      state: {
                        initialValues: { [boardField]: column.value },
                      },
                    })
                  }
                >
                  <Plus />
                </Button>
              ) : null}
            </div>
            <div className="flex min-h-16 flex-col gap-2">
              {column.items.length ? (
                column.items.map((record) => (
                  <KanbanCard
                    key={String(record.id)}
                    config={config}
                    record={record}
                    onEdit={() =>
                      navigate(`/${config.name}/edit/${String(record.id)}`, {
                        state: { returnTo: `/${config.name}` },
                      })
                    }
                    onShow={() =>
                      navigate(`/${config.name}/show/${String(record.id)}`, {
                        state: { returnTo: `/${config.name}` },
                      })
                    }
                  />
                ))
              ) : (
                <div className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">
                  {translate(
                    "car.kanban.empty",
                    { ns: "car" },
                    "No records"
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KanbanCard({
  config,
  record,
  onEdit,
  onShow,
}: {
  config: CarResourceConfig;
  record: Record<string, unknown>;
  onEdit: () => void;
  onShow: () => void;
}) {
  const translate = useTranslate();
  const title = String(
    getNestedValue(record, config.boardTitle ?? "id") ?? record.id ?? "-"
  );
  const subtitles = (config.boardSubtitle ?? []).map((field) => {
    const value = getNestedValue(record, field);
    if (value === null || value === undefined || value === "") return null;
    const column = config.columns.find((col) => col.accessor === field);
    if (column?.kind === "relation" && column.relation) {
      const rel = value as Record<string, unknown> | undefined;
      return (
        <CarRelationValue
          key={field}
          value={rel}
          labelField={column.relation.labelField}
          subFields={column.relation.subFields}
        />
      );
    }
    return (
      <span key={field} className="text-xs text-muted-foreground">
        {String(value)}
      </span>
    );
  });

  return (
    <Card className="gap-0 py-0 shadow-none">
      <CardContent className="space-y-1.5 py-3">
        <div className="flex items-start justify-between gap-2">
          <div
            className="min-w-0 flex-1 cursor-pointer"
            onClick={onShow}
            title={translate("buttons.show", "View")}
          >
            <p className="truncate text-sm font-medium">{title}</p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={translate("buttons.show", "View")}
              title={translate("buttons.show", "View")}
              onClick={onShow}
            >
              <Eye />
            </Button>
            {hasGenericEditFields(config) ? (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={translate("buttons.edit", "Edit")}
              title={translate("buttons.edit", "Edit")}
              onClick={onEdit}
            >
              <Pencil />
            </Button>
            ) : null}
            {config.canDelete !== false ? (
              <DeleteButton
                resource={config.name}
                recordItemId={String(record.id)}
                variant="ghost"
                size="icon-xs"
                className="text-destructive hover:text-destructive"
                aria-label={translate("buttons.delete", "Delete")}
                title={translate("buttons.delete", "Delete")}
              >
                <Trash2 />
              </DeleteButton>
            ) : null}
          </div>
        </div>
        {subtitles.filter(Boolean).length ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {subtitles.filter(Boolean)}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
