export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD'
  }).format(amount);
};

export const formatDate = (dateString: string): string => {
  // `new Date('2026-01-01')` is parsed as UTC midnight, which renders as
  // Dec 31 for anyone behind UTC. Build the date from its parts instead so
  // stored dates always display as the day they actually are.
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  const date = parts
    ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]))
    : new Date(dateString);

  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};
