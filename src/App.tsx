import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import "./App.css";
import { getCurrent, onOpenUrl } from "@tauri-apps/plugin-deep-link";
import AccessibilityPermissions from "./components/AccessibilityPermissions";
import Footer from "./components/footer";
import Onboarding from "./components/onboarding";
import { Sidebar, SidebarSection, SECTIONS_CONFIG } from "./components/Sidebar";
import { SidebarProvider } from "./components/ui/Sidebar";
import { useSettings } from "./hooks/useSettings";
import { commands } from "@/bindings";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { deepLinks } from "./lib/utils/deepLinks";

const renderSettingsContent = (section: SidebarSection) => {
  const ActiveComponent =
    SECTIONS_CONFIG[section]?.component || SECTIONS_CONFIG.general.component;
  return <ActiveComponent />;
};

function App() {
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [currentSection, setCurrentSection] =
    useState<SidebarSection>("general");
  const { settings, updateSetting } = useSettings();

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  // Handle keyboard shortcuts for debug mode toggle
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+Shift+D (Windows/Linux) or Cmd+Shift+D (macOS)
      const isDebugShortcut =
        event.shiftKey &&
        event.key.toLowerCase() === "d" &&
        (event.ctrlKey || event.metaKey);

      if (isDebugShortcut) {
        event.preventDefault();
        const currentDebugMode = settings?.debug_mode ?? false;
        updateSetting("debug_mode", !currentDebugMode);
      }
    };

    // Add event listener when component mounts
    document.addEventListener("keydown", handleKeyDown);

    // Cleanup event listener when component unmounts
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [settings?.debug_mode, updateSetting]);

  const checkOnboardingStatus = async () => {
    try {
      // Always check if they have any models available
      const result = await commands.hasAnyModelsAvailable();
      if (result.status === "ok") {
        setShowOnboarding(!result.data);
      } else {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error("Failed to check onboarding status:", error);
      setShowOnboarding(true);
    }
  };

  const handleModelSelected = () => {
    // Transition to main app - user has started a download
    setShowOnboarding(false);
  };

  useEffect(() => {
    getCurrent()
      .then(async (urls) => {
        if (urls && urls.length > 0) {
          await deepLinks.handle(urls[0]);
        }
      })
      .catch((err) => console.error("Failed to get initial URLs:", err));

      const unlisten = onOpenUrl(async (urls) => {
        await deepLinks.handle(urls[0]);
      });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  if (showOnboarding) {
    return <Onboarding onModelSelected={handleModelSelected} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-screen flex flex-col">
        <Toaster />
        {/* Main content area that takes remaining space */}
        <SidebarProvider
          defaultOpen={true}
          className="flex-1 overflow-hidden min-h-0"
        >
          <div className="flex h-full w-full overflow-hidden">
            <Sidebar
              activeSection={currentSection}
              onSectionChange={setCurrentSection}
            />
            {/* Scrollable content area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto">
                <div className="flex flex-col items-center p-6 gap-4">
                  <AccessibilityPermissions />
                  {renderSettingsContent(currentSection)}
                </div>
              </div>
            </div>
          </div>
        </SidebarProvider>
        {/* Fixed footer at bottom */}
        <Footer />
      </div>
    </QueryClientProvider>
  );
}

export default App;
