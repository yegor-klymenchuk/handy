import React from "react";
import { useTranslation } from "react-i18next";
import {
  Cog,
  FlaskConical,
  History,
  Info,
  LogIn,
  Sparkles,
  User,
} from "lucide-react";
import { InseroIcon } from "./icons/InseroIcon";
import { useSettings } from "../hooks/useSettings";
import { useUser } from "../hooks/useUser";
import {
  GeneralSettings,
  AdvancedSettings,
  HistorySettings,
  DebugSettings,
  AboutSettings,
  PostProcessingSettings,
  ProfileSettings,
} from "./settings";
import {
  Sidebar as SidebarUI,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  SidebarFooter,
} from "./ui/Sidebar";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/Avatar";
import { getInitials } from "@/lib/utils/getInitials";
import { Button } from "./ui/Button";
import { useAuth } from "@/hooks/useAuth";

export type SidebarSection = keyof typeof SECTIONS_CONFIG;

interface IconProps {
  width?: number | string;
  height?: number | string;
  size?: number | string;
  className?: string;
  [key: string]: any;
}

interface SectionConfig {
  labelKey: string;
  icon: React.ComponentType<IconProps>;
  component: React.ComponentType;
  enabled: (settings: any) => boolean;
}

export const SECTIONS_CONFIG = {
  general: {
    labelKey: "sidebar.general",
    icon: InseroIcon,
    component: GeneralSettings,
    enabled: () => true,
  },
  advanced: {
    labelKey: "sidebar.advanced",
    icon: Cog,
    component: AdvancedSettings,
    enabled: () => true,
  },
  postprocessing: {
    labelKey: "sidebar.postProcessing",
    icon: Sparkles,
    component: PostProcessingSettings,
    enabled: (settings) => settings?.post_process_enabled ?? false,
  },
  history: {
    labelKey: "sidebar.history",
    icon: History,
    component: HistorySettings,
    enabled: () => true,
  },
  debug: {
    labelKey: "sidebar.debug",
    icon: FlaskConical,
    component: DebugSettings,
    enabled: (settings) => settings?.debug_mode ?? false,
  },
  about: {
    labelKey: "sidebar.about",
    icon: Info,
    component: AboutSettings,
    enabled: () => true,
  },
  profile: {
    labelKey: "sidebar.profile",
    icon: User,
    component: ProfileSettings,
    enabled: () => true,
  },
} as const satisfies Record<string, SectionConfig>;

interface SidebarProps {
  activeSection: SidebarSection;
  onSectionChange: (section: SidebarSection) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSectionChange,
}) => {
  const { t } = useTranslation();

  const { signIn } = useAuth();
  const { data: user } = useUser();
  const { settings } = useSettings();

  const availableSections = Object.entries(SECTIONS_CONFIG)
    .filter(([id, config]) => id !== "profile" && config.enabled(settings))
    .map(([id, config]) => ({ id: id as SidebarSection, ...config }));

  console.log(user);

  return (
    <SidebarUI
      collapsible="none"
      className="min-w-48 bg-white border-r border-mid-gray/20 p-3"
    >
      <SidebarContent>
        <SidebarMenu>
          {availableSections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;

            return (
              <SidebarMenuItem key={section.id}>
                <SidebarMenuButton
                  onClick={() => onSectionChange(section.id)}
                  isActive={isActive}
                  title={t(section.labelKey)}
                  className="h-10"
                >
                  <div>
                    <Icon width={16} height={16} className="shrink-0" />
                  </div>
                  <span className="font-medium truncate">
                    {t(section.labelKey)}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarSeparator className="mb-2" />
        <SidebarMenu>
          <SidebarMenuItem>
            {user ? (
              <SidebarMenuButton
                onClick={() => onSectionChange("profile")}
                title={user.name}
                className="h-10"
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage
                    src={user?.image || ""}
                    alt={user.name || "User avatar"}
                  />
                  <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                    {user.name ? getInitials(user.name) : "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium truncate">{user.name}</span>
              </SidebarMenuButton>
            ) : (
              <Button className="w-full gap-3" onClick={signIn}>
                <LogIn className="w-4 h-4" />
                {t("settings.profile.signIn")}
              </Button>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </SidebarUI>
  );
};
