import MuiCard from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import type { SxProps, Theme } from '@mui/material/styles';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  sx?: SxProps<Theme>;
}

export default function Card({ children, className = '', sx }: CardProps) {
  return (
    <MuiCard
      className={className}
      sx={[
        {
          overflow: 'visible',
          borderRadius: '10px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          border: '1px solid #E7E9F0',
        },
        ...(sx ? (Array.isArray(sx) ? sx : [sx]) : []),
      ]}
    >
      <CardContent sx={{ '&:last-child': { pb: 2 } }}>{children}</CardContent>
    </MuiCard>
  );
}
