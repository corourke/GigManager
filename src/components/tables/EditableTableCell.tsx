import React, { useEffect, useRef, useState } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Check, X, Edit2, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useInlineEdit } from '../../utils/hooks/useInlineEdit';
import { getOrganizations } from '../../utils/api';
import TagsInput from '../TagsInput';
import { Organization } from '../../utils/supabase/types';

interface SelectOption {
  value: string;
  label: string;
}

interface EditableTableCellProps {
  value: string | number | null;
  field: string;
  type?: 'text' | 'number' | 'email' | 'textarea' | 'select' | 'organization' | 'tags';
  placeholder?: string;
  onSave: (field: string, value: any) => Promise<void>;
  onCancel?: (field: string) => void;
  disabled?: boolean;
  className?: string;
  maxLength?: number;
  required?: boolean;
  selectOptions?: SelectOption[];
  organizationType?: 'Venue' | 'Act';
  organizationId?: string;
  tagSuggestions?: string[];
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
  selectOptions = [],
  organizationType,
  organizationId,
  tagSuggestions = [],
}: EditableTableCellProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const {
    editingField,
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
    onSave: (fieldName, value) => onSave(fieldName, value),
    onCancel: onCancel ? (fieldName) => onCancel(fieldName) : undefined,
  });

  const isEditing = editingField === field;

  // Calculate display value based on type
  const getDisplayValue = () => {
    if (type === 'organization') {
      if (!value || value === '') {
        return '';
      }
      // Try to find organization name, fallback to ID if not loaded yet
      const org = organizations.find(org => org.id === value);
      return org?.name || value;
    }
    if (type === 'tags' && Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : '';
    }
    return value ?? '';
  };

  const displayValue = getDisplayValue();

  // Handle cell click to start editing
  const handleCellClick = () => {
    if (!disabled) {
      // If another field is being edited, cancel it first
      if (editingField && editingField !== field) {
        cancelEdit();
      }
      
      if (!isEditing) {
        // For editing, we want to use the raw value (ID for organizations, array for tags)
        let editValue: any;
        if (type === 'organization') {
          // Use "__none__" if value is empty/null for Select component
          editValue = value || '__none__';
        } else if (type === 'tags') {
          editValue = Array.isArray(value) ? value : [];
        } else {
          editValue = displayValue;
        }
        startEdit(field, editValue);
      }
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    updateValue(e.target.value);
  };

  // Handle blur to save - always exit edit mode on blur
  const handleBlur = async (e: React.FocusEvent) => {
    // Use setTimeout to allow click events on other cells to process first
    setTimeout(async () => {
      if (isEditing) {
        // Check if focus moved to another editable cell
        const relatedTarget = e.relatedTarget as HTMLElement;
        const clickedAnotherCell = relatedTarget?.closest('[data-editable-cell]');
        
        // For organization type, compare IDs, not display values
        if (type === 'organization') {
          const currentId = editValue === '__none__' ? '' : editValue;
          const originalId = value || '';
          if (currentId !== originalId) {
            await saveEdit();
          } else {
            cancelEdit();
          }
        } else if (type === 'tags') {
          // Tags are handled by onChange, so just exit edit mode
          cancelEdit();
        } else if (type === 'select') {
          // Select is handled by onValueChange, so just exit edit mode
          cancelEdit();
        } else if (editValue !== displayValue) {
          await saveEdit();
        } else {
          cancelEdit();
        }
      }
    }, 0);
  };

  // Handle clicks outside the editing cell to exit edit mode
  const cellRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!isEditing) return;

    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Check if click is inside this cell or its dropdowns/popovers
      const isClickInsideCell = cellRef.current?.contains(target);
      // Also check if click is on a Select dropdown or Popover (they render in portals)
      const isClickOnDropdown = target.closest('[role="listbox"]') || target.closest('[role="dialog"]');
      
      // If clicking outside this cell and not on a dropdown, exit edit mode
      if (!isClickInsideCell && !isClickOnDropdown) {
        // Save if value changed, otherwise just cancel
        if (type === 'organization') {
          const currentId = editValue === '__none__' ? '' : editValue;
          const originalId = value || '';
          if (currentId !== originalId) {
            saveEdit();
          } else {
            cancelEdit();
          }
        } else if (type === 'tags' || type === 'select') {
          // These are handled by their own onChange handlers
          cancelEdit();
        } else if (editValue !== displayValue) {
          saveEdit();
        } else {
          cancelEdit();
        }
      }
    };

    // Use setTimeout to allow the current click to process first
    setTimeout(() => {
      document.addEventListener('mousedown', handleDocumentClick);
    }, 0);

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, [isEditing, field, type, editValue, value, displayValue, cancelEdit, saveEdit]);

  // Load organizations when editing starts OR when component mounts with a value (for display)
  useEffect(() => {
    if (type === 'organization' && organizationType) {
      if (editingField === field || (value && organizations.length === 0)) {
        loadOrganizations();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, organizationType, editingField, field, value]);

  const loadOrganizations = async () => {
    if (!organizationType) return;

    setIsSearching(true);
    try {
      const orgs = await getOrganizations(organizationType);
      setOrganizations(orgs);
    } catch (error) {
      console.error('Error loading organizations:', error);
    } finally {
      setIsSearching(false);
    }
  };

  if (isEditing) {
    // For title field, ensure minimum width to prevent collapsing on narrow screens
    const wrapperClassName = field === 'title' 
      ? "relative min-w-[200px] w-full" 
      : "relative";
    
    return (
      <div ref={cellRef} className={wrapperClassName}>
        {type === 'select' ? (
          <Select
            value={editValue ?? ''}
            onValueChange={async (value) => {
              updateValue(value);
              // Auto-save on select and exit edit mode
              await onSave(field, value);
              cancelEdit();
            }}
            onOpenChange={(open) => {
              // When select closes, ensure we exit edit mode
              if (!open && isEditing) {
                cancelEdit();
              }
            }}
            disabled={saving}
          >
            <SelectTrigger className="h-8 w-full">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {selectOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : type === 'textarea' ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={editValue ?? ''}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={saving}
            maxLength={maxLength}
            required={required}
            name={field}
            id={field}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none"
            rows={3}
          />
        ) : type === 'organization' ? (
          <Select
            value={editValue && editValue !== '__none__' && editValue !== '' ? editValue : '__none__'}
            onValueChange={async (selectedValue) => {
              // Convert "__none__" to empty string for saving
              const saveValue = selectedValue === '__none__' ? '' : selectedValue;
              updateValue(saveValue);
              // Auto-save on select and exit edit mode
              await onSave(field, saveValue);
              cancelEdit();
            }}
            onOpenChange={(open) => {
              // When select closes, ensure we exit edit mode
              if (!open && isEditing) {
                cancelEdit();
              }
            }}
            disabled={saving || isSearching}
          >
            <SelectTrigger className="h-8 w-full">
              <SelectValue placeholder={placeholder}>
                {editValue && editValue !== '__none__' && editValue !== ''
                  ? organizations.find(org => org.id === editValue)?.name || placeholder
                  : placeholder}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : type === 'tags' ? (
          <TagsInput
            value={Array.isArray(editValue) ? editValue : []}
            onChange={async (tags) => {
              updateValue(tags);
              // Auto-save on change and exit edit mode
              await onSave(field, tags);
              cancelEdit();
            }}
            suggestions={tagSuggestions}
            placeholder={placeholder}
            disabled={saving}
          />
        ) : (
          <Input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={type}
            value={editValue ?? ''}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={saving}
            maxLength={maxLength}
            required={required}
            name={field}
            id={field}
            className={`h-8 text-sm ${field === 'title' ? 'w-full min-w-[200px]' : 'w-full'}`}
          />
        )}
        {saving && (
          <Loader2 className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-sky-500" />
        )}
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
      ref={cellRef}
      data-editable-cell
      data-field={field}
      className={`group cursor-pointer ${className}`}
      onClick={handleCellClick}
      title={disabled ? undefined : 'Click to edit'}
    >
      <div className="flex items-center gap-2">
        {type === 'tags' && Array.isArray(value) ? (
          <div className="flex flex-wrap gap-1">
            {value.length > 0 ? (
              value.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))
            ) : (
              <span className="text-gray-400">-</span>
            )}
          </div>
        ) : (
          <span className="text-sm text-gray-900">
            {type === 'organization' && (!displayValue || displayValue === '')
              ? '-'
              : displayValue || <span className="text-gray-400 italic">Empty</span>}
          </span>
        )}
        {!disabled && (
          <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
    </div>
  );
}
