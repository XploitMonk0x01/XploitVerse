import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './Input';

describe('Input', () => {
  it('renders label correctly', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('shows required indicator when required', () => {
    render(<Input label="Email" required />);
    const label = screen.getByText(/email/i).closest('label');
    expect(label).toHaveClass('required');
  });

  it('shows error message', () => {
    render(<Input label="Email" error="Invalid email" />);
    expect(screen.getByRole('alert')).toHaveTextContent(/invalid email/i);
  });

  it('shows hint when no error', () => {
    render(<Input label="Email" hint="Enter your email" />);
    expect(screen.getByText(/enter your email/i)).toBeInTheDocument();
  });

  it('hides hint when error is present', () => {
    render(<Input label="Email" hint="Enter your email" error="Invalid" />);
    expect(screen.queryByText(/enter your email/i)).not.toBeInTheDocument();
  });

  it('handles value changes', () => {
    render(<Input label="Email" defaultValue="test@example.com" />);
    expect(screen.getByLabelText(/email/i)).toHaveValue('test@example.com');
  });

  it('applies error class when error prop is set', () => {
    render(<Input label="Email" error="Invalid" />);
    expect(screen.getByLabelText(/email/i)).toHaveClass('error');
  });

  it('renders icon when provided', () => {
    render(<Input label="Email" icon={() => <span data-testid="icon">📧</span>} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('sets aria-invalid when error', () => {
    render(<Input label="Email" error="Invalid" />);
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('aria-invalid', 'true');
  });
});