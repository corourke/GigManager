import { useState, useRef, KeyboardEvent } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from './ui/command';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { X, Plus, Check } from 'lucide-react';

interface TagsInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  disabled?: boolean;
}

export default function TagsInput({
  value,
  onChange,
  suggestions = [],
  placeholder = 'Add tags...',
  disabled = false
}: TagsInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter suggestions to only show tags not already selected
  const availableSuggestions = suggestions.filter(tag => !value.includes(tag));
  
  // Check if the input matches an available suggestion
  const matchedSuggestion = availableSuggestions.find(
    tag => tag.toLowerCase() === inputValue.toLowerCase().trim()
  );

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !value.includes(trimmedTag)) {
      onChange([...value, trimmedTag]);
      setInputValue('');
      setIsOpen(false);
      inputRef.current?.focus();
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last tag if input is empty and backspace is pressed
      onChange(value.slice(0, -1));
    }
  };

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    if (newValue.trim() && availableSuggestions.length > 0) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Display Selected Tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="pl-2.5 pr-1.5 py-1 text-sm bg-sky-100 text-sky-700 hover:bg-sky-200"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                disabled={disabled}
                className="ml-1.5 rounded-sm hover:bg-sky-300 p-0.5 transition-colors disabled:opacity-50"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input with Suggestions */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex gap-2">
          <PopoverTrigger asChild>
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (inputValue.trim() && availableSuggestions.length > 0) {
                    setIsOpen(true);
                  }
                }}
                placeholder={placeholder}
                disabled={disabled}
                className="pr-10"
              />
              {inputValue.trim() && !matchedSuggestion && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <Badge variant="outline" className="text-xs bg-white">
                    New
                  </Badge>
                </div>
              )}
            </div>
          </PopoverTrigger>
          
          <Button
            type="button"
            onClick={() => {
              if (inputValue.trim()) {
                addTag(inputValue);
              }
            }}
            disabled={disabled || !inputValue.trim()}
            variant="outline"
            size="sm"
            className="px-3"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <PopoverContent 
          className="p-0 w-[var(--radix-popover-trigger-width)]" 
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command>
            <CommandList>
              {availableSuggestions.length > 0 ? (
                <CommandGroup heading="Suggested tags">
                  {availableSuggestions
                    .filter(tag => 
                      tag.toLowerCase().includes(inputValue.toLowerCase().trim())
                    )
                    .map((tag) => (
                      <CommandItem
                        key={tag}
                        value={tag}
                        onSelect={() => addTag(tag)}
                      >
                        <Check className="w-4 h-4 mr-2 opacity-0" />
                        {tag}
                      </CommandItem>
                    ))}
                </CommandGroup>
              ) : (
                <CommandEmpty>No suggestions available</CommandEmpty>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <p className="text-xs text-gray-500">
        Press Enter or click + to add a tag. Select from suggestions or create your own.
      </p>
    </div>
  );
}
