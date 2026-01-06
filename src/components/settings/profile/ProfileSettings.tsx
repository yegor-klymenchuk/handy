import React from "react";
import { useTranslation } from "react-i18next";
import { SettingsGroup } from "../../ui/SettingsGroup";
import { SettingContainer } from "../../ui/SettingContainer";
import { Avatar, AvatarImage, AvatarFallback } from "../../ui/Avatar";
import { Button } from "../../ui/Button";
import { useSession } from "@/hooks/useSession";
import { useAuth } from "@/hooks/useAuth";
import { LogOut } from "lucide-react";
import { getInitials } from "@/lib/utils/getInitials";

export const ProfileSettings: React.FC = () => {
  const { t } = useTranslation();
  const { data: session, isLoading } = useSession();
  const { signIn, signOut } = useAuth();

  if (isLoading) {
    return (
      <div className="max-w-3xl w-full mx-auto space-y-6">
        <SettingsGroup title={t("settings.profile.title")}>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gray-200" />
              <div className="space-y-2">
                <div className="h-4 w-32 bg-gray-200 rounded" />
                <div className="h-3 w-48 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        </SettingsGroup>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="max-w-3xl w-full mx-auto space-y-6">
        <SettingsGroup title={t("settings.profile.title")}>
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <p className="text-mid-gray text-sm">
              {t("settings.profile.notSignedIn")}
            </p>
            <Button onClick={signIn}>{t("settings.profile.signIn")}</Button>
          </div>
        </SettingsGroup>
      </div>
    );
  }

  return (
    <div className="max-w-3xl w-full mx-auto space-y-6">
      <SettingsGroup title={t("settings.profile.title")}>
        <div className="flex flex-col items-center py-6 gap-4">
          <Avatar className="w-20 h-20">
            <AvatarImage src={session?.user.image || ""} alt={session?.user.name || "User avatar"} />
            <AvatarFallback className="text-xl font-semibold bg-primary/10 text-primary">
              {session?.user.name ? getInitials(session?.user.name) : "?"}
            </AvatarFallback>
          </Avatar>

          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900">
              {session?.user.name || t("settings.profile.unknownUser")}
            </h2>
            <p className="text-sm text-mid-gray">{session?.user.email}</p>
          </div>
        </div>

        <SettingContainer grouped={true}>
          <Button
            variant="secondary"
            size="sm"
            onClick={signOut}
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            {t("settings.profile.signOut")}
          </Button>
        </SettingContainer>
      </SettingsGroup>
    </div>
  );
};
