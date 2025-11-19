import React, { useEffect, useRef, useState } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Check, X, Edit2, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useInlineEdit } from '../../utils/hooks/useInlineEdit';
import { getOrganizations } from '../../utils/api';
import TagsInput from '../TagsInput';
import type { Organization } from '../../App';

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
    if (type === 'organization' && value) {
      return organizations.find(org => org.id === value)?.name || value;
    }
    if (type === 'tags' && Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : '';
    }
    return value ?? '';
  };

  const displayValue = getDisplayValue();

  // Handle cell click to start editing
  const handleCellClick = () => {
    if (!disabled && !isEditing) {
      // For editing, we want to use the raw value (ID for organizations, array for tags)
      const editValue = type === 'organization' ? value : type === 'tags' ? (Array.isArray(value) ? value : []) : displayValue;
      startEdit(field, editValue);
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    updateValue(e.target.value);
  };

  // Handle blur to save
  const handleBlur = async () => {
    if (isEditing && editValue !== displayValue) {
      await saveEdit();
    } else {
      cancelEdit();
    }
  };

  // Load organizations when editing starts
  useEffect(() => {
    if (type === 'organization' && organizationType && editingField === field) {
      loadOrganizations();
    }
  }, [type, organizationType, editingField, field]);

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
    return (
      <div className="relative min-w-[200px]">
        {type === 'select' ? (
          <Select
            value={editValue ?? ''}
            onValueChange={async (value) => {
              updateValue(value);
              // Auto-save on select
              await onSave(field, value);
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
            value={editValue ?? ''}
            onValueChange={async (value) => {
              updateValue(value);
              // Auto-save on select
              await onSave(field, value);
            }}
            disabled={saving}
          >
            <SelectTrigger className="h-8 w-full">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : type === 'organization' ? (
          <Select
            value={editValue ?? ''}
            onValueChange={async (value) => {
              updateValue(value);
              // Auto-save on select
              await onSave(field, value);
            }}
            disabled={saving || isSearching}
          >
            <SelectTrigger className="h-8 w-full">
              <SelectValue placeholder={placeholder}>
                {editValue ? organizations.find(org => org.id === editValue)?.name || placeholder : placeholder}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
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
            onChange={(tags) => {
              updateValue(tags);
              // Auto-save on change
              onSave(field, tags);
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
            className="h-8 text-sm"
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
