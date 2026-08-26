import { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X, Copy } from "lucide-react";
import { LastSyncLine } from "./LastSyncLine";
import { AiStatusChip } from "@/components/ui/AiStatusChip";
import { BodyThemeSwitch } from "@/components/ui/BodyThemeSwitch";
import logoUrl from "@/assets/logo.svg";

const isMac = navigator.userAgent.includes("Macintosh");

export function TitleBar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    const appWindow = getCurrentWindow();
    appWindow.isMaximized().then(setMaximized);

    // Listen for resize events to track maximize state
    let unlisten: (() => void) | undefined;
    appWindow.onResized(() => {
      appWindow.isMaximized().then(setMaximized);
    }).then((fn) => { unlisten = fn; });

    return () => { unlisten?.(); };
  }, []);

  const handleMinimize = () => getCurrentWindow().minimize();
  const handleMaximize = () => getCurrentWindow().toggleMaximize();
  const handleClose = () => getCurrentWindow().close();

  return (
    <div
      data-tauri-drag-region
      className="flex items-center justify-between h-9 bg-sidebar-bg border-b border-border-primary select-none shrink-0"
    >
      {/* Brand — left side (macOS keeps room for the traffic lights) */}
      <div
        data-tauri-drag-region
        className={`flex min-w-0 flex-1 items-center gap-2 ${isMac ? "pl-20" : "pl-4"}`}
      >
        <img src={logoUrl} alt="" aria-hidden="true" className="h-4 w-4 shrink-0 rounded-[5px]" />
        <span
          data-tauri-drag-region
          className="text-xs font-semibold tracking-wide text-sidebar-text"
        >
          Revelo
        </span>
      </div>

      {/* Status cluster — no drag region, these are controls */}
      <div className="flex shrink-0 items-center gap-1 pr-2">
        <BodyThemeSwitch />
        <AiStatusChip />
        <LastSyncLine collapsed={false} variant="titlebar" />
      </div>

      {/* Window controls — right side (hidden on macOS, uses native traffic lights) */}
      {!isMac && (
        <div className="flex items-center h-full">
          <button
            onClick={handleMinimize}
            className="h-full px-3.5 flex items-center justify-center text-sidebar-text/70 hover:bg-sidebar-hover transition-colors"
            title="Minimize"
          >
            <Minus size={14} />
          </button>
          <button
            onClick={handleMaximize}
            className="h-full px-3.5 flex items-center justify-center text-sidebar-text/70 hover:bg-sidebar-hover transition-colors"
            title={maximized ? "Restore" : "Maximize"}
          >
            {maximized ? <Copy size={12} /> : <Square size={12} />}
          </button>
          <button
            onClick={handleClose}
            className="h-full px-3.5 flex items-center justify-center text-sidebar-text/70 hover:bg-danger hover:text-white transition-colors"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
