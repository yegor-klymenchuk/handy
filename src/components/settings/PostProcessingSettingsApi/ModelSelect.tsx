import React from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronsUpDown } from "lucide-react";
import type { Option } from "@/lib/utils/option";
import { Button } from "../../ui/Button";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/Popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../ui/Command";
import { cn } from "@/lib/utils/cn";

type ModelSelectProps = {
  value: string;
  options: Option[];
  disabled?: boolean;
  placeholder?: string;
  isLoading?: boolean;
  onSelect: (value: string) => void;
  onCreate: (value: string) => void;
  onBlur: () => void;
  className?: string;
};

export const ModelSelect: React.FC<ModelSelectProps> = React.memo(
  ({
    value,
    options,
    disabled,
    placeholder,
    isLoading,
    onSelect,
    onCreate,
    onBlur,
    className = "flex-1 min-w-[360px]",
  }) => {
    const { t } = useTranslation();
    const [open, setOpen] = React.useState(false);
    const [searchValue, setSearchValue] = React.useState("");

    const selectedOption = options.find((opt) => opt.value === value);

    // Filter options based on search (for creatable functionality)
    const filteredOptions = React.useMemo(() => {
      if (!searchValue) return options;
      return options.filter((option) =>
        option.label.toLowerCase().includes(searchValue.toLowerCase()),
      );
    }, [options, searchValue]);

    // Check if we should show "Create" option
    const shouldShowCreate =
      searchValue.trim() &&
      !options.some(
        (opt) => opt.value.toLowerCase() === searchValue.trim().toLowerCase(),
      );

    const handleSelect = (selectedValue: string) => {
      if (selectedValue.startsWith("__create__:")) {
        const customValue = selectedValue.replace("__create__:", "");
        onCreate(customValue);
        setSearchValue("");
        setOpen(false);
      } else {
        onSelect(selectedValue === value ? "" : selectedValue);
        setOpen(false);
      }
    };

    const handleOpenChange = (newOpen: boolean) => {
      setOpen(newOpen);
      if (!newOpen) {
        setSearchValue("");
        onBlur();
      }
    };

    return (
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || isLoading}
            className={cn("justify-between", className)}
          >
            <span className="truncate">
              {isLoading
                ? "Loading..."
                : selectedOption?.label ||
                  value ||
                  placeholder ||
                  "Select a model..."}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className={cn("p-0", className)} align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search or type to create..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>
                {shouldShowCreate
                  ? null
                  : t("common.noOptionsFound") || "No model found."}
              </CommandEmpty>
              <CommandGroup>
                {/* Create new option */}
                {shouldShowCreate && (
                  <CommandItem
                    value={`__create__:${searchValue.trim()}`}
                    onSelect={handleSelect}
                    className="font-semibold"
                  >
                    <Check className="mr-2 h-4 w-4 opacity-0" />
                    {t("common.use")} "{searchValue.trim()}"
                  </CommandItem>
                )}

                {/* Existing options */}
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={handleSelect}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  },
);

ModelSelect.displayName = "ModelSelect";
