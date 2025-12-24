import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { listen } from "@tauri-apps/api/event";
import { Download, Trash2, Loader2 } from "lucide-react";
import { commands, type ModelInfo } from "@/bindings";
import {
  getTranslatedModelName,
  getTranslatedModelDescription,
} from "../../lib/utils/modelTranslation";
import { formatModelSize } from "../../lib/utils/format";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "../ui/Select";
import { cn } from "@/lib/utils/cn";
import ModelSelectorDownloadProgress from "./ModelSelectorDownloadProgress";

interface ModelStateEvent {
  event_type: string;
  model_id?: string;
  model_name?: string;
  error?: string;
}

interface DownloadProgress {
  model_id: string;
  downloaded: number;
  total: number;
  percentage: number;
}

type ModelStatus =
  | "ready"
  | "loading"
  | "downloading"
  | "extracting"
  | "error"
  | "unloaded"
  | "none";

interface DownloadStats {
  startTime: number;
  lastUpdate: number;
  totalDownloaded: number;
  speed: number;
}

interface ModelSelectorProps {
  onError?: (error: string) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ onError }) => {
  const { t } = useTranslation();
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [currentModelId, setCurrentModelId] = useState<string>("");
  const [modelStatus, setModelStatus] = useState<ModelStatus>("unloaded");
  const [modelError, setModelError] = useState<string | null>(null);
  const [modelDownloadProgress, setModelDownloadProgress] = useState<
    Map<string, DownloadProgress>
  >(new Map());
  const [downloadStats, setDownloadStats] = useState<
    Map<string, DownloadStats>
  >(new Map());
  const [extractingModels, setExtractingModels] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    loadModels();
    loadCurrentModel();

    // Listen for model state changes
    const modelStateUnlisten = listen<ModelStateEvent>(
      "model-state-changed",
      (event) => {
        const { event_type, model_id, error } = event.payload;

        switch (event_type) {
          case "loading_started":
            setModelStatus("loading");
            setModelError(null);
            break;
          case "loading_completed":
            setModelStatus("ready");
            setModelError(null);
            if (model_id) setCurrentModelId(model_id);
            break;
          case "loading_failed":
            setModelStatus("error");
            setModelError(error || "Failed to load model");
            break;
          case "unloaded":
            setModelStatus("unloaded");
            setModelError(null);
            break;
        }
      },
    );

    // Listen for model download progress
    const downloadProgressUnlisten = listen<DownloadProgress>(
      "model-download-progress",
      (event) => {
        const progress = event.payload;
        setModelDownloadProgress((prev) => {
          const newMap = new Map(prev);
          newMap.set(progress.model_id, progress);
          return newMap;
        });
        setModelStatus("downloading");

        // Update download stats for speed calculation
        const now = Date.now();
        setDownloadStats((prev) => {
          const current = prev.get(progress.model_id);
          const newStats = new Map(prev);

          if (!current) {
            newStats.set(progress.model_id, {
              startTime: now,
              lastUpdate: now,
              totalDownloaded: progress.downloaded,
              speed: 0,
            });
          } else {
            const timeDiff = (now - current.lastUpdate) / 1000;
            const bytesDiff = progress.downloaded - current.totalDownloaded;

            if (timeDiff > 0.5) {
              const currentSpeed = bytesDiff / (1024 * 1024) / timeDiff;
              const validCurrentSpeed = Math.max(0, currentSpeed);
              const smoothedSpeed =
                current.speed > 0
                  ? current.speed * 0.8 + validCurrentSpeed * 0.2
                  : validCurrentSpeed;

              newStats.set(progress.model_id, {
                startTime: current.startTime,
                lastUpdate: now,
                totalDownloaded: progress.downloaded,
                speed: Math.max(0, smoothedSpeed),
              });
            }
          }

          return newStats;
        });
      },
    );

    // Listen for model download completion
    const downloadCompleteUnlisten = listen<string>(
      "model-download-complete",
      (event) => {
        const modelId = event.payload;
        setModelDownloadProgress((prev) => {
          const newMap = new Map(prev);
          newMap.delete(modelId);
          return newMap;
        });
        setDownloadStats((prev) => {
          const newStats = new Map(prev);
          newStats.delete(modelId);
          return newStats;
        });
        loadModels();

        setTimeout(async () => {
          const isRecording = await commands.isRecording();
          if (isRecording) {
            return;
          }
          loadCurrentModel();
          handleModelSelect(modelId);
        }, 500);
      },
    );

    // Listen for extraction events
    const extractionStartedUnlisten = listen<string>(
      "model-extraction-started",
      (event) => {
        const modelId = event.payload;
        setExtractingModels((prev) => new Set(prev.add(modelId)));
        setModelStatus("extracting");
      },
    );

    const extractionCompletedUnlisten = listen<string>(
      "model-extraction-completed",
      (event) => {
        const modelId = event.payload;
        setExtractingModels((prev) => {
          const next = new Set(prev);
          next.delete(modelId);
          return next;
        });
        loadModels();

        setTimeout(async () => {
          const isRecording = await commands.isRecording();
          if (isRecording) {
            return;
          }
          loadCurrentModel();
          handleModelSelect(modelId);
        }, 500);
      },
    );

    const extractionFailedUnlisten = listen<{
      model_id: string;
      error: string;
    }>("model-extraction-failed", (event) => {
      const modelId = event.payload.model_id;
      setExtractingModels((prev) => {
        const next = new Set(prev);
        next.delete(modelId);
        return next;
      });
      setModelError(`Failed to extract model: ${event.payload.error}`);
      setModelStatus("error");
    });

    return () => {
      modelStateUnlisten.then((fn) => fn());
      downloadProgressUnlisten.then((fn) => fn());
      downloadCompleteUnlisten.then((fn) => fn());
      extractionStartedUnlisten.then((fn) => fn());
      extractionCompletedUnlisten.then((fn) => fn());
      extractionFailedUnlisten.then((fn) => fn());
    };
  }, []);

  const loadModels = async () => {
    try {
      const result = await commands.getAvailableModels();
      if (result.status === "ok") {
        setModels(result.data);
      }
    } catch (err) {
      console.error("Failed to load models:", err);
    }
  };

  const loadCurrentModel = async () => {
    try {
      const result = await commands.getCurrentModel();
      if (result.status === "ok") {
        const current = result.data;
        setCurrentModelId(current);

        if (current) {
          const statusResult = await commands.getTranscriptionModelStatus();
          if (statusResult.status === "ok") {
            const transcriptionStatus = statusResult.data;
            if (transcriptionStatus === current) {
              setModelStatus("ready");
            } else {
              setModelStatus("unloaded");
            }
          }
        } else {
          setModelStatus("none");
        }
      }
    } catch (err) {
      console.error("Failed to load current model:", err);
      setModelStatus("error");
      setModelError("Failed to check model status");
    }
  };

  const handleModelSelect = async (modelId: string) => {
    // Check if this is a downloadable model
    const model = models.find((m) => m.id === modelId);
    if (model && !model.is_downloaded) {
      // Trigger download instead of select
      handleModelDownload(modelId);
      return;
    }

    try {
      setCurrentModelId(modelId);
      setModelError(null);
      const result = await commands.setActiveModel(modelId);
      if (result.status === "error") {
        const errorMsg = result.error;
        setModelError(errorMsg);
        setModelStatus("error");
        onError?.(errorMsg);
      }
    } catch (err) {
      const errorMsg = `${err}`;
      setModelError(errorMsg);
      setModelStatus("error");
      onError?.(errorMsg);
    }
  };

  const handleModelDownload = async (modelId: string) => {
    try {
      setModelError(null);
      const result = await commands.downloadModel(modelId);
      if (result.status === "error") {
        const errorMsg = result.error;
        setModelError(errorMsg);
        setModelStatus("error");
        onError?.(errorMsg);
      }
    } catch (err) {
      const errorMsg = `${err}`;
      setModelError(errorMsg);
      setModelStatus("error");
      onError?.(errorMsg);
    }
  };

  const handleModelDelete = async (e: React.MouseEvent, modelId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const result = await commands.deleteModel(modelId);
    if (result.status === "ok") {
      await loadModels();
      setModelError(null);
    }
  };

  const getCurrentModel = () => {
    return models.find((m) => m.id === currentModelId);
  };

  const getStatusColor = (status: ModelStatus): string => {
    switch (status) {
      case "ready":
        return "bg-chart-2";
      case "loading":
        return "bg-chart-3 animate-pulse";
      case "downloading":
        return "bg-primary animate-pulse";
      case "extracting":
        return "bg-chart-3 animate-pulse";
      case "error":
        return "bg-destructive";
      case "unloaded":
        return "bg-muted-foreground/60";
      case "none":
        return "bg-destructive";
      default:
        return "bg-muted-foreground/60";
    }
  };

  const getDisplayValue = (): string => {
    if (extractingModels.size > 0) {
      return t("modelSelector.extractingGeneric");
    }

    if (modelDownloadProgress.size > 0) {
      const [progress] = Array.from(modelDownloadProgress.values());
      const percentage = Math.max(
        0,
        Math.min(100, Math.round(progress.percentage)),
      );
      return t("modelSelector.downloading", { percentage });
    }

    const currentModel = getCurrentModel();

    switch (modelStatus) {
      case "loading":
        return currentModel
          ? t("modelSelector.loading", {
              modelName: getTranslatedModelName(currentModel, t),
            })
          : t("modelSelector.loadingGeneric");
      case "error":
        return modelError || t("modelSelector.modelError");
      case "none":
        return t("modelSelector.noModelDownloadRequired");
      default:
        return currentModel
          ? getTranslatedModelName(currentModel, t)
          : t("modelSelector.modelUnloaded");
    }
  };

  const availableModels = models.filter((m) => m.is_downloaded);
  const downloadableModels = models.filter((m) => !m.is_downloaded);
  const isFirstRun = availableModels.length === 0 && models.length > 0;

  return (
    <>
      <div className="flex items-center gap-3">
        <Select value={currentModelId} onValueChange={handleModelSelect}>
          <SelectTrigger className="w-auto min-w-[180px] border-none shadow-none bg-transparent px-0 gap-2 focus:ring-0">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-2 h-2 rounded-full",
                  getStatusColor(modelStatus),
                )}
              />
              <SelectValue placeholder={t("modelSelector.selectModel")}>
                {getDisplayValue()}
              </SelectValue>
            </div>
          </SelectTrigger>
          <SelectContent className="w-80">
            {isFirstRun && (
              <>
                <div className="px-3 py-2 bg-primary/10 border-b border-primary/20">
                  <div className="text-xs font-medium text-primary mb-1">
                    {t("modelSelector.welcome")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("modelSelector.downloadPrompt")}
                  </div>
                </div>
              </>
            )}

            {availableModels.length > 0 && (
              <SelectGroup>
                <SelectLabel>{t("modelSelector.availableModels")}</SelectLabel>
                {availableModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-start justify-between w-full gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm">
                          {getTranslatedModelName(model, t)}
                        </div>
                        <div className="text-xs text-muted-foreground/60 italic">
                          {getTranslatedModelDescription(model, t)}
                        </div>
                      </div>
                      {currentModelId !== model.id && (
                        <button
                          onPointerDown={(e) => {
                            handleModelDelete(e, model.id);
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          className="absolute right-2 text-destructive hover:text-destructive/80 p-1 hover:bg-destructive/10 rounded transition-colors shrink-0 mt-0.5"
                          title={t("modelSelector.deleteModel", {
                            modelName: getTranslatedModelName(model, t),
                          })}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            )}

            {availableModels.length > 0 && downloadableModels.length > 0 && (
              <SelectSeparator />
            )}

            {downloadableModels.length > 0 && (
              <SelectGroup>
                <SelectLabel>
                  {isFirstRun
                    ? t("modelSelector.chooseModel")
                    : t("modelSelector.downloadModels")}
                </SelectLabel>
                {downloadableModels.map((model) => {
                  const isDownloading = modelDownloadProgress.has(model.id);
                  const progress = modelDownloadProgress.get(model.id);

                  return (
                    <SelectItem
                      key={model.id}
                      value={model.id}
                      disabled={isDownloading}
                      className="pr-24"
                    >
                      <div className="flex items-start justify-between w-full gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm flex flex-wrap items-center gap-1">
                            <span>{getTranslatedModelName(model, t)}</span>
                            {model.id === "parakeet-tdt-0.6b-v3" &&
                              isFirstRun && (
                                <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded shrink-0">
                                  {t("onboarding.recommended")}
                                </span>
                              )}
                          </div>
                          <div className="text-xs text-muted-foreground/60 italic">
                            {getTranslatedModelDescription(model, t)}
                          </div>
                          <div className="text-xs text-muted-foreground tabular-nums">
                            {formatModelSize(Number(model.size_mb))}
                          </div>
                        </div>
                        <div className="absolute right-2 text-xs text-primary tabular-nums shrink-0 mt-0.5">
                          {isDownloading && progress ? (
                            <div className="flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>
                                {Math.max(
                                  0,
                                  Math.min(
                                    100,
                                    Math.round(progress.percentage),
                                  ),
                                )}
                                %
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Download className="w-3 h-3" />
                              <span>{t("modelSelector.download")}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            )}

            {availableModels.length === 0 &&
              downloadableModels.length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  {t("modelSelector.noModelsAvailable")}
                </div>
              )}
          </SelectContent>
        </Select>
      </div>

      <ModelSelectorDownloadProgress
        downloadProgress={modelDownloadProgress}
        downloadStats={downloadStats}
      />
    </>
  );
};

export default ModelSelector;
