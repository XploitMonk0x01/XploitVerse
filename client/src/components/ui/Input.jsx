import { forwardRef } from 'react';

const Input = forwardRef(({
    label,
    error,
    icon: Icon,
    className = '',
    ...props
}, ref) => {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    {label}
                </label>
            )}
            <div className="relative">
                {Icon && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Icon className="h-5 w-5 text-gray-500" />
                    </div>
                )}
                <input
                    ref={ref}
                    className={`
            w-full px-4 py-3 bg-gray-800 border rounded-lg
            text-white placeholder-gray-500
            focus:outline-none focus:ring-1 transition-colors duration-200
            ${Icon ? 'pl-10' : ''}
            ${error
                            ? 'border-cyber-red focus:border-cyber-red focus:ring-cyber-red/40'
                            : 'border-gray-700 focus:border-green-500 focus:ring-green-500/40'
                        }
            ${className}
          `}
                    {...props}
                />
            </div>
            {error && (
                <p className="mt-1 text-sm text-red-500">{error}</p>
            )}
        </div>
    );
});

Input.displayName = 'Input';

export default Input;
