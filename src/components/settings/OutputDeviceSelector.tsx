import React from "react";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/Select";
import { SettingContainer } from "../ui/SettingContainer";
import { ResetButton } from "../ui/ResetButton";
import { useSettings } from "../../hooks/useSettings";
import type { AudioDevice } from "@/bindings";

interface OutputDeviceSelectorProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
  disabled?: boolean;
}

export const OutputDeviceSelector: React.FC<OutputDeviceSelectorProps> =
  React.memo(
    ({ descriptionMode = "tooltip", grouped = false, disabled = false }) => {
      const { t } = useTranslation();
      const {
        getSetting,
        updateSetting,
        resetSetting,
        isUpdating,
        isLoading,
        outputDevices,
        refreshOutputDevices,
      } = useSettings();

      const selectedOutputDevice =
        getSetting("selected_output_device") === "default"
          ? "Default"
          : getSetting("selected_output_device") || "Default";

      const handleOutputDeviceSelect = async (deviceName: string) => {
        await updateSetting("selected_output_device", deviceName);
      };

      const handleReset = async () => {
        await resetSetting("selected_output_device");
      };

      const handleOpenChange = (open: boolean) => {
        if (open) {
          refreshOutputDevices();
        }
      };

      const outputDeviceOptions = outputDevices.map((device: AudioDevice) => ({
        value: device.name,
        label: device.name,
      }));

      const isDisabled =
        disabled ||
        isUpdating("selected_output_device") ||
        isLoading ||
        outputDevices.length === 0;

      const placeholder =
        isLoading || outputDevices.length === 0
          ? t("settings.sound.outputDevice.loading")
          : t("settings.sound.outputDevice.placeholder");

      return (
        <SettingContainer
          title={t("settings.sound.outputDevice.title")}
          description={t("settings.sound.outputDevice.description")}
          descriptionMode={descriptionMode}
          grouped={grouped}
          disabled={disabled}
        >
          <div className="flex items-center space-x-2">
            <Select
              value={selectedOutputDevice}
              onValueChange={handleOutputDeviceSelect}
              onOpenChange={handleOpenChange}
              disabled={isDisabled}
            >
              <SelectTrigger className="min-w-[200px]">
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {outputDeviceOptions.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm">
                    {t("common.noOptionsFound")}
                  </div>
                ) : (
                  outputDeviceOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <div>
              <ResetButton
                onClick={handleReset}
                disabled={
                  disabled || isUpdating("selected_output_device") || isLoading
                }
              />
            </div>
          </div>
        </SettingContainer>
      );
    },
  );
