import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Button vocabulary for "Ink & Signal".
 *
 * `default` is the neutral ink action (`.ink-fill` inverts by theme, so it
 * always opposes its surface). `accent` is the amber signal, reserved for the
 * one action a screen exists to drive — checkout, add-to-cart, save.
 *
 * Both amber variants use `.signal-fill`, which pairs amber with INK text.
 * White on amber is 2.03:1; the previous `bg-accent text-white` pairing
 * inherited from the cobalt palette would have failed AA outright once the
 * accent token became amber. See CLAUDE.md.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'ink-fill',
        destructive: 'bg-error text-white hover:bg-error/90',
        outline:
          'border border-hairline-light bg-transparent text-ink hover:border-ink dark:border-hairline-dark dark:text-white dark:hover:border-white',
        secondary:
          'bg-raised-light text-ink hover:bg-hairline-light dark:bg-raised-dark dark:text-neutral-100 dark:hover:bg-hairline-dark',
        ghost:
          'text-graphite hover:bg-raised-light hover:text-ink dark:hover:bg-raised-dark dark:hover:text-white',
        link: 'text-amber-ink underline-offset-4 hover:underline',
        accent: 'signal-fill',
      },
      size: {
        default: 'h-10 rounded-md px-6 py-2',
        sm: 'h-8 rounded px-4 text-xs',
        lg: 'h-12 rounded-md px-8 text-base',
        icon: 'h-10 w-10 rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
