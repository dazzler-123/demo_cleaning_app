import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';

interface SortIconProps {
  /** The field name being sorted */
  field: string;
  /** The currently active sort field */
  activeSortField?: string;
  /** The current sort direction */
  sortDirection?: 'asc' | 'desc';
}

/**
 * Common sort icon component for table headers
 * Shows different icons based on sort state:
 * - UnfoldMoreIcon: Not sorted (default state)
 * - ArrowUpwardIcon: Sorted ascending
 * - ArrowDownwardIcon: Sorted descending
 */
export default function SortIcon({ field, activeSortField, sortDirection }: SortIconProps) {
  const isActive = activeSortField === field;

  if (!isActive) {
    return <UnfoldMoreIcon sx={{ fontSize: 16, color: 'text.disabled', ml: 0.5 }} />;
  }

  return sortDirection === 'asc' ? (
    <ArrowUpwardIcon sx={{ fontSize: 16, color: 'primary.main', ml: 0.5 }} />
  ) : (
    <ArrowDownwardIcon sx={{ fontSize: 16, color: 'primary.main', ml: 0.5 }} />
  );
}
