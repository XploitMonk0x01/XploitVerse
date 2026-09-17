import {
  Children,
  cloneElement,
  isValidElement,
  useState,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';
import { cn } from '../../utils/cn';

export interface TabProps extends HTMLAttributes<HTMLButtonElement> {
  value: string;
  disabled?: boolean;
  isActive?: boolean;
  onTabClick?: (value: string) => void;
  variant?: 'default' | 'underline' | 'pills';
}

export interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  variant?: 'default' | 'underline' | 'pills';
  children: ReactNode;
}

export interface TabListProps extends HTMLAttributes<HTMLDivElement> {
  currentValue?: string;
  onTabClick?: (value: string) => void;
  variant?: 'default' | 'underline' | 'pills';
}

export interface TabPanelProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
  isActive?: boolean;
}

export const Tabs = ({
  defaultValue,
  value,
  onChange,
  variant = 'default',
  children,
  className,
  ...props
}: TabsProps) => {
  const [activeTab, setActiveTab] = useState(defaultValue || '');
  const controlled = value !== undefined;
  const currentValue = controlled ? value : activeTab;

  const handleTabClick = (tabValue: string) => {
    if (!controlled) setActiveTab(tabValue);
    onChange?.(tabValue);
  };

  return (
    <div className={cn('', className)} {...props}>
      {Children.map(children, (child) => {
        if (!isValidElement(child)) return child;
        if (child.type === TabList) {
          return cloneElement(child as ReactElement<TabListProps>, {
            currentValue,
            onTabClick: handleTabClick,
            variant,
          });
        }
        if (child.type === TabPanel) {
          const panelChild = child as ReactElement<TabPanelProps>;
          return cloneElement(panelChild, {
            isActive: panelChild.props.value === currentValue,
          });
        }
        return child;
      })}
    </div>
  );
};

export const TabList = ({
  currentValue = '',
  onTabClick,
  variant = 'default',
  className,
  children,
  ...props
}: TabListProps) => {
  return (
    <div
      role="tablist"
      className={cn(
        'flex gap-1',
        variant === 'underline' && 'border-b border-border',
        variant === 'pills' && 'bg-surface p-1 rounded-none',
        className
      )}
      {...props}
    >
      {Children.map(children, (child) => {
        if (!isValidElement(child)) return child;
        const tabChild = child as ReactElement<TabProps>;
        const childValue = tabChild.props.value;
        return cloneElement(tabChild, {
          isActive: childValue === currentValue,
          onTabClick,
          variant,
        });
      })}
    </div>
  );
};

export const Tab = ({
  value,
  isActive = false,
  onTabClick,
  disabled = false,
  variant = 'default',
  className,
  children,
  ...props
}: TabProps) => {
  const handleClick = () => {
    if (!disabled && onTabClick) onTabClick(value);
  };

  const variantStyles: Record<'default' | 'underline' | 'pills', string> = {
    default: cn(
      'px-4 py-2 text-sm font-bold uppercase tracking-wider transition-all font-mono rounded-none',
      isActive
        ? 'bg-accent text-paper border-accent shadow-accent'
        : 'bg-transparent text-muted hover:text-ink hover:bg-surface border-transparent'
    ),
    underline: cn(
      'px-4 py-2 text-sm font-bold uppercase tracking-wider transition-all font-mono border-b-2 -mb-px rounded-none',
      isActive
        ? 'text-accent border-accent'
        : 'text-muted hover:text-ink border-transparent'
    ),
    pills: cn(
      'px-4 py-2 text-sm font-bold uppercase tracking-wider transition-all font-mono rounded-none',
      isActive
        ? 'bg-accent text-paper shadow-accent'
        : 'bg-transparent text-muted hover:text-ink hover:bg-surface'
    ),
  };

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-disabled={disabled}
      value={value}
      onClick={handleClick}
      disabled={disabled}
      className={cn(variantStyles[variant], disabled && 'opacity-40 cursor-not-allowed', className)}
      {...props}
    >
      {children}
    </button>
  );
};

export const TabPanel = ({
  value: _value,
  isActive = false,
  className,
  children,
  ...props
}: TabPanelProps) => {
  if (!isActive) return null;

  return (
    <div
      role="tabpanel"
      className={cn('mt-4 animate-in fade-in duration-150', className)}
      {...props}
    >
      {children}
    </div>
  );
};

export default Tabs;