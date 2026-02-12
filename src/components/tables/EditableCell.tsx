import React, { useState, useEffect, useRef } from 'react';
import { Check, Loader2, Search } from 'lucide-react';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { TableCell } from '../ui/table';
import { cn } from '../ui/utils';
import { ColumnDef } from './SmartDataTable';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

interface EditableCellProps<T> {
  value: any;
  column: ColumnDef<T>;
  row: T;
  onSave: (newValue: any) => Promise<void>;
  isSelected: boolean;
  onSelect: () => void;
}

export function EditableCell<T>({
  value,
  column,
  row,
  onSave,
  isSelected,
  onSelect,
}: EditableCellProps<T>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync editValue when value changes externally
  useEffect(() => {
    setEditValue(value);
  }, [value]);

  // Focus input and place cursor at end when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // selectionRange is not supported on type="number"
      if (column.type !== 'checkbox' && column.type !== 'select' && column.type !== 'pill' && column.type !== 'number' && column.type !== 'currency') {
        const length = String(editValue || '').length;
        inputRef.current.setSelectionRange(length, length);
      }
    }
  }, [isEditing, column.type, editValue]);

  const handleDoubleClick = () => {
    if (column.editable && !column.readOnly) {
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
      save();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  const save = async (newValue = editValue) => {
    // For numbers and currency, convert string to number before saving, handle empty string
    const finalValue = (column.type === 'number' || column.type === 'currency') ? (newValue === '' ? null : Number(newValue)) : newValue;

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
    if (!column.editable || column.readOnly) return;
    const newValue = !value;
    setEditValue(newValue);
    save(newValue);
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
        <div 
          className="flex items-center justify-center cursor-pointer" 
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
            handleCheckboxToggle();
          }}
        >
          <div className={cn(
            "h-4 w-4 rounded border flex items-center justify-center transition-colors",
            value ? "bg-sky-500 border-sky-500 text-white" : "border-gray-300 hover:border-sky-400"
          )}>
            {value && (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        </div>
      );
    }

    if (column.type === 'currency') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0);
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
      
      return (
        <Popover open={isEditing} onOpenChange={setIsEditing}>
          <PopoverTrigger asChild>
            <div className="w-full h-full flex items-center px-4 cursor-pointer absolute inset-0 z-20">
              {renderDisplay()}
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
            <Command>
              <CommandInput placeholder={`Search ${column.header.toLowerCase()}...`} />
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem
                      key={String(option.value)}
                      value={String(option.label)}
                      onSelect={() => {
                        setEditValue(option.value);
                        save(option.value);
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
          type={column.type === 'number' ? 'number' : 'text'}
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
          isEditing && (column.type === 'text' || column.type === 'number' || column.type === 'currency') ? "invisible" : "visible"
        )}>
          {renderDisplay()}
        </div>

        {/* Text/Number/Currency Editor: Absolute overlay with EXACT same padding */}
        {isEditing && (column.type === 'text' || column.type === 'number' || column.type === 'currency') && (
          <div className="absolute inset-0 z-40 bg-white flex items-start">
            <input
              ref={inputRef}
              value={editValue ?? ''}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="h-full w-full px-4 py-2 text-sm border-none outline-none ring-0 bg-transparent min-w-0 text-slate-900"
              type={(column.type === 'number' || column.type === 'currency') ? 'number' : 'text'}
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
