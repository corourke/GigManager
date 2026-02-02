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
import { GIG_STATUS_CONFIG, ORG_TYPE_CONFIG } from '../../utils/supabase/constants';
import { format } from 'date-fns';
import { cn } from '../ui/utils';
import { formatInTimeZone, formatForDateTimeInput } from '../../utils/dateUtils';

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
  onEditingChange?: (isEditing: boolean) => void;
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
  onEditingChange,
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

  // Sync isEditing state with parent using a ref to avoid infinite loops from unstable callbacks
  const onEditingChangeRef = useRef(onEditingChange);
  useEffect(() => {
    onEditingChangeRef.current = onEditingChange;
  }, [onEditingChange]);

  useEffect(() => {
    if (onEditingChangeRef.current) {
      onEditingChangeRef.current(isEditing);
    }
  }, [isEditing]);

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
      return formatInTimeZone(value as string, timezone, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
    return value ?? '';
  };

  const displayValue = getDisplayValue();

  const getValueColor = (val: any, displayVal: string) => {
    if (field === 'status' && GIG_STATUS_CONFIG[val as keyof typeof GIG_STATUS_CONFIG]) {
      return 'bg-gray-100 text-gray-800 border-gray-200';
    } else if (type === 'organization' && organizationType) {
      return 'bg-gray-100 text-gray-800 border-gray-200';
    } else {
      return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Handle cell click to start editing
  const handleCellClick = () => {
    if (!disabled) {
      // If another field is being edited, cancel it first
      if (editingField && editingField !== field) {
        cancelEdit();
      }
      
      if (!isEditing) {
        // For select/organization, initialize search with current display value
        if (type === 'select' || type === 'organization') {
          setSearchQuery(displayValue === '-' ? '' : displayValue);
        } else {
          setSearchQuery('');
        }
        
        setComboOpen(true);
        // For editing, we want to use the raw value (ID for organizations, array for tags)
        let editValue: any;
        if (type === 'organization') {
          // Use "__none__" if value is empty/null for Select component
          editValue = value || '__none__';
        } else if (type === 'tags') {
          editValue = Array.isArray(value) ? value : [];
        } else if (type === 'datetime-local') {
          editValue = formatForDateTimeInput(value as string, timezone);
        } else {
          editValue = displayValue;
        }
        startEdit(field, editValue);
      }
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    updateValue(newVal);
    
    // For select/organization, update search and find top match
    if (type === 'select' || type === 'organization') {
      setSearchQuery(newVal);
      const options = type === 'select' 
        ? selectOptions 
        : organizations.map(o => ({ value: o.id, label: o.name }));
      
      const match = options.find(opt => 
        opt.label.toLowerCase().startsWith(newVal.toLowerCase())
      );
      
      if (match) {
        setHighlightedValue(match.value);
      } else {
        setHighlightedValue(null);
      }
    }
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
          // Save tags on blur
          await saveEdit();
        } else if (type === 'select') {
          // Select is handled by onValueChange, so just exit edit mode
          cancelEdit();
        } else if (type === 'datetime-local') {
          const originalValue = formatForDateTimeInput(value as string, timezone);
          if (editValue !== originalValue) {
            await saveEdit();
          } else {
            cancelEdit();
          }
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

  // Use refs to avoid re-creating the effect when values change
  const editValueRef = useRef(editValue);
  const valueRef = useRef(value);
  const displayValueRef = useRef(displayValue);
  const typeRef = useRef(type);

  useEffect(() => {
    editValueRef.current = editValue;
  }, [editValue]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    displayValueRef.current = displayValue;
  }, [displayValue]);

  useEffect(() => {
    typeRef.current = type;
  }, [type]);

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
        if (typeRef.current === 'organization') {
          const currentId = editValueRef.current === '__none__' ? '' : editValueRef.current;
          const originalId = valueRef.current || '';
          if (currentId !== originalId) {
            saveEdit();
          } else {
            cancelEdit();
          }
        } else if (typeRef.current === 'tags') {
          // Save tags on outside click
          saveEdit();
        } else if (typeRef.current === 'select') {
          // Select is handled by onValueChange, so just exit edit mode
          cancelEdit();
        } else if (editValueRef.current !== displayValueRef.current) {
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
  }, [isEditing, field, cancelEdit, saveEdit]);

  // Load organizations when editing starts OR when component mounts with a value (for display)
  useEffect(() => {
    if (type === 'organization' && organizationType) {
      if (editingField === field || (value && organizations.length === 0)) {
        loadOrganizations();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, organizationType, editingField, field, value]);

  // Handle focus and cursor placement for text inputs
  useEffect(() => {
    if (isEditing && inputRef.current) {
      const input = inputRef.current as HTMLInputElement | HTMLTextAreaElement;
      // Focus the input
      input.focus();
      
      if (type === 'select' || type === 'organization' || type === 'number') {
        // For search inputs and numbers, select all text so it can be easily replaced or edited
        input.select();
      } else if (type === 'text' || type === 'email' || type === 'textarea') {
        // For regular text, move cursor to the end
        // Use setTimeout to ensure the cursor position is set after focus is complete
        setTimeout(() => {
          const length = input.value.length;
          input.setSelectionRange(length, length);
        }, 0);
      }
    }
  }, [isEditing, type, inputRef]);

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
    } else if (type === 'select') {
      if (editValue !== value) {
        await saveEdit();
      } else {
        cancelEdit();
      }
    } else if (type === 'tags') {
      // Save tags before tabbing
      await saveEdit();
    } else if (type === 'datetime-local') {
      const originalValue = formatForDateTimeInput(value as string, timezone);
      if (editValue !== originalValue) {
        await saveEdit();
      } else {
        cancelEdit();
      }
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
    const wrapperClassName = cn(
      "relative w-full h-full flex items-center px-2 py-1.5 bg-white transition-colors cursor-text z-20 border border-blue-500 shadow-sm",
      field === 'title' && "min-w-[200px]",
      className
    );
    
    return (
      <div ref={cellRef} className={wrapperClassName} data-editable-cell data-field={field}>
        {type === 'select' || type === 'organization' ? (
          <div className="w-full flex items-center">
            <Popover 
              open={comboOpen} 
              onOpenChange={(open) => {
                setComboOpen(open);
                if (!open) {
                  // Wait a bit to see if we focus something else
                  setTimeout(() => {
                    if (document.activeElement?.closest('[data-editable-cell]') === null) {
                      cancelEdit();
                    }
                  }, 100);
                }
              }}
            >
              <PopoverTrigger asChild>
                <div className="flex-1 flex items-center h-8">
                  <Input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    value={searchQuery}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Tab') {
                        // If we have a highlighted value, select it before tabbing away
                        if (highlightedValue) {
                          const saveValue = type === 'organization' && highlightedValue === '__none__' ? '' : highlightedValue;
                          updateValue(saveValue);
                        }
                        e.preventDefault();
                        handleTabKey(e.shiftKey);
                      } else if (e.key === 'Enter') {
                        if (highlightedValue) {
                          const saveValue = type === 'organization' && highlightedValue === '__none__' ? '' : highlightedValue;
                          updateValue(saveValue);
                        }
                        cancelEdit();
                      } else if (e.key === 'Escape') {
                        cancelEdit();
                      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                        // Let the command list handle arrows if it's open
                        setComboOpen(true);
                      }
                    }}
                    onFocus={() => setComboOpen(true)}
                    placeholder={placeholder}
                    className="h-full border-none bg-transparent focus-visible:ring-0 px-0 py-0 text-sm w-full"
                  />
                </div>
              </PopoverTrigger>
              <PopoverContent 
                className="w-[var(--radix-popover-trigger-width)] p-0" 
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <Command 
                  value={highlightedValue || (editValue === '__none__' ? '' : editValue)}
                >
                  <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup>
                      {type === 'organization' && (
                        <CommandItem
                          value="__none__"
                          onSelect={() => {
                            updateValue('');
                            setComboOpen(false);
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
                            setComboOpen(false);
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
            <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
          </div>
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
            className="w-full px-0 py-0 text-sm bg-transparent focus:outline-none focus:ring-0 resize-none leading-relaxed"
            rows={3}
          />
        ) : type === 'tags' ? (
          <div className="w-full">
            <TagsInput
              value={Array.isArray(editValue) ? editValue : []}
              onChange={(tags) => {
                updateValue(tags);
              }}
              onKeyDown={onKeyDown}
              suggestions={tagSuggestions}
              placeholder={placeholder}
              disabled={saving}
            />
          </div>
        ) : type === 'datetime-local' ? (
          <Input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="datetime-local"
            value={(editValue as string) || ''}
            onChange={(e) => updateValue(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={handleBlur}
            disabled={saving}
            required={required}
            name={field}
            id={field}
            className="h-full px-0 py-0 text-sm border-none bg-transparent focus-visible:ring-0 w-full cursor-text"
          />
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
            className={`h-full text-sm border-none bg-transparent focus-visible:ring-0 px-0 py-0 ${field === 'title' ? 'w-full min-w-[200px]' : 'w-full'}`}
          />
        )}
        {saving && (
          <Loader2 className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 animate-spin text-sky-500" />
        )}
        {error && (
          <div className="absolute top-full left-0 mt-1 px-2 py-1 text-xs text-red-600 bg-red-50 border border-red-200 rounded shadow-sm z-10">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Render view value with consistent formatting
  const renderViewValue = () => {
    if ((type === 'select' || type === 'organization' || field === 'status') && displayValue && displayValue !== '-') {
      const colorClass = getValueColor(value, displayValue);
      
      return (
        <Badge variant="outline" className={cn("font-medium truncate", colorClass)}>
          {displayValue}
        </Badge>
      );
    }
    
    if (type === 'tags' && Array.isArray(value)) {
      return (
        <div className="flex flex-wrap gap-1">
          {value.length > 0 ? (
            value.map((tag, index) => (
              <Badge key={index} variant="secondary" className="bg-gray-100 text-gray-700 border-gray-200 text-[10px] h-5 py-0">
                {tag}
              </Badge>
            ))
          ) : (
            <span className="text-gray-400 italic text-xs">No tags</span>
          )}
        </div>
      );
    }
    
    return (
      <span className={cn(
        "text-sm text-gray-900 truncate block w-full",
        (!displayValue || displayValue === '-') && "text-gray-400 italic"
      )}>
        {displayValue || placeholder || '-'}
      </span>
    );
  };

  return (
    <div
      ref={cellRef}
      data-editable-cell
      data-field={field}
      className={cn(
        "relative w-full h-full flex items-center px-2 py-1.5 transition-colors border-[1px] border-transparent outline-none ring-offset-0",
        !disabled && "cursor-pointer hover:bg-gray-50/80",
        className
      )}
      onClick={handleCellClick}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleCellClick();
        } else if (e.key === 'Tab') {
          e.preventDefault();
          handleTabKey(e.shiftKey);
        }
      }}
      tabIndex={disabled ? -1 : 0}
      title={disabled ? undefined : 'Click to edit'}
    >
      {renderViewValue()}
    </div>
  );
}
