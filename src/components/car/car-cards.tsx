import { useList, useTranslate } from "@refinedev/core";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router";
import { useMemo } from "react";

import { DeleteButton } from "@/components/resources/buttons/delete";
import {
  CarRelationValue,
  CarStatusBadge,
} from "@/components/car/value";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { resolveCarLabel } from "@/lib/car/labels";
import type { CarResourceConfig } from "@/lib/car/types";

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

export function CarCardsView({
  config,
  search,
}: {
  config: CarResourceConfig;
  search?: string;
}) {
  const translate = useTranslate();
  const navigate = useNavigate();

  const { result } = useList<Record<string, unknown>>({
    resource: config.name,
    pagination: { mode: "server", currentPage: 1, pageSize: 200 },
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

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((record) => (
          <Card key={String(record.id)} className="gap-0 py-0 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-8px_color-mix(in_oklch,var(--primary)_25%,transparent)]">
            <CardContent className="space-y-3 py-4">
              <div className="flex items-start justify-between gap-2">
                <div
                  className="min-w-0 flex-1 cursor-pointer"
                  onClick={() =>
                    navigate(`/${config.name}/show/${String(record.id)}`, {
                      state: { returnTo: `/${config.name}` },
                    })
                  }
                  title={translate("buttons.show", "View")}
                >
                  <p className="truncate text-base font-semibold">
                    {String(
                      getNestedValue(record, config.cardTitle ?? "name") ??
                        record.id ??
                        "-"
                    )}
                  </p>
                </div>
                {config.cardBadge && config.cardBadgeOptions ? (
                  <CarStatusBadge
                    value={String(getNestedValue(record, config.cardBadge) ?? "")}
                    options={config.cardBadgeOptions}
                  />
                ) : null}
              </div>
              {(config.cardSubtitle ?? []).filter(Boolean).length ? (
                <dl className="space-y-1.5">
                  {config.cardSubtitle!.map((field) => {
                    const column = config.columns.find(
                      (col) => col.accessor === field
                    );
                    const value = getNestedValue(record, field);
                    const label = column
                      ? resolveCarLabel(column.header, column.header, translate)
                      : field;
                    let rendered: React.ReactNode = "-";
                    if (column?.kind === "relation" && column.relation) {
                      rendered = (
                        <CarRelationValue
                          value={value as Record<string, unknown> | undefined}
                          labelField={column.relation.labelField}
                          subFields={column.relation.subFields}
                        />
                      );
                    } else if (
                      value !== null &&
                      value !== undefined &&
                      value !== ""
                    ) {
                      rendered = String(value);
                    }
                    return (
                      <div
                        key={field}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <dt className="shrink-0 text-xs text-muted-foreground">
                          {label}
                        </dt>
                        <dd className="min-w-0 truncate text-right font-medium">
                          {rendered}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              ) : null}
              <div className="flex items-center justify-end gap-0.5 border-t pt-2">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={translate("buttons.show", "View")}
                  title={translate("buttons.show", "View")}
                  onClick={() =>
                    navigate(`/${config.name}/show/${String(record.id)}`, {
                      state: { returnTo: `/${config.name}` },
                    })
                  }
                >
                  <Eye />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={translate("buttons.edit", "Edit")}
                  title={translate("buttons.edit", "Edit")}
                  onClick={() =>
                    navigate(`/${config.name}/edit/${String(record.id)}`, {
                      state: { returnTo: `/${config.name}` },
                    })
                  }
                >
                  <Pencil />
                </Button>
                {config.canDelete !== false ? (
                  <DeleteButton
                    resource={config.name}
                    recordItemId={String(record.id)}
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    aria-label={translate("buttons.delete", "Delete")}
                    title={translate("buttons.delete", "Delete")}
                  >
                    <Trash2 />
                  </DeleteButton>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {!rows.length ? (
        <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
          {translate("car.kanban.empty", { ns: "car" }, "No records")}
        </div>
      ) : null}
    </div>
  );
}
