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
      iconColor: 'text-danger',
      iconBg: 'bg-danger/10',
      confirmClass: 'bg-danger text-white hover:bg-danger/90',
    },
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-warn',
      iconBg: 'bg-warn/10',
      confirmClass: 'bg-warn text-bg-base hover:bg-warn/90',
    },
    info: {
      icon: CheckCircle,
      iconColor: 'text-info',
      iconBg: 'bg-info/10',
      confirmClass: 'bg-info text-bg-base hover:bg-info/90',
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
          <div
            className={cn(
              'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md',
              variantStyles.iconBg,
            )}
          >
            <Icon className={cn('h-5 w-5', variantStyles.iconColor)} />
          </div>
          <div className="flex-1">
            <p className="text-sm leading-relaxed text-fg-muted">{message}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-border-subtle pt-4">
          <Button variant="secondary" size="md" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="md"
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
