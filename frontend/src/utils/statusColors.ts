/**
 * Status color utilities - consistent colors across the app
 * Using GROUP SERVE FACILITIES color palette
 */

export const STATUS_COLORS = {
  completed: '#39A547', // Fresh Green
  in_progress: '#2F88D7', // Bright Blue
  pending: '#F07E2F', // Vibrant Orange
  cancelled: '#E23D3F', // Deep Red
  created: '#1A4D8C', // Dark Blue
  confirm: '#39A547', // Fresh Green
  follow_up: '#F07E2F', // Vibrant Orange
  on_hold: '#E23D3F', // Deep Red
  default: '#E7E9F0', // Light Grey
} as const;

export const getStatusColor = (status: string): string => {
  const normalized = status.toLowerCase().replace(/\s+/g, '_');
  return STATUS_COLORS[normalized as keyof typeof STATUS_COLORS] || STATUS_COLORS.default;
};

export const getStatusChipProps = (status: string) => {
  const normalized = status.toLowerCase().replace(/\s+/g, '_');
  switch (normalized) {
    case 'completed':
      return {
        color: 'success' as const,
        sx: { bgcolor: STATUS_COLORS.completed, color: '#FFFFFF', fontWeight: 500 },
      };
    case 'in_progress':
      return {
        color: 'primary' as const,
        sx: { bgcolor: STATUS_COLORS.in_progress, color: '#FFFFFF', fontWeight: 500 },
      };
    case 'pending':
      return {
        color: 'warning' as const,
        sx: { bgcolor: STATUS_COLORS.pending, color: '#FFFFFF', fontWeight: 500 },
      };
    case 'created':
      return {
        color: 'primary' as const,
        sx: { bgcolor: STATUS_COLORS.created, color: '#FFFFFF', fontWeight: 500 },
      };
    case 'confirm':
      return {
        color: 'success' as const,
        sx: { bgcolor: STATUS_COLORS.confirm, color: '#FFFFFF', fontWeight: 500 },
      };
    case 'follow_up':
      return {
        color: 'warning' as const,
        sx: { bgcolor: STATUS_COLORS.follow_up, color: '#FFFFFF', fontWeight: 500 },
      };
    case 'cancelled':
    case 'on_hold':
      return {
        color: 'error' as const,
        sx: { bgcolor: STATUS_COLORS.cancelled, color: '#FFFFFF', fontWeight: 500 },
      };
    default:
      return {
        color: 'default' as const,
        sx: { bgcolor: STATUS_COLORS.default, color: '#333333', fontWeight: 500 },
      };
  }
};
