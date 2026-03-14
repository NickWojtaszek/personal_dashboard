import React, { forwardRef } from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    hoverEffect?: boolean;
    noPadding?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(({ className = '', hoverEffect = false, noPadding = false, children, ...props }, ref) => {
    return (
        <div
            ref={ref}
            className={`
                bg-white dark:bg-slate-800 
                rounded-xl 
                border border-slate-200 dark:border-slate-700 
                overflow-hidden
                transition-all duration-300 ease-in-out
                ${hoverEffect ? 'hover:border-brand-primary dark:hover:border-brand-secondary hover:shadow-xl hover:shadow-brand-primary/10 dark:hover:shadow-brand-secondary/10' : 'shadow-sm'}
                ${className}
            `}
            {...props}
        >
            <div className={noPadding ? '' : 'p-6'}>
                {children}
            </div>
        </div>
    );
});

Card.displayName = 'Card';

export default Card;
