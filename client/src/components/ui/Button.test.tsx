import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('applies primary variant styles', () => {
    render(<Button variant="primary">Primary</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveClass('bg-accent');
    expect(btn).toHaveClass('text-paper');
    expect(btn).toHaveClass('border-accent');
  });

  it('applies secondary variant styles', () => {
    render(<Button variant="secondary">Secondary</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveClass('bg-surface');
    expect(btn).toHaveClass('text-ink');
    expect(btn).toHaveClass('border-border');
  });

  it('applies size styles', () => {
    render(<Button size="sm">Small</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveClass('text-[11px]');
    expect(btn).toHaveClass('px-3');
    expect(btn).toHaveClass('py-1.5');
  });

  it('applies large size styles', () => {
    render(<Button size="lg">Large</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveClass('text-sm');
    expect(btn).toHaveClass('px-6');
    expect(btn).toHaveClass('py-3');
  });

  it('shows loading state', () => {
    render(<Button isLoading>Loading</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Working');
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders as anchor when as="a" with href', () => {
    render(<Button as="a" href="/test">Link</Button>);
    const link = screen.getByText('Link');
    expect(link).toHaveAttribute('href', '/test');
    expect(link.tagName).toBe('A');
  });
});