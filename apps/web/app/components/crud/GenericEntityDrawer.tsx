"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Edit2, Trash2, AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export interface DrawerField<T> {
  label: string;
  render?: (item: T) => React.ReactNode;
  key?: keyof T;
}

export interface RelatedLink<T> {
  label: string;
  sublabel?: string;
  href: (item: T) => string;
  icon?: React.ReactNode;
}

export interface GenericEntityDetailInspectorProps<T> {
  title: string;
  subtitle?: string;
  item: T | null;
  icon?: React.ReactNode;
  fields: DrawerField<T>[];
  relatedLinks?: RelatedLink<T>[];
  extraContent?: React.ReactNode;
  onClose?: () => void;
  onEdit?: ((item: T) => void) | undefined;
  onDelete?: ((item: T) => void) | undefined;
  customActions?: React.ReactNode | ((item: T) => React.ReactNode);
  className?: string;
  emptyState?: React.ReactNode;
  headerActions?: React.ReactNode;
}

/**
 * Pure in-flow detail inspector component rendering the header (icon, title, subtitle, close button),
 * quick action toolbar, confirmation delete dialog, metadata fields grid, extra custom content,
 * related links, and footer.
 */
export function GenericEntityDetailInspector<T extends Record<string, any>>({
  title,
  subtitle,
  item,
  icon,
  fields,
  relatedLinks,
  extraContent,
  onClose,
  onEdit,
  onDelete,
  customActions,
  className = "",
  emptyState,
  headerActions,
}: GenericEntityDetailInspectorProps<T>) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!item) {
    if (emptyState) return <>{emptyState}</>;
    return (
      <div
        className={`h-full w-full flex flex-col items-center justify-center p-8 text-center bg-zinc-50/50 ${className}`}
      >
        <div className="w-10 h-10 rounded-xl bg-zinc-150 text-zinc-500 flex items-center justify-center mb-3">
          {icon || <AlertTriangle className="w-5 h-5 text-zinc-400" />}
        </div>
        <h3 className="text-sm font-semibold text-zinc-700">No record selected</h3>
        <p className="text-xs text-zinc-400 mt-1 max-w-xs">
          Select an item from the ledger table to inspect details and audit logs.
        </p>
      </div>
    );
  }

  return (
    <div className={`h-full w-full flex flex-col bg-white overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-5 border-b border-zinc-200/80 bg-zinc-50/60 flex items-start justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-zinc-100 text-zinc-700 border border-zinc-200/80 flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            {subtitle && (
              <span className="text-xs font-mono font-medium text-zinc-600 bg-zinc-100 border border-zinc-200/80 px-2 py-0.5 rounded-md inline-block truncate max-w-full">
                {subtitle}
              </span>
            )}
            <h2
              id="generic-drawer-title"
              className="text-base font-semibold text-zinc-900 mt-0.5 leading-snug truncate"
              title={title}
            >
              {title}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {headerActions}
          {onClose && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors duration-150 cursor-pointer"
              title="Close details"
              aria-label="Close details"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Action Toolbar */}
      {(onEdit || onDelete || customActions) && (
        <div className="px-5 py-2.5 bg-white border-b border-zinc-200/80 flex items-center justify-between gap-2 shrink-0 flex-wrap">
          <span className="text-xs font-medium text-zinc-500">
            Quick actions
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {typeof customActions === "function" ? customActions(item) : customActions}
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(item)}
                className="h-8 px-2.5 gap-1.5 text-xs font-medium text-zinc-700 border-zinc-200 hover:bg-zinc-50 rounded-lg transition-colors duration-150 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-zinc-500" />
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                className="h-8 px-2.5 gap-1.5 text-xs font-medium text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition-colors duration-150 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                Delete
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal overlay for deletion */}
      {confirmDelete && onDelete && (
        <div className="p-4 bg-rose-50 border-b border-rose-200/80 text-rose-900 shrink-0">
          <div className="flex items-center gap-2 mb-1.5 font-semibold text-xs text-rose-800">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            Confirm deletion
          </div>
          <p className="text-xs text-rose-700 mb-3">
            Are you sure you want to delete this record? This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(false)}
              className="h-7 px-2.5 text-xs text-zinc-700 hover:bg-white rounded-lg transition-colors duration-150 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setConfirmDelete(false);
                onDelete(item);
              }}
              className="h-7 px-2.5 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors duration-150 cursor-pointer"
            >
              Delete permanently
            </Button>
          </div>
        </div>
      )}

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="bg-zinc-50/50 border border-zinc-200/80 rounded-xl p-4 divide-y divide-zinc-200/60">
          {fields.map((field, idx) => {
            const value = field.render
              ? field.render(item)
              : field.key
              ? String(item[field.key] ?? "—")
              : "—";

            return (
              <div
                key={idx}
                className={`flex flex-col py-2.5 ${
                  idx === 0 ? "pt-0" : ""
                } ${idx === fields.length - 1 ? "pb-0" : ""}`}
              >
                <span className="text-xs font-medium text-zinc-500 mb-0.5">
                  {field.label}
                </span>
                <div className="text-xs font-semibold text-zinc-900 break-words">
                  {value}
                </div>
              </div>
            );
          })}
        </div>

        {/* Extra Inspector Content (Compound Sub-tables, Line Items, Audit logs) */}
        {extraContent && (
          <div className="pt-1">
            {extraContent}
          </div>
        )}

        {/* Related Categories Navigation Links */}
        {relatedLinks && relatedLinks.length > 0 && (
          <div className="pt-2 border-t border-zinc-200/80">
            <h4 className="text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-2.5">
              Related categories
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {relatedLinks.map((link, idx) => (
                <Link
                  key={idx}
                  href={link.href(item)}
                  className="flex items-center justify-between p-3 rounded-lg border border-zinc-200/80 bg-white hover:border-zinc-300 hover:bg-zinc-50/60 transition-colors duration-150 group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {link.icon && (
                      <div className="p-1.5 rounded-md bg-zinc-100 text-zinc-600 group-hover:bg-zinc-200 transition-colors duration-150 shrink-0">
                        {link.icon}
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-zinc-900 block truncate group-hover:text-zinc-700">
                        {link.label}
                      </span>
                      {link.sublabel && (
                        <span className="text-[11px] text-zinc-500 font-mono tabular-nums block truncate">
                          {link.sublabel}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-zinc-500 group-hover:text-zinc-900 font-medium shrink-0 ml-2 transition-colors duration-150">
                    <span>View</span>
                    <ArrowRight className="w-3 h-3 text-zinc-400 group-hover:text-zinc-700 transition-colors duration-150" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {onClose && (
        <div className="p-4 border-t border-zinc-200/80 bg-zinc-50/60 flex justify-end shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="h-8 px-3.5 text-xs font-medium text-zinc-700 border-zinc-200 bg-white hover:bg-zinc-50 rounded-lg transition-colors duration-150 cursor-pointer"
          >
            Close details
          </Button>
        </div>
      )}
    </div>
  );
}

export interface GenericEntityDrawerProps<T> {
  title: string;
  subtitle?: string;
  item: T | null;
  icon: React.ReactNode;
  fields: DrawerField<T>[];
  relatedLinks?: RelatedLink<T>[];
  extraContent?: React.ReactNode;
  onClose: () => void;
  onEdit?: ((item: T) => void) | undefined;
  onDelete?: ((item: T) => void) | undefined;
  customActions?: React.ReactNode | ((item: T) => React.ReactNode);
  mode?: "drawer" | "docked";
  className?: string;
  headerActions?: React.ReactNode;
}

/**
 * Slide-over drawer and in-flow inspector container with backwards-compatibility.
 * Supports `mode="drawer"` (default slide-out overlay modal) and `mode="docked"` (in-flow split-pane detail panel).
 */
export default function GenericEntityDrawer<T extends Record<string, any>>({
  title,
  subtitle,
  item,
  icon,
  fields,
  relatedLinks,
  extraContent,
  onClose,
  onEdit,
  onDelete,
  customActions,
  mode = "drawer",
  className,
  headerActions,
}: GenericEntityDrawerProps<T>) {
  const [mounted, setMounted] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Escape key listener & Focus Trap (only active when mode === "drawer")
  useEffect(() => {
    if (mode !== "drawer" || !item) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab" && drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    const prevActiveElement = document.activeElement as HTMLElement | null;
    const timer = setTimeout(() => {
      if (drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        }
      }
    }, 50);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
      prevActiveElement?.focus();
    };
  }, [mode, item, onClose]);

  if (!item) return null;

  // Docked mode: renders in-flow without backdrop or portal so it fits natively into split-pane containers
  if (mode === "docked") {
    return (
      <aside
        aria-label={`${title} Details`}
        className={`h-full w-full flex flex-col bg-white overflow-hidden ${className || ""}`}
      >
        <GenericEntityDetailInspector
          title={title}
          subtitle={subtitle}
          item={item}
          icon={icon}
          fields={fields}
          relatedLinks={relatedLinks}
          onClose={onClose}
          onEdit={onEdit}
          onDelete={onDelete}
          customActions={customActions}
          extraContent={extraContent}
          headerActions={headerActions}
        />
      </aside>
    );
  }

  // Drawer mode: renders slide-out modal with backdrop and portal
  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-150"
        onClick={onClose}
      />

      {/* Slide-out Drawer Panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="generic-drawer-title"
        className={`fixed inset-y-0 right-0 z-10 w-full sm:w-[460px] md:w-[480px] bg-white shadow-2xl border-l border-zinc-200/80 flex flex-col transform transition-transform duration-200 ease-out ${className || ""}`}
      >
        <GenericEntityDetailInspector
          title={title}
          subtitle={subtitle}
          item={item}
          icon={icon}
          fields={fields}
          relatedLinks={relatedLinks}
          onClose={onClose}
          onEdit={onEdit}
          onDelete={onDelete}
          customActions={customActions}
          extraContent={extraContent}
          headerActions={headerActions}
        />
      </div>
    </div>,
    document.body
  );
}

GenericEntityDrawer.displayName = "GenericEntityDrawer";
