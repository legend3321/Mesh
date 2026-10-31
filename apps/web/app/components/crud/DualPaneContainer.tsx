"use client";

import React, { useState, useEffect, createContext, useContext } from "react";
import { createPortal } from "react-dom";
import { Group, Panel, Separator } from "react-resizable-panels";
import { Columns2, Maximize2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type DualPaneViewMode = "split" | "drawer";

export interface DualPaneContextValue {
  viewMode: DualPaneViewMode;
  setViewMode: (mode: DualPaneViewMode) => void;
  isOpen: boolean;
  onClose: () => void;
  toggleViewMode: () => void;
}

export const DualPaneContext = createContext<DualPaneContextValue | null>(null);

export function useDualPane(): DualPaneContextValue {
  const context = useContext(DualPaneContext);
  if (!context) {
    throw new Error("useDualPane must be used within a DualPaneContainer");
  }
  return context;
}

export interface DualPaneViewToggleProps {
  viewMode: DualPaneViewMode;
  onChange: (mode: DualPaneViewMode) => void;
  className?: string;
  size?: "sm" | "default";
}

/**
 * Segmented toggle control allowing users to switch between
 * Split View (in-flow docked master-detail) and Full Width / Drawer View.
 */
export function DualPaneViewToggle({
  viewMode,
  onChange,
  className,
  size = "sm",
}: DualPaneViewToggleProps) {
  const isSm = size === "sm";

  return (
    <div
      role="radiogroup"
      aria-label="Detail view mode toggle"
      className={cn(
        "inline-flex items-center rounded-lg border border-zinc-200/80 bg-zinc-100/90 p-0.5 text-xs font-medium text-zinc-600 select-none shrink-0",
        className
      )}
    >
      <button
        type="button"
        role="radio"
        aria-checked={viewMode === "split"}
        onClick={() => onChange("split")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md font-medium transition-colors duration-150 cursor-pointer",
          isSm ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
          viewMode === "split"
            ? "bg-white text-zinc-900 shadow-xs font-medium ring-1 ring-zinc-900/5"
            : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/50"
        )}
        title="Split View: In-flow docked master-detail triage"
      >
        <Columns2 className={cn("text-zinc-700 shrink-0", isSm ? "w-3.5 h-3.5" : "w-4 h-4")} strokeWidth={1.5} />
        <span>Split view</span>
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={viewMode === "drawer"}
        onClick={() => onChange("drawer")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md font-medium transition-colors duration-150 cursor-pointer",
          isSm ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
          viewMode === "drawer"
            ? "bg-white text-zinc-900 shadow-xs font-medium ring-1 ring-zinc-900/5"
            : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/50"
        )}
        title="Full Width: Standard ledger with slide-over drawer modal"
      >
        <Maximize2 className={cn("text-zinc-500 shrink-0", isSm ? "w-3.5 h-3.5" : "w-4 h-4")} strokeWidth={1.5} />
        <span>Full width</span>
      </button>
    </div>
  );
}

export interface DualPaneContainerProps {
  /**
   * Interactive master data grid or table (Left Pane).
   */
  leftPane?: React.ReactNode;
  children?: React.ReactNode;
  /**
   * Detail inspector or right pane content.
   * Accepts a ReactNode or a render function receiving the current mode and onClose callback.
   */
  rightPane?:
    | React.ReactNode
    | ((context: { mode: DualPaneViewMode; onClose: () => void }) => React.ReactNode);
  detailContent?:
    | React.ReactNode
    | ((context: { mode: DualPaneViewMode; onClose: () => void }) => React.ReactNode);
  /**
   * Whether the detail pane is currently open (e.g., an item is selected).
   */
  isOpen: boolean;
  /**
   * Callback invoked when closing or collapsing the right detail pane.
   */
  onClose: () => void;
  /**
   * Controlled view mode: "split" (docked master-detail) or "drawer" (full-width ledger + modal drawer).
   */
  viewMode?: DualPaneViewMode;
  /**
   * Default view mode when uncontrolled (defaults to "split").
   */
  defaultViewMode?: DualPaneViewMode;
  /**
   * Callback fired when the view mode is changed.
   */
  onViewModeChange?: (mode: DualPaneViewMode) => void;
  /**
   * Whether to display the built-in view mode toggle bar at top right.
   * Defaults to false (pages can render DualPaneViewToggle anywhere or set showViewToggle={true}).
   */
  showViewToggle?: boolean;
  /**
   * Optional title rendered in the toolbar.
   */
  title?: React.ReactNode;
  /**
   * Optional additional actions rendered in the toolbar.
   */
  headerActions?: React.ReactNode;
  /**
   * Optional custom styling class names.
   */
  className?: string;
  containerClassName?: string;
  leftPaneClassName?: string;
  rightPaneClassName?: string;
  separatorClassName?: string;
}

/**
 * Enterprise-grade in-flow dockable split-pane container using `react-resizable-panels`.
 *
 * - Left Pane: default size 65% (or 100% when no item is selected/open), minSize 35%. Renders live interactive data grid.
 * - Separator: Corporate divider with resize handle bar, hover/active styling (`bg-slate-200 hover:bg-blue-500`), cursor-col-resize, and WAI-ARIA compliance.
 * - Right Pane: default size 35%, minSize 20%, maxSize 65%. Renders detail inspector without ANY backdrop locking or modal overlay.
 * - Close button smoothly closes/collapses the right pane.
 * - Toggle for View Mode: Split View (docked in-flow master-detail) vs Full Width / Drawer View.
 */
