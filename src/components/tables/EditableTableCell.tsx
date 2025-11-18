import React, { useEffect, useRef } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Check, X, Edit2, Loader2 } from 'lucide-react';
import { useInlineEdit } from '../../utils/hooks/useInlineEdit';

interface EditableTableCellProps {
  value: string | number | null;
  field: string;
  type?: 'text' | 'number' | 'email' | 'textarea';
  placeholder?: string;
  onSave: (field: string, value: any) => Promise<void>;
  onCancel?: (field: string) => void;
  disabled?: boolean;
  className?: string;
  maxLength?: number;
  required?: boolean;
}

export default function EditableTableCell({
  value,
  field,
  type = 'text',
  placeholder = '',
  onSave,
  onCancel,
  disabled = false,
  className = '',
  maxLength,
  required = false,
}: EditableTableCellProps) {
  const {
    isEditing,
    editValue,
    saving,
    error,
    startEdit,
    updateValue,
    saveEdit,
    cancelEdit,
    handleKeyDown,
    inputRef,
  } = useInlineEdit({
    onSave,
    onCancel,
  });

  const displayValue = value || '';

  // Handle cell click to start editing
  const handleCellClick = () => {
    if (!disabled && !isEditing) {
      startEdit(field, displayValue);
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    updateValue(e.target.value);
  };

  // Handle save/cancel actions
  const handleSave = async () => {
    const success = await saveEdit();
    if (!success) {
      // If save failed, keep editing mode
      return;
    }
  };

  const handleCancel = () => {
    cancelEdit();
  };

  // Auto-focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 min-w-[200px]">
        <div className="flex-1">
          {type === 'textarea' ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={editValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={saving}
              maxLength={maxLength}
              required={required}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none"
              rows={3}
            />
          ) : (
            <Input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type={type}
              value={editValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={saving}
              maxLength={maxLength}
              required={required}
              className="h-8 text-sm"
            />
          )}
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSave}
            disabled={saving}
            className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
          >
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Check className="h-3 w-3" />
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            disabled={saving}
            className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        {error && (
          <div className="absolute top-full left-0 mt-1 px-2 py-1 text-xs text-red-600 bg-red-50 border border-red-200 rounded shadow-sm z-10">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`group cursor-pointer ${className}`}
      onClick={handleCellClick}
      title={disabled ? undefined : 'Click to edit'}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-900">
          {displayValue || <span className="text-gray-400 italic">Empty</span>}
        </span>
        {!disabled && (
          <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
    </div>
  );
}
