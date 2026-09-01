import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Button } from '../../ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../../ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../ui/popover';
import { getGigsForOrganization } from '../../../services/gig.service';

interface GigOption {
  id: string;
  title: string;
  start: string;
  venueName?: string;
  actName?: string;
}

interface GigComboboxProps {
  organizationId: string;
  value: string | null;
  onChange: (gigId: string | null, gigTitle?: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Hide the inline "clear" (X) button — for callers that don't support unassigning here. */
  hideClear?: boolean;
}

export default function GigCombobox({ organizationId, value, onChange, disabled, placeholder = 'Select gig...', hideClear }: GigComboboxProps) {
  const [open, setOpen] = useState(false);
  const [gigs, setGigs] = useState<GigOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!organizationId) return;
    setIsLoading(true);
    getGigsForOrganization(organizationId)
      .then((data: any[]) => {
        setGigs(data.map(g => ({
          id: g.id,
          title: g.title,
          start: g.start,
          venueName: g.venue?.name,
          actName: g.act?.name,
        })));
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [organizationId]);

  const selectedGig = gigs.find(g => g.id === value);

  const formatLabel = (g: GigOption) => {
    const parts = [g.title];
    if (g.start) parts.push(new Date(g.start).toLocaleDateString());
    if (g.venueName) parts.push(g.venueName);
    if (g.actName) parts.push(g.actName);
    return parts.join(' — ');
  };

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="h-8 text-xs justify-between flex-1 font-normal"
          >
            <span className="truncate">
              {selectedGig ? formatLabel(selectedGig) : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[360px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search gigs..." className="h-8 text-xs" />
            <CommandList>
              <CommandEmpty>{isLoading ? 'Loading...' : 'No gigs found.'}</CommandEmpty>
              <CommandGroup>
                {gigs.map(g => (
                  <CommandItem
                    key={g.id}
                    value={`${g.title} ${g.venueName || ''} ${g.actName || ''} ${g.start || ''}`}
                    onSelect={() => {
                      onChange(g.id, g.title);
                      setOpen(false);
                    }}
                    className="text-xs"
                  >
                    <Check className={`mr-2 h-3 w-3 ${value === g.id ? 'opacity-100' : 'opacity-0'}`} />
                    <span className="truncate">{formatLabel(g)}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && !hideClear && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
          onClick={() => onChange(null)}
          disabled={disabled}
          title="Clear gig"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}
