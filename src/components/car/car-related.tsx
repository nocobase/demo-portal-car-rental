import { useTranslate } from "@refinedev/core";
import { createRouteSurfaceNavigationState } from "@nocobase/portal-sdk/routing";
import { useQueries } from "@tanstack/react-query";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router";

import { nocobaseClient } from "@nocobase/portal-sdk/client";
import { DeleteButton } from "@/components/resources/buttons/delete";
import {
  CarRelationValue,
  CarStatusBadge,
  formatDate,
  formatNumber,
} from "@/components/car/value";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { resolveCarLabel } from "@/lib/car/labels";
import type { CarColumnConfig, CarRelatedConfig, CarResourceConfig } from "@/lib/car/types";

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

export function CarRelatedPanels({
  config,
  parentRecord,
}: {
  config: CarResourceConfig;
  parentRecord: Record<string, unknown>;
}) {
  const translate = useTranslate();
  if (!config.related?.length) return null;
  const parentId = parentRecord.id;

  const relatedConfigs = config.related;

  const queries = useQueries({
    queries: relatedConfigs.map((related) => {
      const appends = related.columns
        .filter((column) => column.kind === "relation" && column.relation)
        .map((column) => column.accessor);
      return {
        queryKey: [
          "car",
          "related",
          config.name,
          related.resource,
          String(parentId),
        ],
        enabled: parentId !== undefined && parentId !== null,
        queryFn: async () => {
          const rows = await nocobaseClient.action<Record<string, unknown>[]>(
            related.resource,
            "list",
            {
              method: "GET",
              query: {
                filter: JSON.stringify({
                  [related.filterField]: { $eq: parentId },
                }),
                pageSize: 50,
                appends,
              },
            }
          );
          return Array.isArray(rows) ? rows : [];
        },
      };
    }),
  });

  const defaultTab = relatedConfigs[0].resource;

  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList className="w-full justify-start">
        {relatedConfigs.map((related, index) => (
          <TabsTrigger
            key={related.resource}
            value={related.resource}
            className="min-w-28 flex-none"
          >
            <span>{resolveCarLabel(related.titleKey, related.resource, translate)}</span>
            {queries[index]?.data ? (
              <span className="ml-1 rounded-full bg-muted-foreground/10 px-1.5 text-[11px] tabular-nums">
                {queries[index].data.length}
              </span>
            ) : null}
          </TabsTrigger>
        ))}
      </TabsList>
      {relatedConfigs.map((related, index) => (
        <TabsContent key={related.resource} value={related.resource}>
          <RelatedPanel
            config={config}
            related={related}
            parentId={parentId}
            isLoading={queries[index].isLoading}
            rows={queries[index].data ?? []}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function RelatedPanel({
  config,
  related,
  parentId,
  isLoading,
  rows,
}: {
  config: CarResourceConfig;
  related: CarRelatedConfig;
  parentId: unknown;
  isLoading?: boolean;
  rows?: Record<string, unknown>[];
}) {
  const translate = useTranslate();
  const navigate = useNavigate();
  const location = useLocation();

  const title = resolveCarLabel(related.titleKey, related.resource, translate);

  const openContextual = (to: string) =>
    navigate(to, { state: createRouteSurfaceNavigationState(location) });

  const hostBase = `/${config.name}/show/${String(parentId)}`;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">{title}</h3>
        {related.canCreate !== false ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              openContextual(`${hostBase}/${related.resource}/create`)
            }
          >
            <Plus />
            {translate("buttons.create", "Create")}
          </Button>
        ) : null}
      </div>
      <div className="overflow-x-auto rounded-lg border">
        {isLoading ? (
          <div className="space-y-2 p-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
        <Table style={{ tableLayout: "fixed", width: "100%" }}>
          <TableHeader className="bg-muted/45">
            <TableRow>
              {related.columns.map((column) => (
                <TableHead
                  key={column.accessor}
                  style={{
                    width:
                      typeof column.size === "number" ? column.size : undefined,
                  }}
                >
                  <div className="truncate">
                    {resolveCarLabel(column.header, column.header, translate)}
                  </div>
                </TableHead>
              ))}
              <TableHead
                style={{
                  width: 144,
                }}
              >
                <div className="truncate">
                  {resolveCarLabel("car.actions", "Actions", translate)}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(rows ?? []).length ? (
              (rows ?? []).map((row) => (
                <TableRow key={String(row.id)}>
                  {related.columns.map((column) => (
                    <TableCell
                      key={column.accessor}
                      style={{
                        width:
                          typeof column.size === "number"
                            ? column.size
                            : undefined,
                      }}
                    >
                      <div className="truncate">
                        <RelatedCell
                          column={column}
                          value={getNestedValue(row, column.accessor)}
                        />
                      </div>
                    </TableCell>
                  ))}
                  <TableCell style={{ width: 144 }}>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={translate("buttons.edit", "Edit")}
                        title={translate("buttons.edit", "Edit")}
                        onClick={() =>
                          openContextual(
                            `${hostBase}/${related.resource}/edit/${String(row.id)}`
                          )
                        }
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={translate("buttons.show", "View")}
                        title={translate("buttons.show", "View")}
                        onClick={() =>
                          openContextual(
                            `${hostBase}/${related.resource}/show/${String(row.id)}`
                          )
                        }
                      >
                        <Eye />
                      </Button>
                      {related.canDelete !== false ? (
                        <DeleteButton
                          resource={related.resource}
                          recordItemId={String(row.id)}
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
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={related.columns.length + 1}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  {translate(
                    "car.related.empty",
                    { ns: "car" },
                    "No related records."
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        )}
      </div>
    </section>
  );
}

function RelatedCell({
  column,
  value,
}: {
  column: CarColumnConfig;
  value: unknown;
}) {
  if (column.kind === "select") {
    return (
      <CarStatusBadge value={String(value ?? "")} options={column.options} />
    );
  }
  if (column.kind === "number") {
    return (
      <span className="tabular-nums">
        {typeof value === "number" ? formatNumber(value) : "-"}
      </span>
    );
  }
  if (column.kind === "date") {
    return formatDate(String(value ?? ""));
  }
  if (column.kind === "datetime") {
    return formatDate(String(value ?? ""), true);
  }
  if (column.kind === "relation" && column.relation) {
    return (
      <CarRelationValue
        value={value as Record<string, unknown> | undefined}
        labelField={column.relation.labelField}
        subFields={column.relation.subFields}
      />
    );
  }
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}
