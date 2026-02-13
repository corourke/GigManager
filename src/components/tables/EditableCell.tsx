import React, { useState, useEffect, useRef } from 'react';
import { Check, Loader2, Search } from 'lucide-react';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { TableCell } from '../ui/table';
import { cn } from '../ui/utils';
import { ColumnDef } from './SmartDataTable';
import { formatDateDisplay, formatGigDateTimeForDisplay, formatGigDateTimeForInput, parseGigDateTimeFromInput, isNoonUTC } from '../../utils/dateUtils';

const toDateInputValue = (val: any): string => {
  if (!val) return '';
  const str = String(val);
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  if (str.includes('T') || str.includes(' ')) return str.substring(0, 10);
  const d = new Date(str);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().substring(0, 10);
};
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Checkbox } from '../ui/checkbox';

interface EditableCellProps<T> {
  value: any;
  column: ColumnDef<T>;
  row: T;
  onSave: (newValue: any) => Promise<void>;
  isSelected: boolean;
  onSelect: () => void;
  onNavigate?: (direction: 'next' | 'prev' | 'up' | 'down') => void;
  onEditComplete?: () => void;
}

export function EditableCell<T>({
  value,
  column,
  row,
  onSave,
  isSelected,
  onSelect,
  onNavigate,
  onEditComplete,
}: EditableCellProps<T>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const commandRef = useRef<HTMLDivElement>(null);

  const resolvedTimezone = typeof column.timezone === 'function' ? column.timezone(row) : column.timezone;

  // Sync editValue when value changes externally
  useEffect(() => {
    setEditValue(value);
  }, [value]);

  // Handle "Type to Edit"
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!isSelected || isEditing || e.metaKey || e.ctrlKey || e.altKey) return;
      
      // Handle Spacebar for checkbox toggle
      if (e.key === ' ' && column.type === 'checkbox') {
        e.preventDefault();
        handleCheckboxToggle();
        return;
      }

      // Check if it's a printable character (single char)
      if (e.key.length === 1 && !['Enter', 'Tab', 'Escape'].includes(e.key)) {
        if (!column.editable || column.readOnly) return;

        if (column.type === 'text' || column.type === 'number' || column.type === 'currency') {
          e.preventDefault(); // Prevent double character input
          setIsEditing(true);
          setEditValue(e.key);
        } else if (column.type === 'select' || column.type === 'pill') {
          e.preventDefault();
          setCommandSearch(e.key);
          setIsEditing(true);
        } else if (column.type === 'date' || column.type === 'datetime') {
          e.preventDefault();
          setIsEditing(true);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isSelected, isEditing, column.editable, column.readOnly, column.type, value]);

  // Focus input and place cursor at end when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (column.type !== 'checkbox' && column.type !== 'select' && column.type !== 'pill' && column.type !== 'number' && column.type !== 'currency' && column.type !== 'date' && column.type !== 'datetime') {
        const length = String(editValue || '').length;
        inputRef.current.setSelectionRange(length, length);
      }
    }
    if (isEditing && commandSearch && (column.type === 'select' || column.type === 'pill')) {
      requestAnimationFrame(() => {
        const input = commandRef.current?.querySelector('input');
        if (input) {
          const len = input.value.length;
          input.setSelectionRange(len, len);
        }
      });
    }
  }, [isEditing, column.type, editValue, commandSearch]);

  const handleDoubleClick = () => {
    if (column.editable && !column.readOnly) {
      setCommandSearch('');
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    if (column.type !== 'select' && column.type !== 'pill') {
      save();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      save().then(() => {
        onNavigate?.(e.shiftKey ? 'up' : 'down');
      });
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      save().then(() => {
        onNavigate?.(e.shiftKey ? 'prev' : 'next');
      });
    }
  };

  const save = async (newValue = editValue) => {
    // For numbers and currency, convert string to number before saving, handle empty string
    let finalValue = (column.type === 'number' || column.type === 'currency') ? (newValue === '' ? null : Number(newValue)) : newValue;

    if (column.type === 'date' && newValue) {
      const dateStr = toDateInputValue(newValue);
      finalValue = dateStr ? parseGigDateTimeFromInput(dateStr, undefined, true) : null;
    }

    if (column.type === 'datetime' && newValue) {
      const isDateOnly = !newValue.includes('T');
      finalValue = parseGigDateTimeFromInput(newValue, resolvedTimezone, isDateOnly);
    }

    if (finalValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(finalValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save cell value', error);
      setEditValue(value);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCheckboxToggle = () => {
    if (!column.editable || column.readOnly || isSaving) return;
    const newValue = !value; 
    onSave(newValue);
  };

  // Render Display Mode
  const renderDisplay = () => {
    if (column.render) {
      return column.render(value, row);
    }

    if (value === null || value === undefined || value === '') {
      return <span className="text-muted-foreground italic">empty</span>;
    }

    if (column.type === 'pill' && column.pillConfig && column.pillConfig[String(value)]) {
      const config = column.pillConfig[String(value)];
      return (
        <Badge variant="outline" className={cn("font-medium", config.color)}>
          {config.label}
        </Badge>
      );
    }

    if (column.type === 'checkbox') {
      return (
        <div className="flex items-center justify-center w-full h-full">
          <Checkbox 
            checked={!!value} 
            onCheckedChange={handleCheckboxToggle}
            disabled={!column.editable || column.readOnly || isSaving}
            className="transition-colors"
          />
        </div>
      );
    }

    if (column.type === 'currency') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0);
    }

    if (column.type === 'date' && value) {
      return formatDateDisplay(value);
    }

    if (column.type === 'datetime' && value) {
      return formatGigDateTimeForDisplay(value, resolvedTimezone);
    }

    return String(value);
  };

  // Render Edit Mode
  const renderEditor = () => {
    if (column.type === 'checkbox') {
      return renderDisplay();
    }

    if (column.type === 'select' || column.type === 'pill') {
      const options = column.options || (column.pillConfig ? Object.entries(column.pillConfig).map(([val, config]) => ({ label: config.label, value: val })) : []);
      
      const handleCommandKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Tab') {
          e.preventDefault();
          const highlighted = commandRef.current?.querySelector('[data-selected="true"]');
          if (highlighted) {
            const label = highlighted.getAttribute('data-value');
            const match = options.find(o => String(o.label) === label);
            if (match) {
              setEditValue(match.value);
              save(match.value).then(() => {
                onEditComplete?.();
                onNavigate?.(e.shiftKey ? 'prev' : 'next');
              });
              return;
            }
          }
          setIsEditing(false);
          onEditComplete?.();
          onNavigate?.(e.shiftKey ? 'prev' : 'next');
        }
      };

      return (
        <Popover open={isEditing} onOpenChange={setIsEditing}>
          <PopoverTrigger asChild>
            <div className="w-full h-full flex items-center px-4 cursor-pointer absolute inset-0 z-20">
              {renderDisplay()}
            </div>
          </PopoverTrigger>
          <PopoverContent 
            className="w-[200px] p-0" 
            align="start"
            onCloseAutoFocus={(e) => {
              e.preventDefault();
            }}
          >
            <div ref={commandRef}>
            <Command onKeyDown={handleCommandKeyDown}>
              <CommandInput placeholder={`Search ${column.header.toLowerCase()}...`} value={commandSearch} onValueChange={setCommandSearch} />
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem
                      key={String(option.value)}
                      value={String(option.label)}
                      onSelect={() => {
                        setEditValue(option.value);
                        save(option.value).then(() => {
                          onEditComplete?.();
                        });
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === option.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {column.type === 'pill' && column.pillConfig && column.pillConfig[String(option.value)] ? (
                        <Badge variant="outline" className={cn("font-medium", column.pillConfig[String(option.value)].color)}>
                          {option.label}
                        </Badge>
                      ) : (
                        option.label
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
            </div>
          </PopoverContent>
        </Popover>
      );
    }

    return (
      <div className="absolute inset-0 z-40 bg-white flex items-center px-4">
        <input
          ref={inputRef}
          value={editValue ?? ''}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="h-full w-full py-0 text-sm border-none outline-none ring-0 bg-transparent p-0 min-w-0"
          type={column.type === 'number' ? 'number' : column.type === 'date' ? 'date' : 'text'}
        />
      </div>
    );
  };

  return (
    <TableCell
      className={cn(
        "p-0 border-r last:border-r-0 relative h-full align-top overflow-hidden transition-none whitespace-normal",
        isSelected && "bg-sky-50/50"
      )}
      onClick={(e) => {
        e.stopPropagation();
        if (!isSelected) {
          onSelect();
        } else if (!isEditing) {
          handleDoubleClick();
        }
      }}
      onDoubleClick={handleDoubleClick}
    >
      {/* Blue selection border - absolute inset-0 to cover the whole cell */}
      {isSelected && (
        <div className="absolute inset-0 border-2 border-sky-500 z-50 pointer-events-none" />
      )}

      <div className="w-full h-full min-h-[40px] relative flex items-start">
        {/* 
          Display Content:
          - Always present to define the height/width of the cell.
          - 'break-words' allows wrapping like Notion/Coda.
          - Padding 'px-4 py-2' is the master padding.
        */}
        <div className={cn(
          "w-full h-full px-4 py-2 text-sm break-words min-h-[40px] flex items-start",
          isEditing && (column.type === 'text' || column.type === 'number' || column.type === 'currency' || column.type === 'date' || column.type === 'datetime') ? "invisible" : "visible"
        )}>
          {renderDisplay()}
        </div>

        {isEditing && (column.type === 'text' || column.type === 'number' || column.type === 'currency') && (
          <div className="absolute inset-0 z-40 bg-white flex items-start">
            <input
              ref={inputRef}
              value={editValue ?? ''}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="h-full w-full px-4 py-2 text-sm border-none outline-none ring-0 bg-transparent min-w-0 text-slate-900"
              type={column.type === 'number' || column.type === 'currency' ? 'number' : 'text'}
            />
          </div>
        )}

        {isEditing && column.type === 'date' && (
          <div className="absolute inset-0 z-40 bg-white flex items-start">
            <input
              ref={inputRef}
              defaultValue={toDateInputValue(editValue)}
              onBlur={() => {
                const val = inputRef.current?.value;
                save(val || value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  save(inputRef.current?.value || value).then(() => onNavigate?.(e.shiftKey ? 'up' : 'down'));
                } else if (e.key === 'Escape') {
                  setEditValue(value);
                  setIsEditing(false);
                } else if (e.key === 'Tab') {
                  e.preventDefault();
                  save(inputRef.current?.value || value).then(() => onNavigate?.(e.shiftKey ? 'prev' : 'next'));
                }
              }}
              className="h-full w-full px-4 py-2 text-sm border-none outline-none ring-0 bg-transparent min-w-0 text-slate-900"
              type="date"
              max="9999-12-31"
            />
          </div>
        )}

        {isEditing && column.type === 'datetime' && (
          <div className="absolute inset-0 z-40 bg-white flex items-start">
            <input
              ref={inputRef}
              defaultValue={formatGigDateTimeForInput(editValue, resolvedTimezone)}
              onBlur={() => {
                const val = inputRef.current?.value;
                save(val || value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  save(inputRef.current?.value || value).then(() => onNavigate?.(e.shiftKey ? 'up' : 'down'));
                } else if (e.key === 'Escape') {
                  setEditValue(value);
                  setIsEditing(false);
                } else if (e.key === 'Tab') {
                  e.preventDefault();
                  save(inputRef.current?.value || value).then(() => onNavigate?.(e.shiftKey ? 'prev' : 'next'));
                }
              }}
              className="h-full w-full px-4 py-2 text-sm border-none outline-none ring-0 bg-transparent min-w-0 text-slate-900"
              type={value && !isNoonUTC(String(value)) ? 'datetime-local' : 'date'}
              max="9999-12-31T23:59"
            />
          </div>
        )}

        {/* Select/Pill Editor Overlay */}
        {isEditing && (column.type === 'select' || column.type === 'pill') && (
          <div className="absolute inset-0 z-30">
            {renderEditor()}
          </div>
        )}

        {isSaving && (
          <div className="absolute right-2 top-2 z-[60]">
            <Loader2 className="h-3 w-3 animate-spin text-sky-500" />
          </div>
        )}
      </div>
    </TableCell>
  );
}
