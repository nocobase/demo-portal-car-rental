import { FileText } from "lucide-react";

import { FilePreviewField } from "@/extensions/nocobase-file-upload";
import { FileUploadField } from "@/extensions/nocobase-file-upload";
import type {
  FileFieldDescriptor,
  FileUploadFieldValue,
} from "@/extensions/nocobase-file-upload";
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

export const getCarAttachmentDescriptor = (
  config: Pick<CarResourceConfig, "name">,
  fieldName: string
): FileFieldDescriptor => ({
  sourceCollection: config.name,
  fieldName,
  fileCollection: "files",
  dataSourceKey: "main",
  relation: "belongsToMany",
});

export function CarAttachmentInput({
  config,
  fieldName,
  value,
  onChange,
}: {
  config: CarResourceConfig;
  fieldName: string;
  value: FileUploadFieldValue;
  onChange: (value: FileUploadFieldValue) => void;
}) {
  return (
    <FileUploadField
      descriptor={getCarAttachmentDescriptor(config, fieldName)}
      value={value}
      onChange={onChange}
    />
  );
}

export function CarAttachmentValue({
  config,
  fieldName,
  record,
}: {
  config?: Pick<CarResourceConfig, "name">;
  fieldName: string;
  record?: Record<string, unknown>;
}) {
  const raw = record ? getNestedValue(record, fieldName) : undefined;
  const value = Array.isArray(raw) ? raw : raw ? [raw] : [];

  if (!value.length) {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <FileText className="size-3.5" />
        <span>-</span>
      </span>
    );
  }

  return (
    <FilePreviewField
      value={value as FileUploadFieldValue}
      descriptor={getCarAttachmentDescriptor(
        { name: config?.name ?? "scm_contracts" },
        fieldName
      )}
      size={36}
      showFileName
    />
  );
}
