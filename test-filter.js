
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function subDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

function applyDateFilter(items, futureDateFilter, pastDateFilter) {
  if (futureDateFilter === 'none' && pastDateFilter === 'none') return items;
  const now = new Date();
  const future7 = futureDateFilter === 'future-7' ? addDays(now, 7) : null;
  const future14 = futureDateFilter === 'future-14' ? addDays(now, 14) : null;
  const future30 = futureDateFilter === 'future-30' ? addDays(now, 30) : null;
  const past7 = pastDateFilter === 'past-7' ? subDays(now, 7) : null;
  const past14 = pastDateFilter === 'past-14' ? subDays(now, 14) : null;
  const past30 = pastDateFilter === 'past-30' ? subDays(now, 30) : null;
  
  return items.filter((g) => {
    const start = new Date(g.start);
    const matchesFuture =
      futureDateFilter === 'none' ? false :
      future7 ? start >= now && start <= future7 :
      future14 ? start >= now && start <= future14 :
      future30 ? start >= now && start <= future30 :
      start >= now;
    const matchesPast =
      pastDateFilter === 'none' ? false :
      past7 ? start < now && start >= past7 :
      past14 ? start < now && start >= past14 :
      past30 ? start < now && start >= past30 :
      start < now;
    return matchesFuture || matchesPast;
  });
}

const gigs = [
  { id: '1', start: '2026-07-10 12:00:00+00', title: 'Missing Gig' }
];

console.log('Today:', new Date().toString());
console.log('All Dates:', applyDateFilter(gigs, 'none', 'none').length);
console.log('Future All / Past None:', applyDateFilter(gigs, 'future-all', 'none').length);
console.log('Future 30 / Past None:', applyDateFilter(gigs, 'future-30', 'none').length);
console.log('Future 14 / Past None:', applyDateFilter(gigs, 'future-14', 'none').length);
