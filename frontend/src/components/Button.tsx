import MuiButton from '@mui/material/Button';
import type { SxProps, Theme } from '@mui/material/styles';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  sx?: SxProps<Theme>;
  startIcon?: React.ReactNode;
  component?: React.ElementType;
}

const variantMap: Record<ButtonVariant, 'contained' | 'outlined' | 'text'> = {
  primary: 'contained',
  secondary: 'outlined',
  danger: 'contained',
  ghost: 'text',
};

const sizeMap: Record<ButtonSize, 'small' | 'medium' | 'large'> = {
  sm: 'small',
  md: 'medium',
  lg: 'large',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  type = 'button',
  sx,
  startIcon,
  component,
  ...props
}: ButtonProps) {
  return (
    <MuiButton
      type={type}
      variant={variantMap[variant]}
      size={sizeMap[size]}
      color={variant === 'danger' ? 'error' : 'primary'}
      className={className}
      sx={sx}
      startIcon={startIcon}
      component={component}
      {...props}
    >
      {children}
    </MuiButton>
  );
}
