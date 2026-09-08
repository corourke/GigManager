import { ShieldCheck } from 'lucide-react';
import { DropdownMenuItem, DropdownMenuSeparator } from './ui/dropdown-menu';
import { useAuth } from '../contexts/AuthContext';
import { useNav } from '../routes/useNav';

/**
 * Platform-moderator entry point to the unclaimed-org access-request queue
 * (issue #33/#44). Lives in AppHeader's dropdown — reachable from anywhere,
 * rather than only from the org-picker screen — and renders nothing for
 * anyone who isn't a moderator.
 */
export default function ModeratorQueueMenuItem() {
  const { user } = useAuth();
  const nav = useNav();
  if (!user?.platform_moderator) return null;
  return (
    <>
      <DropdownMenuItem onClick={nav.toModeratorQueue}>
        <ShieldCheck className="w-4 h-4 mr-2" />
        Access Requests
      </DropdownMenuItem>
      <DropdownMenuSeparator />
    </>
  );
}
