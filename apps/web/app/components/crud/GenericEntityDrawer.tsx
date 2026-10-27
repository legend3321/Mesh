"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Edit2, Trash2, AlertTriangle } from "lucide-react";
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

interface GenericEntityDrawerProps<T> {
  title: string;
  subtitle?: string;
  item: T | null;
  icon: React.ReactNode;
  fields: DrawerField<T>[];
  relatedLinks?: RelatedLink<T>[];
  onClose: () => void;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
}

export default function GenericEntityDrawer<T extends Record<string, any>>({
  title,
  subtitle,
  item,
  icon,
  fields,
  relatedLinks,
  onClose,
  onEdit,
  onDelete,
}: GenericEntityDrawerProps<T>) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!item || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-out Drawer Panel */}
      <aside className="fixed inset-y-0 right-0 z-10 w-full sm:w-[460px] md:w-[480px] bg-white shadow-2xl border-l border-slate-200 flex flex-col transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              {icon}
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                {subtitle || "Details"}
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-1 leading-snug">
                {title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">
            Quick Actions
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(item)}
              className="h-8 gap-1.5 text-xs font-medium text-slate-700 border-slate-200 hover:bg-slate-50"
            >
              <Edit2 className="w-3.5 h-3.5 text-blue-600" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              className="h-8 gap-1.5 text-xs font-medium text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
              Delete
            </Button>
          </div>
        </div>

        {/* Confirmation Modal overlay for deletion */}
        {confirmDelete && (
          <div className="p-4 bg-red-50 border-b border-red-200 text-red-900">
            <div className="flex items-center gap-2 mb-2 font-semibold text-sm">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Confirm Delete
            </div>
            <p className="text-xs text-red-700 mb-3">
              Are you sure you want to delete this record? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(false)}
                className="h-7 text-xs text-slate-700 hover:bg-white"
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
                className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white"
              >
                Delete permanently
              </Button>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 divide-y divide-slate-200/60">
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
                  <span className="text-xs font-medium text-slate-500 mb-0.5">
                    {field.label}
                  </span>
                  <div className="text-sm font-semibold text-slate-900 break-words">
                    {value}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Related Categories Navigation Links */}
          {relatedLinks && relatedLinks.length > 0 && (
            <div className="pt-2 border-t border-slate-200">
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2.5">
                Related Category Ledgers
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {relatedLinks.map((link, idx) => (
                  <Link
                    key={idx}
                    href={link.href(item)}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/40 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {link.icon && (
                        <div className="p-1.5 rounded-md bg-slate-100 text-slate-600 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                          {link.icon}
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-slate-900 block truncate group-hover:text-blue-700">
                          {link.label}
                        </span>
                        {link.sublabel && (
                          <span className="text-[11px] text-slate-500 block truncate">
                            {link.sublabel}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-blue-600 font-medium shrink-0 ml-2">
                      View →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="text-xs text-slate-700 bg-white hover:bg-slate-100 cursor-pointer"
          >
            Close Details
          </Button>
        </div>
      </aside>
    </div>,
    document.body
  );
}
