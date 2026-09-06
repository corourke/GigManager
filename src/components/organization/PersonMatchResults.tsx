import { Loader2, User as UserIcon } from 'lucide-react';
import type { OrganizationPersonMatch } from '../../services/organization.service';

interface PersonMatchResultsProps {
  matches: OrganizationPersonMatch[];
  isLoading: boolean;
  hasQuery: boolean;
  onSelect: (match: OrganizationPersonMatch) => void;
  emptyHint?: string;
}

/**
 * Renders possible-duplicate / existing-member matches found by
 * usePersonMatches, for the caller to offer "use this person instead of
 * creating a new one." Renders nothing until there's an actual query, so it
 * never implies "no matches" before a search has even happened.
 */
export default function PersonMatchResults({
  matches,
  isLoading,
  hasQuery,
  onSelect,
  emptyHint = "No existing match — you'll create a new person.",
}: PersonMatchResultsProps) {
  if (!hasQuery) return null;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-gray-500">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Checking for an existing match...
      </div>
    );
  }

  if (matches.length === 0) {
    return <p className="text-xs text-gray-500 py-1">{emptyHint}</p>;
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-amber-700">
        Found {matches.length === 1 ? 'a possible match' : `${matches.length} possible matches`} already on this organization:
      </p>
      <div className="border border-amber-200 rounded-lg divide-y bg-amber-50/40 max-h-48 overflow-y-auto">
        {matches.map((m) => (
          <button
            type="button"
            key={m.member_id}
            onClick={() => onSelect(m)}
            className="w-full text-left px-3 py-2 hover:bg-amber-50 flex items-center gap-2"
          >
            <div className="p-1.5 bg-white rounded-full border border-amber-200 shrink-0">
              <UserIcon className="w-3.5 h-3.5 text-amber-700" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm truncate">{m.first_name} {m.last_name}</p>
              <p className="text-xs text-gray-500 truncate">
                {[m.email, m.phone].filter(Boolean).join(' · ') || m.contact_title || m.role}
              </p>
            </div>
            <span className="text-xs text-amber-700 font-medium shrink-0">Use this person</span>
          </button>
        ))}
      </div>
    </div>
  );
}
