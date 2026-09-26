import { Eye, Star } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { ORG_ROLE_CONFIG } from '../../../utils/supabase/constants';
import type { Organization, OrganizationRole } from '../../../utils/supabase/types';
import { useGigParticipantContacts } from '../useGigParticipantContacts';
import ColumnsPicker from './ColumnsPicker';
import GigSection from './GigSection';
import { useColumnVisibility, type ColumnDef } from './useColumnVisibility';

export interface ParticipantRowData {
  id: string;
  role: string;
  is_client?: boolean;
  organization?: Partial<Organization> | null;
}

const COLUMNS: readonly ColumnDef[] = [
  { key: 'role', label: 'Role', required: true },
  { key: 'organization', label: 'Organization', required: true },
  { key: 'contact', label: 'Primary contact' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'address', label: 'Address' },
];

interface GigParticipantsTableProps {
  gigId: string;
  participants: ParticipantRowData[];
  currentOrganizationId: string;
  onViewOrganization?: (org: Partial<Organization>) => void;
}

function ParticipantRow({
  gigId, participant, isYou, isVisible, onViewOrganization,
}: {
  gigId: string;
  participant: ParticipantRowData;
  isYou: boolean;
  isVisible: (key: string) => boolean;
  onViewOrganization?: (org: Partial<Organization>) => void;
}) {
  const org = participant.organization;
  const { data: contacts = [] } = useGigParticipantContacts(gigId, org?.id ?? '');
  const main = contacts[0];
  const roleColor = ORG_ROLE_CONFIG[participant.role as OrganizationRole]?.color ?? 'bg-gray-100 text-gray-700';
  const address = [org?.address_line1, org?.city, org?.state].filter(Boolean).join(', ');
  const phone = main?.user?.phone || org?.phone_number;

  return (
    <tr className="border-b border-border/40 last:border-0">
      <td className="py-1.5 pr-3"><Badge className={`${roleColor} border-0 font-semibold`}>{participant.role}</Badge></td>
      <td className="py-1.5 pr-3 font-semibold">
        {org?.name}
        {isYou && <span className="font-normal text-muted-foreground"> (you)</span>}
        {participant.is_client && <Star aria-label="Client" className="inline w-3.5 h-3.5 ml-1 fill-amber-400 text-amber-500" />}
      </td>
      {isVisible('contact') && (
        <td className="py-1.5 pr-3">
          {main?.user ? `${main.user.first_name} ${main.user.last_name}${main.title ? `, ${main.title}` : ''}` : ''}
        </td>
      )}
      {isVisible('phone') && (
        <td className="py-1.5 pr-3 whitespace-nowrap">
          {phone && <a className="text-sky-700 hover:underline" href={`tel:${phone}`}>{phone}</a>}
        </td>
      )}
      {isVisible('email') && (
        <td className="py-1.5 pr-3">
          {main?.user?.email && <a className="text-sky-700 hover:underline" href={`mailto:${main.user.email}`}>{main.user.email}</a>}
        </td>
      )}
      {isVisible('address') && <td className="py-1.5 pr-3 text-muted-foreground">{address}</td>}
      <td className="py-1.5 w-8 text-right no-print">
        {org && !isYou && onViewOrganization && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" aria-label={`View ${org.name}`} onClick={() => onViewOrganization(org)}>
            <Eye className="w-3.5 h-3.5" />
          </Button>
        )}
      </td>
    </tr>
  );
}

/** Read-only participants table with each org's primary contact (#12). */
export default function GigParticipantsTable({ gigId, participants, currentOrganizationId, onViewOrganization }: GigParticipantsTableProps) {
  const cols = useColumnVisibility('gig.participants', COLUMNS);
  return (
    <GigSection title="Participants" actions={<ColumnsPicker columns={COLUMNS} {...cols} />}>
      {participants.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No participants</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground border-b">
              {COLUMNS.filter((c) => cols.isVisible(c.key)).map((c) => <th key={c.key} className="py-1 pr-3 font-bold">{c.label}</th>)}
              <th className="no-print" />
            </tr>
          </thead>
          <tbody>
            {participants.map((p) => (
              <ParticipantRow
                key={p.id}
                gigId={gigId}
                participant={p}
                isYou={p.organization?.id === currentOrganizationId}
                isVisible={cols.isVisible}
                onViewOrganization={onViewOrganization}
              />
            ))}
          </tbody>
        </table>
      )}
    </GigSection>
  );
}
