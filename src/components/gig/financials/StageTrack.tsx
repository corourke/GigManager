import { cn } from '../../ui/utils';
import { STAGE_PATH, stageLabel, type FinDirection, type FinStage } from '../../../utils/moneyFlow';

/**
 * A row's progress along its stages, as a segmented bar. Stages before the
 * current one are filled; requested only shows when the row started there.
 */
export default function StageTrack({ direction, stage }: { direction: FinDirection; stage: FinStage }) {
  const ended = stage === 'declined' || stage === 'cancelled';
  const steps = STAGE_PATH.filter((s) => s !== 'requested' || stage === 'requested');
  const current = steps.indexOf(stage);

  return (
    <ol
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      aria-label={`Stage: ${stageLabel(direction, stage)}`}
    >
      {steps.map((s, i) => {
        const done = !ended && i <= current;
        return (
          <li key={s} className="flex flex-col gap-1.5 min-w-0" aria-current={i === current ? 'step' : undefined}>
            <span className={cn('h-1.5 rounded-full', done ? (s === 'paid' ? 'bg-green-600' : 'bg-sky-700') : 'bg-gray-200')} />
            <span
              className={cn(
                'text-xs truncate',
                i === current ? 'font-semibold text-sky-800' : done ? 'text-sky-700' : 'text-gray-500',
              )}
            >
              {stageLabel(direction, s)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
