import type { HTMLAttributes, ReactNode } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { cn } from '../../utils/cn';

export interface ConfirmDialogProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onClose'> {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  confirmIcon?: ReactNode;
}

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  confirmIcon,
  ...props
}: ConfirmDialogProps) => {
  const variantStyles = {
    danger: {
      icon: AlertTriangle,
      iconColor: 'text-error',
      borderColor: 'border-error/30',
      confirmClass: 'bg-error hover:bg-error/90 border-error text-paper',
      iconBg: 'bg-error/10',
    },
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-warning',
      borderColor: 'border-warning/30',
      confirmClass: 'bg-warning hover:bg-warning/90 border-warning text-paper',
      iconBg: 'bg-warning/10',
    },
    info: {
      icon: CheckCircle,
      iconColor: 'text-info',
      borderColor: 'border-info/30',
      confirmClass: 'bg-info hover:bg-info/90 border-info text-paper',
      iconBg: 'bg-info/10',
    },
  }[variant];

  const Icon = variantStyles.icon;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="md"
      showCloseButton={true}
      closeOnOverlayClick={!isLoading}
      closeOnEscape={!isLoading}
      {...props}
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <div className={cn('w-10 h-10 flex items-center justify-center rounded-none flex-shrink-0', variantStyles.iconBg, variantStyles.borderColor)}>
            <Icon className={cn('w-5 h-5', variantStyles.iconColor)} />
          </div>
          <div className="flex-1">
            <p className="text-sm text-ink font-mono leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
            disabled={isLoading}
            className={variantStyles.confirmClass}
            aria-label={confirmText}
          >
            {confirmIcon && <span className="mr-1.5">{confirmIcon}</span>}
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;