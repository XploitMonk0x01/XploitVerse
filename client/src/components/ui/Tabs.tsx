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
        variant === 'default' && 'rounded-md border border-border-subtle bg-bg-raised p-1',
        variant === 'underline' && 'border-b border-border',
        variant === 'pills' && 'gap-2',
        className,
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

  const base = 'px-3 py-1.5 text-sm font-medium transition-colors duration-150 ease-tactical';

  const variantStyles: Record<'default' | 'underline' | 'pills', string> = {
    default: cn(
      base,
      'rounded',
      isActive
        ? 'bg-bg-overlay text-fg shadow-card'
        : 'text-fg-muted hover:bg-bg-overlay/50 hover:text-fg',
    ),
    underline: cn(
      base,
      '-mb-px border-b-2',
      isActive ? 'border-accent text-accent' : 'border-transparent text-fg-muted hover:text-fg',
    ),
    pills: cn(
      base,
      'rounded-full',
      isActive
        ? 'bg-accent text-accent-fg'
        : 'border border-border text-fg-muted hover:border-border-strong hover:text-fg',
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
      className={cn(
        variantStyles[variant],
        disabled && 'cursor-not-allowed opacity-40 hover:bg-transparent hover:text-fg-muted',
        className,
      )}
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
    <div role="tabpanel" className={cn('mt-4 animate-fade-in', className)} {...props}>
      {children}
    </div>
  );
};

export default Tabs;
