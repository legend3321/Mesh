"use client";

import React, { useEffect, useState } from "react";
import { X, Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

export default function GenericEntityModal<T extends Record<string, any>>({
  isOpen,
  title,
  item,
  mode,
  fields,
  onClose,
  onSubmit,
}: GenericEntityModalProps<T>) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item && mode === "edit") {
      const initial: Record<string, any> = { ...item };
      // Format datetime fields for datetime-local inputs
      fields.forEach((f) => {
        if (f.type === "datetime-local" && initial[f.name]) {
          try {
            initial[f.name] = new Date(initial[f.name]).toISOString().slice(0, 16);
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
          initial[f.name] = new Date().toISOString().slice(0, 16);
        } else {
          initial[f.name] = "";
        }
      });
      setFormData(initial);
    }
    setError(null);
  }, [item, mode, isOpen, fields]);

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
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.message || err?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {mode === "create" ? `Add ${title}` : `Edit ${title}`}
            </h3>
            <p className="text-xs text-slate-500">
              {mode === "create" ? "Enter the details below to add a new record." : "Update the fields and save changes."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {fields.map((field) => (
              <div key={field.name} className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </Label>

                {field.type === "select" ? (
                  <select
                    value={formData[field.name] ?? ""}
                    onChange={(e) => handleChange(field.name, e.target.value, field.type)}
                    className="w-full h-9 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">Select {field.label}...</option>
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === "boolean" ? (
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={!!formData[field.name]}
                      onChange={(e) => handleChange(field.name, e.target.checked, field.type)}
                      className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500"
                    />
                    <span>Yes / Active</span>
                  </label>
                ) : (
                  <Input
                    type={field.type === "number" ? "number" : field.type === "datetime-local" ? "datetime-local" : "text"}
                    step={field.type === "number" ? "any" : undefined}
                    placeholder={field.placeholder}
                    value={formData[field.name] ?? ""}
                    onChange={(e) => handleChange(field.name, e.target.value, field.type)}
                    className="h-9 text-sm"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Footer actions */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {loading ? "Saving..." : mode === "create" ? "Create Record" : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
