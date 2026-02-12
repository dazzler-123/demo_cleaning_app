import React from 'react';
import Table from '@mui/material/Table';
import TableContainer from '@mui/material/TableContainer';
import { SxProps, Theme } from '@mui/material/styles';

/** Shared table styles – single source for font size and color across all tables */
const TABLE_FONT_FAMILY = '"Roboto", "Open Sans", "Lato", system-ui, -apple-system, sans-serif';
const TABLE_FONT_SIZE_HEAD = '0.8125rem';   /* 13px – header cells */
const TABLE_FONT_SIZE_BODY = '0.875rem';    /* 14px – body cells */
const TABLE_COLOR = '#333333';              /* primary text */
const TABLE_COLOR_EMPTY = '#666666';        /* empty state / secondary */

interface CompactTableProps {
  children: React.ReactNode;
  containerSx?: SxProps<Theme>;
  tableSx?: SxProps<Theme>;
  stickyHeader?: boolean;
}

/**
 * CompactTable – Single source for all table font color and font size:
 * - Head: fontSize 0.8125rem, fontWeight 600, color white, bg emerald-to-teal gradient
 * - Body: fontSize 0.875rem, fontWeight 400, color #333333
 * - Empty state: use sx={{ color: TABLE_COLOR_EMPTY }} or color="text.secondary" for #666666
 */
export default function CompactTable({ children, containerSx, tableSx, stickyHeader }: CompactTableProps) {
  return (
    <TableContainer
      sx={{
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid #E0E7FF',
        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.1)',
        ...containerSx,
      }}
    >
      <Table
        size="small"
        stickyHeader={stickyHeader}
        sx={{
          fontFamily: TABLE_FONT_FAMILY,
          '& .MuiTableCell-root': {
            fontFamily: TABLE_FONT_FAMILY,
            py: 1.25,
            px: 2,
            borderColor: '#E5E7EB',
            fontSize: TABLE_FONT_SIZE_BODY,
            fontWeight: 400,
            color: TABLE_COLOR,
          },
          '& .MuiTableHead-root .MuiTableCell-root': {
            fontFamily: TABLE_FONT_FAMILY,
            fontWeight: 700,
            fontSize: TABLE_FONT_SIZE_HEAD,
            background: 'linear-gradient(135deg, #10b981 0%, #059669 30%, #0891b2 70%, #06b6d4 100%)',
            color: 'white',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            padding: '16px 12px',
          },
          '& .MuiTableBody-root .MuiTableRow-root': {
            transition: 'background-color 0.2s ease',
          },
          '& .MuiTableBody-root .MuiTableRow-root:hover': {
            backgroundColor: 'rgba(16, 185, 129, 0.05)',
          },
          '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)': {
            backgroundColor: 'rgba(240, 253, 250, 0.5)',
          },
          ...tableSx,
        }}
      >
        {children}
      </Table>
    </TableContainer>
  );
}

export { TABLE_FONT_FAMILY, TABLE_FONT_SIZE_HEAD, TABLE_FONT_SIZE_BODY, TABLE_COLOR, TABLE_COLOR_EMPTY };
