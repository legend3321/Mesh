"use client";

import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCompany } from "@/app/components/CompanyContext";

export type FormFieldType = "text" | "number" | "boolean" | "select" | "datetime-local";

export interface ModalFormField {
  name: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  defaultValue?: any;
  options?: { label: string; value: string | number }[];
}

interface GenericEntityModalProps<T> {
  isOpen: boolean;
  title: string;
  item: T | null;
  mode: "create" | "edit";
  fields: ModalFormField[];
  onClose: () => void;
  onSubmit: (formData: Record<string, any>) => Promise<void>;
}

// Convert a date into local YYYY-MM-DDTHH:mm string to prevent timezone offset shifts
function formatToLocalDateTimeString(dateInput: string | Date | number): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function GenericEntityModal<T extends Record<string, any>>({
  isOpen,
  title,
  item,
  mode,
  fields,
  onClose,
  onSubmit,
}: GenericEntityModalProps<T>) {
  const { activeCompanyId, isAllCompanies, companies } = useCompany();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const hasCompanyField = fields.some((f) => f.name === "companyId");
  const showCompanyDropdown =
    mode === "create" &&
    !hasCompanyField &&
    (activeCompanyId === "all" || !activeCompanyId || isAllCompanies);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keyboard Escape dismissal listener & Focus Trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
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

    window.addEventListener("keydown", handleKeyDown);

    const prevActiveElement = document.activeElement as HTMLElement | null;
    const timer = setTimeout(() => {
      if (modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        }
      }
    }, 50);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
      prevActiveElement?.focus();
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (item && mode === "edit") {
      const initial: Record<string, any> = { ...item };
      // Format datetime fields for datetime-local inputs in local time
      fields.forEach((f) => {
        if (f.type === "datetime-local" && initial[f.name]) {
          try {
            initial[f.name] = formatToLocalDateTimeString(initial[f.name]);
          } catch (e) {
            // Keep as is
          }
        }
      });
      setFormData(initial);
    } else if (mode === "create") {
      const initial: Record<string, any> = {};
      fields.forEach((f) => {
        if (f.defaultValue !== undefined) {
          initial[f.name] = f.defaultValue;
        } else if (f.type === "number") {
          initial[f.name] = 0;
        } else if (f.type === "boolean") {
          initial[f.name] = false;
        } else if (f.type === "datetime-local") {
          initial[f.name] = formatToLocalDateTimeString(new Date());
        } else {
          initial[f.name] = "";
        }
      });

      // Default company assignment if active and single
      if (activeCompanyId && activeCompanyId !== "all" && !isAllCompanies) {
        initial.companyId = activeCompanyId;
      } else {
        initial.companyId = "";
      }

      setFormData(initial);
    }
    setError(null);
  }, [item, mode, isOpen, fields, activeCompanyId, isAllCompanies]);

  if (!isOpen) return null;

  const handleChange = (name: string, value: any, type: FormFieldType) => {
    let parsed = value;
    if (type === "number") {
      parsed = value === "" ? 0 : Number(value);
    } else if (type === "boolean") {
      parsed = Boolean(value);
    }
    setFormData((prev) => ({
      ...prev,
      [name]: parsed,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check company selection requirement in All Companies mode
    if (showCompanyDropdown && (!formData.companyId || formData.companyId.trim() === "")) {
      setError("Please select a company to assign this record to.");
      return;
    }

    // Check required fields
    for (const f of fields) {
      if (f.required && (formData[f.name] === undefined || formData[f.name] === "")) {
        setError(`${f.label} is required.`);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      const payload = { ...formData };
      if (!payload.companyId && activeCompanyId && activeCompanyId !== "all" && !isAllCompanies) {
        payload.companyId = activeCompanyId;
      }

      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.message || err?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="bg-white rounded-xl shadow-2xl border border-zinc-200/80 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-200/80 flex items-center justify-between bg-zinc-50/60">
          <div>
            <h3 id="modal-title" className="text-base font-semibold text-zinc-900">
              {mode === "create" ? `Add ${title}` : `Edit ${title}`}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {mode === "create" ? "Enter the details below to add a new record." : "Update the fields and save changes."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors duration-150 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-5 mt-4 p-3 bg-rose-50 border border-rose-200/80 text-rose-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Form body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            {/* Required Company Selection when activeCompanyId === 'all' or isAllCompanies */}
            {showCompanyDropdown && (
              <div className="space-y-1.5">
                <Label htmlFor="modal-field-companyId" className="text-xs font-semibold text-zinc-700">
                  Assigned company <span className="text-[#FD3706]">*</span>
                </Label>
                <select
                  id="modal-field-companyId"
                  value={formData.companyId ?? ""}
                  onChange={(e) => handleChange("companyId", e.target.value, "select")}
                  className="w-full h-8 px-2.5 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-900 shadow-2xs focus:outline-hidden focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
                  required
                >
                  <option value="">Select company...</option>
                  {companies.map((c) => (
                    <option key={c.companyId} value={c.companyId}>
                      {c.companyName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {fields.map((field) => {
              const fieldId = `modal-field-${field.name}`;
              return (
                <div key={field.name} className="space-y-1.5">
                  <Label htmlFor={fieldId} className="text-xs font-semibold text-zinc-700">
                    {field.label} {field.required && <span className="text-[#FD3706]">*</span>}
                  </Label>

                  {field.type === "select" ? (
                    <select
                      id={fieldId}
                      value={formData[field.name] ?? ""}
                      onChange={(e) => handleChange(field.name, e.target.value, field.type)}
                      className="w-full h-8 px-2.5 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-900 shadow-2xs focus:outline-hidden focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
                    >
                      <option value="">Select {field.label.toLowerCase()}...</option>
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "boolean" ? (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        id={fieldId}
                        type="checkbox"
                        checked={!!formData[field.name]}
                        onChange={(e) => handleChange(field.name, e.target.checked, field.type)}
                        className="w-4 h-4 rounded border-zinc-300 accent-[#FD3706] text-zinc-900 focus:ring-1 focus:ring-zinc-900 cursor-pointer"
                      />
                      <label htmlFor={fieldId} className="text-xs text-zinc-700 cursor-pointer">
                        Yes / Active
                      </label>
                    </div>
                  ) : (
                    <Input
                      id={fieldId}
                      type={field.type === "number" ? "number" : field.type === "datetime-local" ? "datetime-local" : "text"}
                      step={field.type === "number" ? "any" : undefined}
                      placeholder={field.placeholder}
                      value={formData[field.name] ?? ""}
                      onChange={(e) => handleChange(field.name, e.target.value, field.type)}
                      className={`h-8 text-xs bg-white border-zinc-200 text-zinc-900 rounded-lg shadow-2xs focus-visible:ring-1 focus-visible:ring-zinc-900 ${
                        field.type === "number" || field.type === "datetime-local" ? "font-mono tabular-nums" : ""
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer actions */}
          <div className="p-4 border-t border-zinc-200/80 bg-zinc-50/60 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
              className="h-8 px-3.5 text-xs font-medium border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 rounded-lg transition-colors duration-150 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="h-8 px-3.5 text-xs font-medium bg-[#FD3706] hover:bg-[#E02E00] text-white shadow-xs rounded-lg transition-colors duration-150 gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {loading ? "Saving..." : mode === "create" ? "Create record" : "Save changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