export function DualPaneContainer({
  leftPane: explicitLeftPane,
  children,
  rightPane: explicitRightPane,
  detailContent,
  isOpen,
  onClose,
  viewMode: controlledViewMode,
  defaultViewMode = "split",
  onViewModeChange,
  showViewToggle = false,
  title,
  headerActions,
  className,
  containerClassName,
  leftPaneClassName,
  rightPaneClassName,
  separatorClassName,
}: DualPaneContainerProps) {
  const leftPane = explicitLeftPane ?? children;
  const rightPane = explicitRightPane ?? detailContent;
  const [internalViewMode, setInternalViewMode] = useState<DualPaneViewMode>(defaultViewMode);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeViewMode = controlledViewMode ?? internalViewMode;

  const handleViewModeChange = (newMode: DualPaneViewMode) => {
    if (controlledViewMode === undefined) {
      setInternalViewMode(newMode);
    }
    onViewModeChange?.(newMode);
  };

  const toggleViewMode = () => {
    handleViewModeChange(activeViewMode === "split" ? "drawer" : "split");
  };

  const contextValue: DualPaneContextValue = {
    viewMode: activeViewMode,
    setViewMode: handleViewModeChange,
    isOpen,
    onClose,
    toggleViewMode,
  };

  // Helper to render right pane content adapted for split vs drawer
  const renderRightContent = (mode: DualPaneViewMode) => {
    if (typeof rightPane === "function") {
      return rightPane({ mode, onClose });
    }

    if (React.isValidElement(rightPane)) {
      // If rightPane accepts a `mode` prop (such as GenericEntityDrawer), pass down "docked" or "drawer"
      const currentProps = rightPane.props as Record<string, any>;
      return React.cloneElement(rightPane as React.ReactElement<any>, {
        mode: mode === "split" ? "docked" : "drawer",
        onClose: currentProps.onClose || onClose,
      });
    }

    return rightPane;
  };

  // In drawer mode: if the right pane component does not handle its own portal (e.g. GenericEntityDetailInspector),
  // wrap it into a slide-over modal overlay portal.
  const renderDrawerOverlay = () => {
    if (!isOpen || !mounted) return null;

    const content = renderRightContent("drawer");

    // Check if the element already handles its own portal/drawer (e.g. GenericEntityDrawer with mode="drawer")
    const isSelfPortaled =
      React.isValidElement(content) &&
      ((content.type as any)?.displayName === "GenericEntityDrawer" ||
        (content.props as Record<string, any>)?.mode === "drawer");

    if (isSelfPortaled) {
      return content;
    }

    return createPortal(
      <div className="fixed inset-0 z-[100] overflow-hidden">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />

        {/* Slide-out Drawer Panel */}
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-y-0 right-0 z-10 w-full sm:w-[460px] md:w-[480px] bg-white shadow-2xl border-l border-slate-200 flex flex-col transform transition-transform duration-300 ease-in-out"
        >
          {content}
        </div>
      </div>,
      document.body
    );
  };

  return (
    <DualPaneContext.Provider value={contextValue}>
      <div className={cn("flex flex-col w-full h-full min-h-0", className)}>
        {/* Optional Header / View Mode Toggle Toolbar */}
        {(showViewToggle || title || headerActions) && (
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 gap-3 shrink-0 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              {title &&
                (typeof title === "string" ? (
                  <h3 className="text-base font-semibold text-slate-800 truncate">{title}</h3>
                ) : (
                  title
                ))}
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              {headerActions}
              {showViewToggle && (
                <DualPaneViewToggle
                  viewMode={activeViewMode}
                  onChange={handleViewModeChange}
                />
              )}
            </div>
          </div>
        )}

        {/* Master-Detail Body */}
        {activeViewMode === "split" && isOpen ? (
          <Group
            orientation="horizontal"
            className={cn("w-full h-full min-h-0 flex-1 overflow-hidden", containerClassName)}
          >
            {/* Left Pane: Interactive data grid (default size 65%, minSize 35%) */}
            <Panel
              id="master-left-pane"
              defaultSize="65%"
              minSize="35%"
              className={cn("h-full flex flex-col min-w-0 overflow-auto", leftPaneClassName)}
            >
              {leftPane}
            </Panel>

            {/* Separator: Corporate divider with resize handle bar, hover/active styling, WAI-ARIA compliance */}
            <Separator
              className={cn(
                "relative flex items-center justify-center w-2 shrink-0 select-none",
                "bg-zinc-200/80 hover:bg-zinc-400 active:bg-zinc-500",
                "transition-colors duration-150 cursor-col-resize group",
                "focus:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-400 z-10",
                separatorClassName
              )}
              aria-label="Resize master-detail panes"
            >
              <div
                className="w-1 h-8 rounded-full bg-zinc-400 group-hover:bg-white group-active:bg-white transition-colors pointer-events-none"
                aria-hidden="true"
              />
            </Separator>

            {/* Right Pane: Pure in-flow detail inspector without backdrop locking or modal overlay */}
            <Panel
              id="detail-right-pane"
              defaultSize="35%"
              minSize="20%"
              maxSize="65%"
              collapsible={true}
              collapsedSize="0%"
              onResize={(panelSize) => {
                // If user drags separator completely to collapse the right pane, invoke onClose
                if (panelSize.asPercentage === 0) {
                  onClose();
                }
              }}
              className={cn(
                "h-full flex flex-col min-w-0 overflow-hidden bg-white border-l border-zinc-200/80",
                rightPaneClassName
              )}
            >
              {renderRightContent("split")}
            </Panel>
          </Group>
        ) : (
          /* Single Full-Width Pane (When closed or when in Drawer mode) */
          <div className={cn("w-full h-full min-h-0 flex-1 overflow-auto", leftPaneClassName)}>
            {leftPane}
            {activeViewMode === "drawer" && renderDrawerOverlay()}
          </div>
        )}
      </div>
    </DualPaneContext.Provider>
  );
}

export default DualPaneContainer;
