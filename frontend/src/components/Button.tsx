import MuiButton from '@mui/material/Button';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
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
  ...props
}: ButtonProps) {
  return (
    <MuiButton
      type={type}
      variant={variantMap[variant]}
      size={sizeMap[size]}
      color={variant === 'danger' ? 'error' : 'primary'}
      className={className}
      {...props}
    >
      {children}
    </MuiButton>
  );
}
