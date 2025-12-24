import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/Select";
import type { Option } from "@/lib/utils/option";

interface ProviderSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const ProviderSelect: React.FC<ProviderSelectProps> = React.memo(
  ({ options, value, onChange, disabled }) => {
    return (
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="flex-1 min-w-[240px]">
          <SelectValue placeholder="Select a provider..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  },
);

ProviderSelect.displayName = "ProviderSelect";
