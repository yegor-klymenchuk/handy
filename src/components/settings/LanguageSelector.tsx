import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { listen } from "@tauri-apps/api/event";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "../ui/Button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/Popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/Command";
import { SettingContainer } from "../ui/SettingContainer";
import { ResetButton } from "../ui/ResetButton";
import { useSettings } from "../../hooks/useSettings";
import { useModels } from "../../hooks/useModels";
import { LANGUAGES } from "../../lib/constants/languages";
import { cn } from "@/lib/utils/cn";

interface LanguageSelectorProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
}

const unsupportedModels = ["parakeet-tdt-0.6b-v2", "parakeet-tdt-0.6b-v3"];

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  descriptionMode = "tooltip",
  grouped = false,
}) => {
  const { t } = useTranslation();
  const { getSetting, updateSetting, resetSetting, isUpdating } = useSettings();
  const { currentModel, loadCurrentModel } = useModels();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedLanguage = getSetting("selected_language") || "auto";
  const isUnsupported = unsupportedModels.includes(currentModel);

  // Listen for model state changes to update UI reactively
  useEffect(() => {
    const modelStateUnlisten = listen("model-state-changed", () => {
      loadCurrentModel();
    });

    return () => {
      modelStateUnlisten.then((fn) => fn());
    };
  }, [loadCurrentModel]);

  const selectedLanguageName = isUnsupported
    ? t("settings.general.language.auto")
    : LANGUAGES.find((lang) => lang.value === selectedLanguage)?.label ||
      t("settings.general.language.auto");

  const handleLanguageSelect = async (languageCode: string) => {
    await updateSetting("selected_language", languageCode);
    setIsOpen(false);
  };

  const handleReset = async () => {
    await resetSetting("selected_language");
  };

  const filteredLanguages = useMemo(
    () =>
      LANGUAGES.filter((language) =>
        language.label.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [searchQuery],
  );

  const isDisabled = isUpdating("selected_language") || isUnsupported;

  return (
    <SettingContainer
      title={t("settings.general.language.title")}
      description={
        isUnsupported
          ? t("settings.general.language.descriptionUnsupported")
          : t("settings.general.language.description")
      }
      descriptionMode={descriptionMode}
      grouped={grouped}
      disabled={isUnsupported}
    >
      <div className="flex items-center space-x-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={isOpen}
              disabled={isDisabled}
              className="min-w-[200px] justify-between"
            >
              <span className="truncate">{selectedLanguageName}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                value={searchQuery}
                onValueChange={(value) => setSearchQuery(value)}
                placeholder={t("settings.general.language.searchPlaceholder")}
              />
              <CommandList>
                <CommandEmpty>
                  {t("settings.general.language.noResults")}
                </CommandEmpty>
                <CommandGroup>
                  {filteredLanguages.map((language) => (
                    <CommandItem
                      key={language.value}
                      value={language.value}
                      onSelect={(currentValue) => {
                        handleLanguageSelect(currentValue);
                      }}
                    >
                      {language.label}
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          selectedLanguage === language.value
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <div>
          <ResetButton onClick={handleReset} disabled={isDisabled} />
        </div>
      </div>
    </SettingContainer>
  );
};
