import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from './ui/command';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Search, X, Building2, MapPin, Loader2 } from 'lucide-react';
import { 
  Organization, 
  OrganizationType 
} from '../utils/supabase/types';
import { ORG_TYPE_CONFIG } from '../utils/supabase/constants';
import { searchOrganizations } from '../services/organization.service';

interface OrganizationSelectorProps {
  onSelect: (org: Organization | null) => void;
  selectedOrganization: Organization | null;
  organizationType?: OrganizationType;
  placeholder?: string;
  disabled?: boolean;
}

export default function OrganizationSelector({
  onSelect,
  selectedOrganization,
  organizationType,
  placeholder = 'Search for organization...',
  disabled = false,
}: OrganizationSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Organization[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      // Use API function instead of Edge Function
      const orgs = await searchOrganizations({
        search: query,
        type: organizationType,
      });
      setSearchResults(orgs || []);
    } catch (error) {
      console.error('Error searching organizations:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectOrganization = (org: Organization) => {
    onSelect(org);
    setIsOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemove = () => {
    onSelect(null as any);
  };

  return (
    <div className="space-y-3">
      {/* Display Selected Organization */}
      {selectedOrganization ? (
        <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="p-2 bg-white rounded-lg border border-gray-200">
            <Building2 className="w-4 h-4 text-gray-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm truncate">{selectedOrganization.name}</p>
              <Badge variant="secondary" className={`${ORG_TYPE_CONFIG[selectedOrganization.type].color} text-xs`}>
                {ORG_TYPE_CONFIG[selectedOrganization.type].label}
              </Badge>
            </div>
            {(selectedOrganization.city || selectedOrganization.state) && (
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {[selectedOrganization.city, selectedOrganization.state].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={disabled}
            className="flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
              <Input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => setIsOpen(true)}
                placeholder={placeholder}
                disabled={disabled}
                className="pl-9"
              />
            </div>
          </PopoverTrigger>

          <PopoverContent
            className="p-0 w-[var(--radix-popover-trigger-width)]"
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <Command>
              <CommandList>
                {isSearching ? (
                  <div className="p-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-sky-500" />
                    <p className="text-sm text-gray-600">Searching...</p>
                  </div>
                ) : searchQuery.trim() && searchResults.length > 0 ? (
                  <CommandGroup heading={`Found ${searchResults.length} result${searchResults.length === 1 ? '' : 's'}`}>
                    {searchResults.map((org) => (
                      <CommandItem
                        key={org.id}
                        value={org.id}
                        onSelect={() => handleSelectOrganization(org)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-3 w-full">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <Building2 className="w-4 h-4 text-gray-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm truncate">{org.name}</p>
                              <Badge variant="secondary" className={`${ORG_TYPE_CONFIG[org.type].color} text-xs`}>
                                {ORG_TYPE_CONFIG[org.type].label}
                              </Badge>
                            </div>
                            {(org.city || org.state) && (
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {[org.city, org.state].filter(Boolean).join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : searchQuery.trim() ? (
                  <CommandEmpty>
                    <div className="p-8 text-center">
                      <Building2 className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-900 mb-1">No results found</p>
                      <p className="text-sm text-gray-600">
                        Try a different search term
                      </p>
                    </div>
                  </CommandEmpty>
                ) : (
                  <div className="p-8 text-center">
                    <Search className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      Start typing to search for {organizationType ? ORG_TYPE_CONFIG[organizationType].label.toLowerCase() : 'organizations'}
                    </p>
                  </div>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}