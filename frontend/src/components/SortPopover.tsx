import { useState, MouseEvent } from 'react';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import SortIcon from '@mui/icons-material/Sort';
import CheckIcon from '@mui/icons-material/Check';

export interface SortOption {
  field: string;
  label: string;
}

interface SortPopoverProps {
  /** Available sort options */
  sortOptions: SortOption[];
  /** Currently active sort field */
  activeSortField?: string;
  /** Current sort direction */
  sortDirection?: 'asc' | 'desc';
  /** Callback when sort changes */
  onSortChange: (field: string, direction: 'asc' | 'desc') => void;
}

/**
 * Common sort popover component for table sorting
 * Shows a sort icon button that opens a popover with sorting options
 */
export default function SortPopover({
  sortOptions,
  activeSortField,
  sortDirection = 'asc',
  onSortChange,
}: SortPopoverProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSortSelect = (field: string) => {
    if (activeSortField === field) {
      // Toggle direction if same field
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      onSortChange(field, newDirection);
    } else {
      // New field, default to ascending
      onSortChange(field, 'asc');
    }
    handleClose();
  };

  return (
    <>
      <IconButton
        size="small"
        onClick={handleClick}
        sx={{
          color: activeSortField ? 'primary.main' : 'text.secondary',
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        }}
      >
        <SortIcon fontSize="small" />
      </IconButton>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            mt: 0.5,
            minWidth: 200,
            borderRadius: 1,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          },
        }}
      >
        <Paper>
          <Stack sx={{ p: 1 }}>
            <Typography variant="caption" sx={{ px: 1.5, py: 1, fontWeight: 600, color: 'text.secondary' }}>
              Sort By
            </Typography>
            <Divider />
            {sortOptions.map((option) => {
              const isActive = activeSortField === option.field;
              return (
                <MenuItem
                  key={option.field}
                  onClick={() => handleSortSelect(option.field)}
                  selected={isActive}
                  sx={{
                    py: 1,
                    px: 1.5,
                    borderRadius: 0.5,
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                    '&.Mui-selected': {
                      backgroundColor: 'action.selected',
                      '&:hover': {
                        backgroundColor: 'action.selected',
                      },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {isActive ? (
                      sortDirection === 'asc' ? (
                        <ArrowUpwardIcon fontSize="small" color="primary" />
                      ) : (
                        <ArrowDownwardIcon fontSize="small" color="primary" />
                      )
                    ) : null}
                  </ListItemIcon>
                  <ListItemText
                    primary={option.label}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 500 : 400,
                      color: isActive ? 'primary.main' : 'text.primary',
                    }}
                  />
                  {isActive && (
                    <CheckIcon fontSize="small" color="primary" sx={{ ml: 1 }} />
                  )}
                </MenuItem>
              );
            })}
          </Stack>
        </Paper>
      </Popover>
    </>
  );
}
