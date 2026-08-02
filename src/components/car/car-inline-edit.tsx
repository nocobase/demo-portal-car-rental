import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useInvalidate, useTranslate } from "@refinedev/core";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { nocobaseClient } from "@nocobase/portal-sdk/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { resolveCarLabel } from "@/lib/car/labels";

type InlineEditBaseProps = {
  resource: string;
  recordId: string | number;
  fieldName: string;
  fieldLabel?: string;
  value: unknown;
  display: ReactNode;
  className?: string;
};

function useInlineUpdate({
  resource,
  recordId,
  fieldName,
}: {
  resource: string;
  recordId: string | number;
  fieldName: string;
}) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidate();
  const { mutate, isPending } = useMutation({
    mutationFn: async (value: unknown) => {
      await nocobaseClient.action(resource, "update", {
        method: "POST",
        query: { filterByTk: String(recordId) },
        body: { [fieldName]: value },
      });
    },
    onSuccess: () => {
      invalidate({ resource, invalidates: ["resourceAll"] });
      queryClient.invalidateQueries({
        queryKey: ["car", "related", resource],
      });
    },
  });

  const submit = (value: unknown) => {
    mutate(value);
  };

  return { submit, isPending };
}

export function InlineSelectEdit({
  resource,
  recordId,
  fieldName,
  fieldLabel,
  value,
  display,
  options,
  className,
}: InlineEditBaseProps & {
  options: { value: string; label: string }[];
}) {
  const translate = useTranslate();
  const { submit, isPending } = useInlineUpdate({
    resource,
    recordId,
    fieldName,
  });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(String(value ?? ""));

  useEffect(() => {
    setDraft(String(value ?? ""));
  }, [value]);

  if (editing) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md bg-accent/40 p-0.5",
          className
        )}
      >
        <Select value={draft} onValueChange={(next) => setDraft(next ?? "")}>
          <SelectTrigger className="h-7 w-40">
            <SelectValue
              placeholder={translate("car.inline.select", { ns: "car" }, "Select")}
            >
              {options.find((option) => option.value === draft)
                ? resolveCarLabel(
                    options.find((option) => option.value === draft)!.label,
                    options.find((option) => option.value === draft)!.label,
                    translate
                  )
                : null}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {resolveCarLabel(option.label, option.label, translate)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={translate("car.inline.confirm", { ns: "car" }, "Save")}
          disabled={isPending || draft === String(value ?? "")}
          onClick={() => {
            submit(draft || null);
            setEditing(false);
          }}
        >
          {isPending ? <Loader2 className="animate-spin" /> : <Check />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={translate("car.inline.cancel", { ns: "car" }, "Cancel")}
          onClick={() => {
            setDraft(String(value ?? ""));
            setEditing(false);
          }}
        >
          <X />
        </Button>
      </span>
    );
  }

  return (
    <span className={cn("group inline-flex min-w-0 items-center gap-1", className)}>
      <span
        className="cursor-pointer rounded-md px-1 py-0.5 transition-colors hover:bg-accent/60"
        role="button"
        tabIndex={0}
        title={translate(
          "car.inline.clickToEdit",
          { ns: "car", field: fieldLabel ?? fieldName },
          `Edit ${fieldLabel ?? fieldName}`
        )}
        onClick={() => setEditing(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setEditing(true);
          }
        }}
      >
        {display}
      </span>
      <Pencil className="size-3 shrink-0 text-muted-foreground/50 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100" />
    </span>
  );
}

export function InlineNumberEdit({
  resource,
  recordId,
  fieldName,
  fieldLabel,
  value,
  display,
  className,
}: InlineEditBaseProps) {
  const translate = useTranslate();
  const { submit, isPending } = useInlineUpdate({
    resource,
    recordId,
    fieldName,
  });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(
    value === null || value === undefined ? "" : String(value)
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value === null || value === undefined ? "" : String(value));
  }, [value]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const confirm = () => {
    const numeric = draft === "" ? null : Number(draft);
    if (numeric === null || !Number.isNaN(numeric)) {
      submit(numeric);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md bg-accent/40 p-0.5",
          className
        )}
      >
        <Input
          ref={inputRef}
          type="number"
          className="h-7 w-32"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") confirm();
            if (event.key === "Escape") setEditing(false);
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={translate("car.inline.confirm", { ns: "car" }, "Save")}
          disabled={isPending}
          onClick={confirm}
        >
          {isPending ? <Loader2 className="animate-spin" /> : <Check />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={translate("car.inline.cancel", { ns: "car" }, "Cancel")}
          onClick={() => {
            setDraft(
              value === null || value === undefined ? "" : String(value)
            );
            setEditing(false);
          }}
        >
          <X />
        </Button>
      </span>
    );
  }

  return (
    <span className={cn("group inline-flex min-w-0 items-center gap-1", className)}>
      <span
        className="cursor-pointer rounded-md px-1 py-0.5 tabular-nums transition-colors hover:bg-accent/60"
        role="button"
        tabIndex={0}
        title={translate(
          "car.inline.clickToEdit",
          { ns: "car", field: fieldLabel ?? fieldName },
          `Edit ${fieldLabel ?? fieldName}`
        )}
        onClick={() => setEditing(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setEditing(true);
          }
        }}
      >
        {display}
      </span>
      <Pencil className="size-3 shrink-0 text-muted-foreground/50 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100" />
    </span>
  );
}
