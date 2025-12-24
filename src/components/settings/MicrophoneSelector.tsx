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

interface MicrophoneSelectorProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
}

export const MicrophoneSelector: React.FC<MicrophoneSelectorProps> = React.memo(
  ({ descriptionMode = "tooltip", grouped = false }) => {
    const { t } = useTranslation();
    const {
      getSetting,
      updateSetting,
      resetSetting,
      isUpdating,
      isLoading,
      audioDevices,
      refreshAudioDevices,
    } = useSettings();

    const selectedMicrophone =
      getSetting("selected_microphone") === "default"
        ? "Default"
        : getSetting("selected_microphone") || "Default";

    const handleMicrophoneSelect = async (deviceName: string) => {
      await updateSetting("selected_microphone", deviceName);
    };

    const handleReset = async () => {
      await resetSetting("selected_microphone");
    };

    const handleOpenChange = (open: boolean) => {
      if (open) {
        refreshAudioDevices();
      }
    };

    const microphoneOptions = audioDevices.map((device) => ({
      value: device.name,
      label: device.name,
    }));

    const isDisabled =
      isUpdating("selected_microphone") ||
      isLoading ||
      audioDevices.length === 0;

    const placeholder =
      isLoading || audioDevices.length === 0
        ? t("settings.sound.microphone.loading")
        : t("settings.sound.microphone.placeholder");

    return (
      <SettingContainer
        title={t("settings.sound.microphone.title")}
        description={t("settings.sound.microphone.description")}
        descriptionMode={descriptionMode}
        grouped={grouped}
      >
        <div className="flex items-center space-x-2">
          <Select
            value={selectedMicrophone}
            onValueChange={handleMicrophoneSelect}
            onOpenChange={handleOpenChange}
            disabled={isDisabled}
          >
            <SelectTrigger className="min-w-[200px]">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {microphoneOptions.length === 0 ? (
                <div className="px-2 py-1.5 text-sm">
                  {t("common.noOptionsFound")}
                </div>
              ) : (
                microphoneOptions.map((option) => (
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
              disabled={isUpdating("selected_microphone") || isLoading}
            />
          </div>
        </div>
      </SettingContainer>
    );
  },
);
