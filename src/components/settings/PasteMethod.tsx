import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { type as getOsType } from "@tauri-apps/plugin-os";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/Select";
import { SettingContainer } from "../ui/SettingContainer";
import { useSettings } from "../../hooks/useSettings";
import type { PasteMethod } from "@/bindings";

interface PasteMethodProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
}

export const PasteMethodSetting: React.FC<PasteMethodProps> = React.memo(
  ({ descriptionMode = "tooltip", grouped = false }) => {
    const { t } = useTranslation();
    const { getSetting, updateSetting, isUpdating } = useSettings();
    const [osType, setOsType] = useState<string>("unknown");

    const getPasteMethodOptions = (osType: string) => {
      const mod = osType === "macos" ? "Cmd" : "Ctrl";

      const options = [
        {
          value: "ctrl_v",
          label: t("settings.advanced.pasteMethod.options.clipboard", {
            modifier: mod,
          }),
        },
        {
          value: "direct",
          label: t("settings.advanced.pasteMethod.options.direct"),
        },
        {
          value: "none",
          label: t("settings.advanced.pasteMethod.options.none"),
        },
      ];

      // Add Shift+Insert and Ctrl+Shift+V options for Windows and Linux only
      if (osType === "windows" || osType === "linux") {
        options.push(
          {
            value: "ctrl_shift_v",
            label: t(
              "settings.advanced.pasteMethod.options.clipboardCtrlShiftV",
            ),
          },
          {
            value: "shift_insert",
            label: t(
              "settings.advanced.pasteMethod.options.clipboardShiftInsert",
            ),
          },
        );
      }

      return options;
    };

    useEffect(() => {
      setOsType(getOsType());
    }, []);

    const selectedMethod = (getSetting("paste_method") ||
      "ctrl_v") as PasteMethod;

    const pasteMethodOptions = getPasteMethodOptions(osType);

    return (
      <SettingContainer
        title={t("settings.advanced.pasteMethod.title")}
        description={t("settings.advanced.pasteMethod.description")}
        descriptionMode={descriptionMode}
        grouped={grouped}
        tooltipPosition="bottom"
      >
        <Select
          value={selectedMethod}
          onValueChange={(value) =>
            updateSetting("paste_method", value as PasteMethod)
          }
          disabled={isUpdating("paste_method")}
        >
          <SelectTrigger className="min-w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pasteMethodOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingContainer>
    );
  },
);
