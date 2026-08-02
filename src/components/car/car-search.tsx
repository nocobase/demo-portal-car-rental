import { Search, X } from "lucide-react";
import { useState } from "react";
import { useTranslate } from "@refinedev/core";

import { InputGroup, InputGroupInput } from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";

export function CarSearchBar({
  placeholder,
  onSearch,
}: {
  placeholder: string;
  onSearch: (value: string) => void;
}) {
  const translate = useTranslate();
  const [value, setValue] = useState("");

  const handleChange = (next: string) => {
    setValue(next);
    onSearch(next);
  };

  return (
    <div className="flex w-full max-w-md items-center">
      <InputGroup>
        <Search className="pointer-events-none ml-2 size-4 shrink-0 text-muted-foreground" />
        <InputGroupInput
          value={value}
          onChange={(event) => handleChange(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
        />
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="mr-1"
            aria-label={translate(
              "car.search.clear",
              { ns: "car" },
              "Clear search"
            )}
            onClick={() => handleChange("")}
          >
            <X />
          </Button>
        ) : null}
      </InputGroup>
    </div>
  );
}
