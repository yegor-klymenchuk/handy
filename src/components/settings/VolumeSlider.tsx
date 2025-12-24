import React from "react";
import { useTranslation } from "react-i18next";
import { Slider } from "../ui/Slider";
import { useSettings } from "../../hooks/useSettings";
import { SettingContainer } from "../ui";

export const VolumeSlider: React.FC<{ disabled?: boolean }> = ({
  disabled = false,
}) => {
  const { t } = useTranslation();
  const { getSetting, updateSetting } = useSettings();
  const audioFeedbackVolume = getSetting("audio_feedback_volume") ?? 0.5;

  const volumePercentage = Math.round(audioFeedbackVolume * 100);

  const handleVolumeChange = (value: number[]) => {
    const volumeValue = value[0] / 100;
    updateSetting("audio_feedback_volume", volumeValue);
  };

  return (
    <SettingContainer
      title={t("settings.sound.volume.title")}
      description={t("settings.sound.volume.description")}
      descriptionMode="tooltip"
      grouped={true}
      layout="horizontal"
      disabled={disabled}
    >
      <div className="w-full flex items-center gap-2">
        <Slider
          value={[volumePercentage]}
          onValueChange={handleVolumeChange}
          min={0}
          max={100}
          step={1}
          disabled={disabled}
          className="min-w-[195px]"
        />
        <span className="text-sm font-medium min-w-10 text-right">
          {volumePercentage}%
        </span>
      </div>
    </SettingContainer>
  );
};
