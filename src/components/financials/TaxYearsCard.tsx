import { useCallback, useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Lock, LockOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { getTaxYears, saveTaxYear, type TaxYear } from '../../services/taxYear.service';
import type { UserRole } from '../../utils/supabase/types';

interface TaxYearsCardProps {
  organizationId: string;
  userRole?: UserRole;
}

/**
 * Filed tax years (#133). Locking a year keeps its purchases' costs, dates,
 * categories and tax treatment as filed; the database enforces it. Admins lock
 * and unlock; Managers see the list.
 */
export default function TaxYearsCard({ organizationId, userRole }: TaxYearsCardProps) {
  const isAdmin = userRole === 'Admin';
  const [years, setYears] = useState<TaxYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyYear, setBusyYear] = useState<number | null>(null);
  const [newYear, setNewYear] = useState(String(new Date().getFullYear() - 1));
  const [filedOn, setFiledOn] = useState('');

  const load = useCallback(async () => {
    try {
      setYears(await getTaxYears(organizationId));
    } catch (err: any) {
      toast.error(err.message || 'Failed to load tax years');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => { load(); }, [load]);

  const save = async (year: number, values: { locked: boolean; filed_on?: string | null }, done: string) => {
    setBusyYear(year);
    try {
      await saveTaxYear(organizationId, year, values);
      toast.success(done);
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save the tax year');
    } finally {
      setBusyYear(null);
    }
  };

  const yearNumber = Number(newYear);
  const validYear = Number.isInteger(yearNumber) && yearNumber >= 2000 && yearNumber <= 2100;

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-gray-900">Filed tax years</h3>
        <p className="text-sm text-gray-600 mt-1 max-w-2xl">
          Once you've filed a year's taxes, lock it. Its purchases' costs, dates, categories and tax treatment
          then stay as filed. You can still track items as equipment and edit descriptions. Unlock a year only to amend a return.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : years.length === 0 ? (
        <p className="text-sm text-gray-500">No years locked yet.</p>
      ) : (
        <table className="w-full max-w-xl text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-gray-500">
              <th className="py-1 font-semibold">Year</th>
              <th className="py-1 font-semibold">Status</th>
              <th className="py-1 font-semibold">Filed on</th>
              {isAdmin && <th className="py-1" />}
            </tr>
          </thead>
          <tbody>
            {years.map(y => (
              <tr key={y.year} className="border-t border-gray-100">
                <td className="py-2 font-mono">{y.year}</td>
                <td className="py-2">
                  {y.locked
                    ? <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-100 border-none"><Lock className="w-3 h-3 mr-1" />Locked</Badge>
                    : <Badge variant="outline" className="text-gray-600"><LockOpen className="w-3 h-3 mr-1" />Open</Badge>}
                </td>
                <td className="py-2 text-gray-700">{y.filed_on ? format(parseISO(y.filed_on), 'MMM d, yyyy') : '—'}</td>
                {isAdmin && (
                  <td className="py-2 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={busyYear === y.year}
                      onClick={() => y.locked
                        ? save(y.year, { locked: false }, `${y.year} unlocked`)
                        : save(y.year, { locked: true }, `${y.year} locked`)}
                    >
                      {y.locked ? 'Unlock' : 'Lock'}
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {isAdmin ? (
        <form
          className="flex flex-wrap items-end gap-3 pt-2 border-t border-gray-100"
          onSubmit={(e) => {
            e.preventDefault();
            if (validYear) save(yearNumber, { locked: true, filed_on: filedOn || null }, `${yearNumber} locked`);
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="tax-year">Tax year</Label>
            <Input id="tax-year" inputMode="numeric" className="w-24 h-9" value={newYear} onChange={(e) => setNewYear(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tax-filed-on">Filed on</Label>
            <Input id="tax-filed-on" type="date" className="w-44 h-9" value={filedOn} onChange={(e) => setFiledOn(e.target.value)} />
          </div>
          <Button type="submit" className="h-9" disabled={!validYear || busyYear !== null}>
            <Lock className="w-4 h-4 mr-1.5" />Lock year
          </Button>
        </form>
      ) : (
        <p className="text-xs text-gray-500">Only Admins can lock or unlock a year.</p>
      )}
    </Card>
  );
}
