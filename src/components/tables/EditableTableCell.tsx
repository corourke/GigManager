import React, { useEffect, useRef, useState } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Check, X, Edit2, Loader2, Clock, ChevronsUpDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { useInlineEdit } from '../../utils/hooks/useInlineEdit';
import { getOrganizations } from '../../services/organization.service';
import TagsInput from '../TagsInput';
import { Organization } from '../../utils/supabase/types';
import { format } from 'date-fns';
import { cn } from '../ui/utils';

interface SelectOption {
  value: string;
  label: string;
}

interface EditableTableCellProps {
  value: string | number | null;
  field: string;
  type?: 'text' | 'number' | 'email' | 'textarea' | 'select' | 'organization' | 'tags' | 'datetime-local';
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
  timezone?: string;
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
  timezone,
}: EditableTableCellProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [comboOpen, setComboOpen] = useState(true);
  const [highlightedValue, setHighlightedValue] = useState<string | null>(null);

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
    if (type === 'datetime-local' && value) {
      try {
        const date = new Date(value as string);
        if (isNaN(date.getTime())) return value as string;
        
        const options: Intl.DateTimeFormatOptions = {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: timezone
        };
        return date.toLocaleString('en-US', options);
      } catch (e) {
        return value as string;
      }
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

  // Handle Tab key navigation
  const handleTabKey = async (shiftKey: boolean) => {
    // Find all editable cells in the document
    const allCells = Array.from(document.querySelectorAll('[data-editable-cell]')) as HTMLElement[];
    const currentCell = cellRef.current;
    
    if (!currentCell) return;
    
    const currentIndex = allCells.indexOf(currentCell);
    if (currentIndex === -1) return;

    // Save current value before moving
    if (type === 'organization') {
      const currentId = editValue === '__none__' ? '' : editValue;
      if (currentId !== value) {
        await saveEdit();
      } else {
        cancelEdit();
      }
    } else if (type === 'tags' || type === 'select') {
      // These usually auto-save, but let's be safe
      cancelEdit();
    } else if (editValue !== displayValue) {
      await saveEdit();
    } else {
      cancelEdit();
    }

    // Determine next cell index
    let nextIndex;
    if (shiftKey) {
      nextIndex = currentIndex - 1;
      // Wrap around if needed
      if (nextIndex < 0) nextIndex = allCells.length - 1;
    } else {
      nextIndex = (currentIndex + 1) % allCells.length;
    }

    // Focus next cell in next tick to ensure previous one closed
    setTimeout(() => {
      const nextCell = allCells[nextIndex];
      if (nextCell) {
        nextCell.click();
      }
    }, 0);
  };

  // Enhanced key down handler to support Tab
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      handleTabKey(e.shiftKey);
    } else {
      handleKeyDown(e);
    }
  };

  if (isEditing) {
    // For title field, ensure minimum width to prevent collapsing on narrow screens
    const wrapperClassName = `relative w-full h-full flex items-center p-2 bg-sky-50/30 transition-colors ${
      field === 'title' ? "min-w-[200px]" : ""
    }`;
    
    return (
      <div ref={cellRef} className={wrapperClassName} data-editable-cell data-field={field}>
        {type === 'select' || type === 'organization' ? (
          <Popover 
            open={comboOpen} 
            onOpenChange={(open) => {
              setComboOpen(open);
              if (!open) cancelEdit();
            }}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={comboOpen}
                className="h-8 w-full justify-between border-sky-200 bg-white/50 px-2 font-normal hover:bg-white/80"
              >
                <span className="truncate">
                  {type === 'select' 
                    ? (selectOptions.find((opt) => opt.value === editValue)?.label || placeholder)
                    : (organizations.find((org) => org.id === editValue)?.name || (editValue === '__none__' ? 'None' : placeholder))}
                </span>
                <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command 
                onValueChange={(val) => setHighlightedValue(val)}
                value={highlightedValue || (editValue === '__none__' ? '' : editValue)}
              >
                <CommandInput 
                  placeholder={`Search ${field}...`} 
                  className="h-8"
                  onKeyDown={(e) => {
                    if (e.key === 'Tab') {
                      // If we have a highlighted value, select it before tabbing away
                      if (highlightedValue) {
                        const saveValue = type === 'organization' && highlightedValue === '__none__' ? '' : highlightedValue;
                        updateValue(saveValue);
                        onSave(field, saveValue);
                      }
                      e.preventDefault();
                      handleTabKey(e.shiftKey);
                    } else if (e.key === 'Enter' && highlightedValue) {
                      const saveValue = type === 'organization' && highlightedValue === '__none__' ? '' : highlightedValue;
                      updateValue(saveValue);
                      onSave(field, saveValue);
                      cancelEdit();
                    }
                  }}
                />
                <CommandList>
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup>
                    {type === 'organization' && (
                      <CommandItem
                        value="__none__"
                        onSelect={() => {
                          updateValue('');
                          onSave(field, '');
                          cancelEdit();
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            editValue === '__none__' || editValue === '' ? "opacity-100" : "opacity-0"
                          )}
                        />
                        None
                      </CommandItem>
                    )}
                    {(type === 'select' ? selectOptions : organizations.map(o => ({ value: o.id, label: o.name }))).map((option) => (
                      <CommandItem
                        key={option.value}
                        value={option.value}
                        onSelect={() => {
                          updateValue(option.value);
                          onSave(field, option.value);
                          cancelEdit();
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            editValue === option.value ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {option.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        ) : type === 'textarea' ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={editValue ?? ''}
            onChange={handleInputChange}
            onKeyDown={onKeyDown}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={saving}
            maxLength={maxLength}
            required={required}
            name={field}
            id={field}
            className="w-full px-2 py-1 text-sm border border-sky-200 rounded bg-white/50 focus:outline-none focus:ring-0 resize-none"
            rows={3}
          />
        ) : type === 'tags' ? (
          <div className="w-full">
            <TagsInput
              value={Array.isArray(editValue) ? editValue : []}
              onChange={async (tags) => {
                updateValue(tags);
                // Auto-save on change but DON'T exit edit mode yet
                await onSave(field, tags);
              }}
              onKeyDown={onKeyDown}
              suggestions={tagSuggestions}
              placeholder={placeholder}
              disabled={saving}
            />
          </div>
        ) : type === 'datetime-local' ? (
          <div className="relative w-full">
            <Clock className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
            <Input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="datetime-local"
              value={(() => {
                if (!editValue) return '';
                try {
                  const date = new Date(editValue);
                  if (isNaN(date.getTime())) return typeof editValue === 'string' ? editValue : '';
                  return format(date, "yyyy-MM-dd'T'HH:mm");
                } catch (e) {
                  return typeof editValue === 'string' ? editValue : '';
                }
              })()}
              onChange={(e) => updateValue(e.target.value)}
              onKeyDown={onKeyDown}
              onBlur={handleBlur}
              disabled={saving}
              required={required}
              name={field}
              id={field}
              className="h-8 pl-7 pr-2 text-xs border-sky-200 bg-white/50 focus-visible:ring-0 w-full"
            />
          </div>
        ) : (
          <Input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={type}
            value={editValue ?? ''}
            onChange={handleInputChange}
            onKeyDown={onKeyDown}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={saving}
            maxLength={maxLength}
            required={required}
            name={field}
            id={field}
            className={`h-8 text-sm border-sky-200 bg-white/50 focus-visible:ring-0 px-2 ${field === 'title' ? 'w-full min-w-[200px]' : 'w-full'}`}
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
      className={`group cursor-pointer p-2 h-full min-h-[40px] flex items-center ${className}`}
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
