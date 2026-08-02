import {
  type HttpError,
  useList,
  useTranslate,
} from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { useEffect, useMemo } from "react";
import { useLocation, useParams } from "react-router";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouteSurfaceClose } from "@nocobase/portal-sdk/routing";
import {
  RouteDrawer,
  RouteDrawerFooter,
  useRefineUnsavedChangesGuard,
} from "@/extensions/nocobase-route-surfaces";
import { useCarAIForm, type AIFormField } from "@/lib/car/ai";
import { resolveCarLabel } from "@/lib/car/labels";
import type { CarResourceConfig, RelationOption } from "@/lib/car/types";
import type { FileUploadFieldValue } from "@/extensions/nocobase-file-upload";
import type { FileFieldDescriptor } from "@/extensions/nocobase-file-upload";
import { serializeFileFieldValues } from "@/extensions/nocobase-file-upload";
import {
  CarAttachmentInput,
  getCarAttachmentDescriptor,
} from "@/components/car/car-attachment";

export function CarResourceCreate({
  config,
  closeTo: closeToProp,
  initialValues: initialValuesProp,
}: {
  config: CarResourceConfig;
  closeTo?: string;
  initialValues?: Record<string, unknown>;
}) {
  const translate = useTranslate();
  const location = useLocation();
  const state = location.state as
    | { returnTo?: string; initialValues?: Record<string, unknown> }
    | null
    | undefined;
  const closeTo = closeToProp ?? state?.returnTo ?? `/${config.name}`;
  const initialValues = initialValuesProp ?? state?.initialValues;
  const { beforeClose, confirmation } = useRefineUnsavedChangesGuard();

  return (
    <>
      <RouteDrawer
        title={translate("car.drawer.create.title", { ns: "car" }, "Create")}
        description={translate(
          "car.drawer.create.description",
          { ns: "car" },
          "Add a new record."
        )}
        closeLabel={translate("buttons.close", "Close")}
        closeTo={closeTo}
        beforeClose={beforeClose}
      >
        <CarResourceForm
          config={config}
          mode="create"
          initialValues={initialValues}
        />
      </RouteDrawer>
      {confirmation}
    </>
  );
}

export function CarResourceEdit({
  config,
  id: idProp,
  closeTo: closeToProp,
}: {
  config: CarResourceConfig;
  id?: string;
  closeTo?: string;
}) {
  const translate = useTranslate();
  const location = useLocation();
  const { id: idParam } = useParams<{ id: string }>();
  const id = idProp ?? idParam;
  const state = location.state as { returnTo?: string } | null | undefined;
  const closeTo = closeToProp ?? state?.returnTo ?? `/${config.name}`;
  const { beforeClose, confirmation } = useRefineUnsavedChangesGuard();

  return (
    <>
      <RouteDrawer
        title={translate("car.drawer.edit.title", { ns: "car" }, "Edit")}
        description={translate(
          "car.drawer.edit.description",
          { ns: "car" },
          "Update this record."
        )}
        closeLabel={translate("buttons.close", "Close")}
        closeTo={closeTo}
        beforeClose={beforeClose}
      >
        <CarResourceForm config={config} mode="edit" id={id} />
      </RouteDrawer>
      {confirmation}
    </>
  );
}

