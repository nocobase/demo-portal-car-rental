import {
  type HttpError,
  useList,
  useTranslate,
} from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "react-router";
import { ChevronsUpDown, X } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
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
import type {
  CarFieldConfig,
  CarResourceConfig,
  RelationOption,
} from "@/lib/car/types";
import type { FileUploadFieldValue } from "@/extensions/nocobase-file-upload";
import { AiFillPanel, useAiFill, type AiFillField } from "@/components/ai-fill";
import type { FileFieldDescriptor } from "@/extensions/nocobase-file-upload";
import { serializeFileFieldValues } from "@/extensions/nocobase-file-upload";
import {
  CarAttachmentInput,
  getCarAttachmentDescriptor,
} from "@/components/car/car-attachment";
import { formatMoney } from "@/components/car/value";

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
  const writableFields = useMemo(
    () =>
      config.fields.filter(
        (field) =>
          field.mutability !== "domain" &&
          !(mode === "edit" && field.mutability === "create-only")
      ),
    [config.fields, mode]
  );
  const attachmentFields = useMemo(
    () => writableFields.filter((field) => field.kind === "attachment"),
    [writableFields]
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
  const { getValues: getFormValues, setValue: setFormValue } = form;
  const mutation = form.refineCore.mutation;
  const formBodyRef = useRef<HTMLDivElement>(null);
  const totalAmountOverriddenRef = useRef(false);
  const fieldLayout = useMemo(
    () => groupFormFields(writableFields),
    [writableFields]
  );
  const fieldNames = useMemo(
    () => new Set(writableFields.map((field) => field.name)),
    [writableFields]
  );
  const validatesExpectedReturn =
    fieldNames.has("pickup_time") && fieldNames.has("expected_return");
  const calculatesTotal =
    validatesExpectedReturn &&
    fieldNames.has("daily_rate") &&
    fieldNames.has("total_amount");
  const [pickupTime, expectedReturn, dailyRate] = useWatch({
    control: form.control,
    name: ["pickup_time", "expected_return", "daily_rate"],
  });
  const chargeCalculation = useMemo(
    () =>
      calculatesTotal
        ? calculateRentalCharge(pickupTime, expectedReturn, dailyRate)
        : null,
    [calculatesTotal, pickupTime, expectedReturn, dailyRate]
  );

  useEffect(() => {
    if (totalAmountOverriddenRef.current || !chargeCalculation) return;
    if (
      Number(getFormValues("total_amount")) === chargeCalculation.total
    ) {
      return;
    }
    setFormValue("total_amount", chargeCalculation.total, {
      shouldValidate: true,
    });
  }, [chargeCalculation, getFormValues, setFormValue]);

  useEffect(() => {
    if (!mutation.isError) return;
    formBodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [mutation.isError]);

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
      writableFields.map((field) => ({
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
    [writableFields, translate]
  );

  // The one-shot fill contract, derived from the same declarative field config
  // the form renders. Relations, attachments and auto-generated identifiers are
  // excluded: no plain-language description can resolve a foreign key.
  const aiFillFields = useMemo<AiFillField[]>(
    () =>
      writableFields
        .filter(
          (field) =>
            !field.autoGenerated &&
            field.kind !== "relation" &&
            field.kind !== "attachment"
        )
        .map((field) => ({
          name: field.name,
          title: resolveCarLabel(field.title, field.title, translate),
          type:
            field.kind === "number"
              ? "number"
              : field.kind === "date"
                ? "date"
                : "string",
          ...(field.options
            ? { enum: field.options.map((option) => option.value) }
            : {}),
          ...(field.kind === "datetime"
            ? {
                description:
                  "A date and time in YYYY-MM-DDTHH:mm format. Only when the text states one.",
              }
            : {}),
        })),
    [writableFields, translate]
  );

  const ai = useAiFill({
    formId: `${config.name}-ai-fill`,
    title: resolveCarLabel(config.titleKey, config.name, translate),
    fields: aiFillFields,
    getValues: () => form.getValues(),
    setValues: (values) => {
      for (const [name, value] of Object.entries(values)) {
        form.setValue(name, value as never, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
      }
    },
    instructions: config.aiFill?.instructions,
  });

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
    const payload = {
      ...(attachmentDescriptors.length
        ? serializeFileFieldValues(values, attachmentDescriptors)
        : values),
    };
    if (autoGeneratedFields.size) {
      for (const name of autoGeneratedFields) {
        delete payload[name];
      }
    }
    for (const field of config.fields) {
      if (
        field.mutability === "domain" ||
        (mode === "edit" && field.mutability === "create-only")
      ) {
        delete payload[field.name];
      }
    }
    return onFinish(payload);
  });
  const handleRecalculate = () => {
    totalAmountOverriddenRef.current = false;
    if (!chargeCalculation) return;
    form.setValue("total_amount", chargeCalculation.total, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };
  const renderFormField = (field: CarFieldConfig) => (
    <CarFormField
      key={field.name}
      config={config}
      fieldName={field.name}
      form={form}
      mode={mode}
      validatesExpectedReturn={validatesExpectedReturn}
      chargeCalculation={
        calculatesTotal && field.name === "total_amount"
          ? chargeCalculation
          : null
      }
      onManualTotalChange={
        calculatesTotal && field.name === "total_amount"
          ? () => {
              totalAmountOverriddenRef.current = true;
            }
          : undefined
      }
      onRecalculate={handleRecalculate}
      translate={translate}
    />
  );
  const mutationErrorMessage = getMutationErrorMessage(mutation.error);

  return (
    <Form {...form}>
      <form
        ref={aiFormRef}
        onSubmit={(event) => {
          mutation.reset();
          return handleSubmit(event);
        }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div
          ref={formBodyRef}
          className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 [&_[data-slot=input]]:h-10 [&_[data-slot=select-trigger]]:h-10 [&_[data-slot=textarea]]:min-h-28"
        >
          {mutation.isError ? (
            <Alert variant="destructive">
              <AlertTitle>
                {translate(
                  "car.form.saveFailedTitle",
                  { ns: "car" },
                  "Save failed"
                )}
              </AlertTitle>
              <AlertDescription>
                {mutationErrorMessage ??
                  translate(
                    "car.form.saveFailedDescription",
                    { ns: "car" },
                    "The record could not be saved."
                  )}
              </AlertDescription>
            </Alert>
          ) : null}
          {mode === "create" && config.aiFill ? (
            <AiFillPanel
              ai={ai}
              description={translate(
                config.aiFill.descriptionKey,
                { ns: "car" },
                "Describe it in plain language. AI assist will fill the form for you."
              )}
              inputLabel={translate(
                config.aiFill.labelKey,
                { ns: "car" },
                "Describe it"
              )}
              placeholder={translate(config.aiFill.placeholderKey, { ns: "car" }, "")}
            />
          ) : null}
          {fieldLayout.ungrouped.map(renderFormField)}
          {fieldLayout.sections.map((section) => (
            <section key={section.title} className="space-y-6">
              <div className="flex items-center gap-3">
                <h2 className="shrink-0 text-sm font-medium">
                  {resolveCarLabel(
                    section.title,
                    section.title,
                    translate
                  )}
                </h2>
                <Separator className="flex-1" />
              </div>
              {section.fields.map(renderFormField)}
            </section>
          ))}
        </div>
        <RouteDrawerFooter className="flex-row justify-end">
          <Button type="button" variant="outline" onClick={() => close()}>
            {translate("car.form.cancel", { ns: "car" }, "Cancel")}
          </Button>
          <Button
            type="submit"
            {...form.saveButtonProps}
            onClick={(event) => {
              mutation.reset();
              form.saveButtonProps.onClick(event);
            }}
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
  form,
  mode,
  validatesExpectedReturn,
  chargeCalculation,
  onManualTotalChange,
  onRecalculate,
  translate,
}: {
  config: CarResourceConfig;
  fieldName: string;
  form: UseFormReturn<Record<string, unknown>>;
  mode: "create" | "edit";
  validatesExpectedReturn: boolean;
  chargeCalculation: RentalChargeCalculation | null;
  onManualTotalChange?: () => void;
  onRecalculate: () => void;
  translate: ReturnType<typeof useTranslate>;
}) {
  const field = config.fields.find((item) => item.name === fieldName);
  if (!field) return null;

  const control = form.control;
  const label = resolveCarLabel(field.title, field.title, translate);
  const placeholder = translate(
    "car.form.placeholder",
    { ns: "car" },
    "Enter"
  );
  const requiredRules = field.required
    ? {
        required: translate(
          "car.validation.required",
          { ns: "car" },
          "Required"
        ),
      }
    : undefined;
  const rules =
    validatesExpectedReturn && field.name === "expected_return"
      ? {
          ...requiredRules,
          validate: (value: unknown) =>
            isExpectedReturnAfterPickup(
              form.getValues("pickup_time"),
              value
            ) ||
            translate(
              "car.validation.returnAfterPickup",
              { ns: "car" },
              "Return time must be after pick-up time"
            ),
        }
      : requiredRules;
  const duplicateCheck = getDuplicateCheck(config.name, field.name);

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
        rules={rules}
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
        rules={rules}
        render={({ field: renderField }) => (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl
              render={
                <Textarea
                  {...renderField}
                  value={
                    renderField.value === null || renderField.value === undefined
                      ? ""
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

  if (field.kind === "number") {
    return (
      <FormField
        control={control}
        name={field.name}
        rules={rules}
        render={({ field: renderField }) => (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl
              render={
                <Input
                  {...renderField}
                  type="number"
                  value={
                    renderField.value === null || renderField.value === undefined
                      ? ""
                      : String(renderField.value)
                  }
                  onChange={(event) => {
                    onManualTotalChange?.();
                    renderField.onChange(
                      event.target.value === ""
                        ? null
                        : Number(event.target.value)
                    );
                  }}
                  placeholder={translate(
                    "car.form.numberPlaceholder",
                    { ns: "car" },
                    "0"
                  )}
                />
              }
            />
            <FormMessage />
            {chargeCalculation ? (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span>
                  {translate(
                    "car.form.chargeBasis",
                    {
                      ns: "car",
                      days: chargeCalculation.days,
                      dayUnit: translate(
                        chargeCalculation.days === 1
                          ? "car.form.day"
                          : "car.form.days",
                        { ns: "car" },
                        chargeCalculation.days === 1 ? "day" : "days"
                      ),
                      rate: formatMoney(chargeCalculation.rate),
                      total: formatMoney(chargeCalculation.total),
                    },
                    `${chargeCalculation.days} ${chargeCalculation.days === 1 ? "day" : "days"} × ${formatMoney(chargeCalculation.rate)} = ${formatMoney(chargeCalculation.total)}`
                  )}
                </span>
                <Button
                  type="button"
                  variant="link"
                  size="xs"
                  className="h-auto p-0"
                  onClick={onRecalculate}
                >
                  {translate(
                    "car.form.recalculate",
                    { ns: "car" },
                    "Recalculate"
                  )}
                </Button>
              </div>
            ) : null}
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
        rules={rules}
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
        rules={rules}
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
      rules={rules}
      render={({ field: renderField }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl
            render={
              <Input
                {...renderField}
                value={
                  renderField.value === null || renderField.value === undefined
                    ? ""
                    : String(renderField.value)
                }
                placeholder={placeholder}
              />
            }
          />
          <FormMessage />
          {mode === "create" && duplicateCheck ? (
            <DuplicateWarning
              resource={config.name}
              fieldName={field.name}
              labelField={duplicateCheck.labelField}
              subFields={duplicateCheck.subFields}
              control={control}
              isSubmitting={form.formState.isSubmitting}
              translate={translate}
            />
          ) : null}
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
  const [isOpen, setIsOpen] = useState(false);

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
        const hasValue = value !== null && value !== undefined && value !== "";
        return (
          <FormItem>
            <FormLabel>{fieldLabel}</FormLabel>
            <div className="relative">
              <Popover open={isOpen} onOpenChange={setIsOpen}>
                <FormControl
                  render={
                    <PopoverTrigger
                      render={
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={isOpen}
                          className="h-10 w-full min-w-0 justify-start"
                        />
                      }
                    >
                      <span
                        className={`min-w-0 flex-1 truncate text-start font-normal ${selected ? "" : "text-muted-foreground"} ${hasValue && !fieldRequired ? "pr-7" : ""}`}
                      >
                        {selected
                          ? renderRelationLabel(selected, relation)
                          : translate(
                              "car.form.relationPlaceholder",
                              { ns: "car" },
                              "Select"
                            )}
                      </span>
                      <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                    </PopoverTrigger>
                  }
                />
                <PopoverContent
                  className="w-(--anchor-width) min-w-56 p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput
                      placeholder={translate(
                        "car.form.relationSearch",
                        { ns: "car" },
                        "Search..."
                      )}
                    />
                    <CommandEmpty>
                      {translate(
                        "car.form.relationNoResults",
                        { ns: "car" },
                        "No records found."
                      )}
                    </CommandEmpty>
                    <CommandList>
                      {options.map((option) => {
                        const optionId = String(option.id);
                        const optionLabel = renderRelationLabel(
                          option,
                          relation
                        );
                        return (
                          <CommandItem
                            key={optionId}
                            value={`${optionLabel} ${optionId}`}
                            data-checked={optionId === String(value ?? "")}
                            onSelect={() => {
                              renderField.onChange(optionId);
                              setIsOpen(false);
                            }}
                          >
                            {optionLabel}
                          </CommandItem>
                        );
                      })}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {hasValue && !fieldRequired ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-1/2 right-8 -translate-y-1/2 text-muted-foreground"
                  aria-label={translate(
                    "car.form.relationClear",
                    { ns: "car" },
                    "Clear selection"
                  )}
                  onClick={() => {
                    renderField.onChange(null);
                    setIsOpen(false);
                  }}
                >
                  <X />
                </Button>
              ) : null}
            </div>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

function DuplicateWarning({
  resource,
  fieldName,
  labelField,
  subFields,
  control,
  isSubmitting,
  translate,
}: {
  resource: string;
  fieldName: string;
  labelField: string;
  subFields: string[];
  control: UseFormReturn["control"];
  isSubmitting: boolean;
  translate: ReturnType<typeof useTranslate>;
}) {
  const watchedValue = useWatch({ control, name: fieldName });
  const normalizedValue = String(watchedValue ?? "").trim();
  const [debouncedValue, setDebouncedValue] = useState("");

  useEffect(() => {
    if (!normalizedValue) {
      setDebouncedValue("");
      return;
    }
    const timeout = window.setTimeout(() => {
      setDebouncedValue(normalizedValue);
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [normalizedValue]);

  const isReady =
    Boolean(debouncedValue) &&
    debouncedValue === normalizedValue &&
    !isSubmitting;
  const { result } = useList<Record<string, unknown>>({
    resource,
    filters: [
      {
        field: fieldName,
        operator: "eq",
        value: debouncedValue,
      },
    ],
    pagination: { mode: "server", currentPage: 1, pageSize: 10 },
    queryOptions: { enabled: isReady, retry: false },
  });
  const firstMatch = result.data[0];

  if (!isReady || !firstMatch) return null;

  const matches = result.total ?? result.data.length;
  const matchLabel = renderRelationLabel(firstMatch, {
    resource,
    labelField,
    subFields,
  });
  const matchId = firstMatch.id;

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
      <span>
        {translate(
          "car.form.duplicateWarning",
          { ns: "car", matches, label: matchLabel },
          `Matching records (${matches}): ${matchLabel}`
        )}
      </span>
      {matchId !== null && matchId !== undefined ? (
        <a
          href={`/${resource}/show/${encodeURIComponent(String(matchId))}`}
          target="_blank"
          rel="noreferrer"
          className="font-medium underline underline-offset-4"
        >
          {translate("car.form.duplicateView", { ns: "car" }, "View")}
        </a>
      ) : null}
    </div>
  );
}

type RentalChargeCalculation = {
  days: number;
  rate: number;
  total: number;
};

function calculateRentalCharge(
  pickupValue: unknown,
  returnValue: unknown,
  rateValue: unknown
): RentalChargeCalculation | null {
  if (!pickupValue || !returnValue || rateValue === null || rateValue === "") {
    return null;
  }
  const pickup = new Date(String(pickupValue));
  const expectedReturn = new Date(String(returnValue));
  const rate = Number(rateValue);
  const duration = expectedReturn.getTime() - pickup.getTime();
  if (
    Number.isNaN(pickup.getTime()) ||
    Number.isNaN(expectedReturn.getTime()) ||
    !Number.isFinite(rate) ||
    duration <= 0
  ) {
    return null;
  }
  const days = Math.max(1, Math.ceil(duration / 86400000));
  return { days, rate, total: rate * days };
}

function isExpectedReturnAfterPickup(
  pickupValue: unknown,
  returnValue: unknown
): boolean {
  if (!pickupValue || !returnValue) return true;
  const pickup = new Date(String(pickupValue));
  const expectedReturn = new Date(String(returnValue));
  if (
    Number.isNaN(pickup.getTime()) ||
    Number.isNaN(expectedReturn.getTime())
  ) {
    return false;
  }
  return expectedReturn.getTime() > pickup.getTime();
}

function getDuplicateCheck(
  resource: string,
  fieldName: string
): { labelField: string; subFields: string[] } | null {
  if (resource === "scm_vehicles" && fieldName === "plate_number") {
    return { labelField: "plate_number", subFields: ["brand", "model"] };
  }
  if (
    resource === "scm_customers" &&
    (fieldName === "phone" || fieldName === "email")
  ) {
    return { labelField: "name", subFields: [fieldName] };
  }
  return null;
}

function groupFormFields(fields: CarFieldConfig[]): {
  ungrouped: CarFieldConfig[];
  sections: { title: string; fields: CarFieldConfig[] }[];
} {
  const ungrouped: CarFieldConfig[] = [];
  const sections: { title: string; fields: CarFieldConfig[] }[] = [];
  const sectionMap = new Map<string, CarFieldConfig[]>();

  for (const field of fields) {
    if (!field.section) {
      ungrouped.push(field);
      continue;
    }
    const sectionFields = sectionMap.get(field.section);
    if (sectionFields) {
      sectionFields.push(field);
      continue;
    }
    const nextSectionFields = [field];
    sectionMap.set(field.section, nextSectionFields);
    sections.push({ title: field.section, fields: nextSectionFields });
  }

  return { ungrouped, sections };
}

function getMutationErrorMessage(error: HttpError | null): string | null {
  const message = error?.message?.trim();
  if (message) return message;
  if (!error?.errors) return null;

  for (const value of Object.values(error.errors)) {
    if (typeof value === "string" && value.trim()) return value;
    if (Array.isArray(value)) {
      const item = value.find(
        (entry): entry is string => typeof entry === "string" && Boolean(entry.trim())
      );
      if (item) return item;
    }
    if (
      value &&
      typeof value === "object" &&
      "message" in value &&
      typeof value.message === "string"
    ) {
      return value.message;
    }
  }
  return null;
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
  return detail ? `${label} (${detail})` : label;
}
