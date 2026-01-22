import { ArrowLeft, MoreVertical, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface GigHeaderProps {
  gigId: string;
  onBack: () => void;
  onDelete: () => void;
  onDuplicate: (newGigId: string) => void;
}

export default function GigHeader({
  gigId,
  onBack,
  onDelete,
  onDuplicate,
}: GigHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Gigs
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              onDuplicate(gigId);
            }}
          >
            Duplicate Gig
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-red-600">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Gig
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