function CarResourceForm({
  config,
  mode,
  id,
  initialValues,
}: {
  config: CarResourceConfig;
  mode: "create" | "edit";
  id?: string;
  initialValues?: Record<string, unknown>;
}) {
  const translate = useTranslate();
  const close = useRouteSurfaceClose();
  const attachmentFields = useMemo(
    () => config.fields.filter((field) => field.kind === "attachment"),
    [config.fields]
  );
  const form = useForm<
    Record<string, unknown>,
    HttpError,
    Record<string, unknown>
  >({
    refineCoreProps: {
      resource: config.name,
      action: mode,
      id,
      redirect: false,
      meta: {
        appends: attachmentFields.map((field) => field.name),
      },
      onMutationSuccess: () => {
        close({ skipBeforeClose: true });
      },
    },
    defaultValues: initialValues,
  });
  const { onFinish } = form.refineCore;

  // NocoBase returns relation fields by their foreign-key column
  // (`branchId`, `categoryId`) while the form fields use the relation
  // name (`branch`, `category`). Mirror the loaded foreign-key values into
  // the relation fields so existing selections render and edit correctly.
  const loadedQueryData = (
    form.refineCore as unknown as {
      query?: { data?: { data?: Record<string, unknown> } };
    }
  ).query?.data?.data;
  useEffect(() => {
    if (mode !== "edit" || !loadedQueryData) return;
    for (const field of config.fields) {
      if (field.kind !== "relation" || !field.relation) continue;
      const foreignKey = `${field.name}Id`;
      const value = loadedQueryData[foreignKey];
      if (value !== undefined && value !== null && value !== "") {
        form.setValue(field.name, value as never);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, loadedQueryData, config.fields, form.setValue]);
  const aiFields = useMemo<AIFormField[]>(
    () =>
      config.fields.map((field) => ({
        name: field.name,
        title: resolveCarLabel(field.title, field.title, translate),
        required: field.required,
        ...(field.options
          ? {
              enum: field.options.map((option) => ({
                value: option.value,
                label: resolveCarLabel(option.label, option.label, translate),
              })),
            }
          : {}),
        ...(field.relation ? { relation: field.relation } : {}),
      })),
    [config.fields, translate]
  );

  const attachmentDescriptors = useMemo<FileFieldDescriptor[]>(
    () =>
      attachmentFields.map((field) =>
        getCarAttachmentDescriptor(config, field.name)
      ),
    [attachmentFields, config]
  );

  const aiFormRef = useCarAIForm({
    id: `${config.name}-${mode}-form`,
    title: resolveCarLabel(config.titleKey, config.name, translate),
    fields: aiFields,
    getValues: () => form.getValues(),
    setValues: (values) => form.reset(values as Record<string, unknown>),
  });

  const handleSubmit = form.handleSubmit((values) => {
    const autoGeneratedFields = new Set(
      config.fields
        .filter((field) => field.autoGenerated)
        .map((field) => field.name)
    );
    const payload = attachmentDescriptors.length
      ? serializeFileFieldValues(values, attachmentDescriptors)
      : values;
    if (autoGeneratedFields.size) {
      for (const name of autoGeneratedFields) {
        delete payload[name];
      }
    }
    return onFinish(payload);
  });

  return (
    <Form {...form}>
      <form
        ref={aiFormRef}
        onSubmit={handleSubmit}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 [&_[data-slot=input]]:h-10 [&_[data-slot=select-trigger]]:h-10 [&_[data-slot=textarea]]:min-h-28">
          {config.fields.map((field) => (
            <CarFormField
              key={field.name}
              config={config}
              fieldName={field.name}
              control={form.control}
              translate={translate}
            />
          ))}
        </div>
        <RouteDrawerFooter className="flex-row justify-end">
          <Button type="button" variant="outline" onClick={() => close()}>
            {translate("car.form.cancel", { ns: "car" }, "Cancel")}
          </Button>
          <Button
            type="submit"
            {...form.saveButtonProps}
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting
              ? translate(
                  "car.form.submitting",
                  { ns: "car" },
                  "Saving..."
                )
              : translate(
                  mode === "create" ? "car.form.create" : "car.form.edit",
                  { ns: "car" },
                  mode === "create" ? "Create" : "Save changes"
                )}
          </Button>
        </RouteDrawerFooter>
      </form>
    </Form>
  );
}

function CarFormField({
  config,
  fieldName,
  control,
  translate,
}: {
  config: CarResourceConfig;
  fieldName: string;
  control: UseFormReturn["control"];
  translate: ReturnType<typeof useTranslate>;
}) {
  const field = config.fields.find((item) => item.name === fieldName);
  if (!field) return null;

  const label = resolveCarLabel(field.title, field.title, translate);
  const placeholder = translate(
    "car.form.placeholder",
    { ns: "car" },
    "Enter"
  );

  if (field.autoGenerated) {
    return (
      <FormField
        control={control}
        name={field.name}
        render={({ field: renderField }) => (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl
              render={
                <Input
                  {...renderField}
                  disabled
                  readOnly
                  value={
                    renderField.value === null ||
                    renderField.value === undefined ||
                    renderField.value === ""
                      ? translate(
                          "car.form.autoGenerated",
                          { ns: "car" },
                          "Auto-generated on save"
                        )
                      : String(renderField.value)
                  }
                  placeholder={placeholder}
                />
              }
            />
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  if (field.kind === "attachment") {
    return (
      <FormField
        control={control}
        name={field.name}
        render={({ field: renderField }) => (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl
              render={
                <CarAttachmentInput
                  config={config}
                  fieldName={field.name}
                  value={(renderField.value as FileUploadFieldValue) ?? []}
                  onChange={(value) => renderField.onChange(value)}
                />
              }
            />
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  if (field.kind === "textarea") {
    return (
      <FormField
        control={control}
        name={field.name}
        rules={
          field.required
            ? { required: translate("car.validation.required", { ns: "car" }, "Required") }
            : undefined
        }
        render={({ field: renderField }) => (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl
              render={
                <Textarea
                  {...renderField}
                  value={renderField.value ?? ""}
                  placeholder={placeholder}
                />
              }
            />
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  if (field.kind === "number") {
    return (
      <FormField
        control={control}
        name={field.name}
        render={({ field: renderField }) => (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl
              render={
                <Input
                  {...renderField}
                  type="number"
                  value={renderField.value ?? ""}
                  onChange={(event) =>
                    renderField.onChange(
                      event.target.value === ""
                        ? null
                        : Number(event.target.value)
                    )
                  }
                  placeholder={translate(
                    "car.form.numberPlaceholder",
                    { ns: "car" },
                    "0"
                  )}
                />
              }
            />
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  if (field.kind === "date" || field.kind === "datetime") {
    return (
      <FormField
        control={control}
        name={field.name}
        render={({ field: renderField }) => (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl
              render={
                <Input
                  {...renderField}
                  type={field.kind === "datetime" ? "datetime-local" : "date"}
                  value={toInputDate(renderField.value, field.kind === "datetime")}
                  onChange={(event) =>
                    renderField.onChange(
                      event.target.value ? event.target.value : null
                    )
                  }
                />
              }
            />
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  if (field.kind === "select" && field.options) {
    return (
      <FormField
        control={control}
        name={field.name}
        render={({ field: renderField }) => (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl
              render={
                <Select
                  value={String(renderField.value ?? "")}
                  onValueChange={(value) =>
                    renderField.onChange(value || null)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={placeholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {(field.options ?? []).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {resolveCarLabel(option.label, option.label, translate)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            />
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  if (field.kind === "relation" && field.relation) {
    return (
      <RelationField
        fieldName={field.name}
        fieldLabel={label}
        fieldRequired={field.required}
        relation={field.relation}
        control={control}
        translate={translate}
      />
    );
  }

  return (
    <FormField
      control={control}
      name={field.name}
      rules={
        field.required
          ? { required: translate("car.validation.required", { ns: "car" }, "Required") }
          : undefined
      }
      render={({ field: renderField }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl
            render={
              <Input
                {...renderField}
                value={renderField.value ?? ""}
                placeholder={placeholder}
              />
            }
          />
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function RelationField({
  fieldName,
  fieldLabel,
  fieldRequired,
  relation,
  control,
  translate,
}: {
  fieldName: string;
  fieldLabel: string;
  fieldRequired?: boolean;
  relation: RelationOption;
  control: UseFormReturn["control"];
  translate: ReturnType<typeof useTranslate>;
}) {
  const { result } = useList<Record<string, unknown>>({
    resource: relation.resource,
    pagination: { mode: "server", currentPage: 1, pageSize: 500 },
    queryOptions: { retry: false },
  });

  const options = result.data ?? [];

  // NocoBase returns relation fields by their foreign-key column
  // (`branchId`) while the form field uses the relation name (`branch`).
  // Watch both so an existing selection renders in edit mode.
  const foreignKeyValue = useWatch({
    control,
    name: `${fieldName}Id`,
  });

  return (
    <FormField
      control={control}
      name={fieldName}
      rules={
        fieldRequired
          ? { required: translate("car.validation.required", { ns: "car" }, "Required") }
          : undefined
      }
      render={({ field: renderField }) => {
        const rawValue = renderField.value ?? foreignKeyValue;
        const value =
          rawValue && typeof rawValue === "object"
            ? (rawValue as { id?: unknown }).id
            : rawValue;
        const selected = options.find(
          (option) => String(option.id) === String(value ?? "")
        );
        return (
          <FormItem>
            <FormLabel>{fieldLabel}</FormLabel>
            <FormControl
              render={
                <Select
                  value={String(value ?? "")}
                  onValueChange={(next) =>
                    renderField.onChange(next ? String(next) : null)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={translate(
                        "car.form.relationPlaceholder",
                        { ns: "car" },
                        "Select"
                      )}
                    >
                      {selected
                        ? renderRelationLabel(selected, relation)
                        : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((option) => (
                      <SelectItem
                        key={String(option.id)}
                        value={String(option.id)}
                      >
                        {renderRelationLabel(option, relation)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            />
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

function toInputDate(value: unknown, withTime: boolean): string {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const base = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
  if (!withTime) return base;
  return `${base}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function renderRelationLabel(
  record: Record<string, unknown>,
  relation: RelationOption
): string {
  const label = String(record[relation.labelField] ?? "?");
  const detail = (relation.subFields ?? [])
    .map((field) => record[field])
    .filter((item) => item !== null && item !== undefined && item !== "")
    .join(" · ");
  return detail ? `${label}（${detail}）` : label;
}
