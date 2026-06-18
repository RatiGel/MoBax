'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-surface-light dark:group-[.toaster]:bg-surface-dark group-[.toaster]:text-neutral-900 dark:group-[.toaster]:text-neutral-100 group-[.toaster]:border-border-light dark:group-[.toaster]:border-border-dark group-[.toaster]:shadow-lg group-[.toaster]:rounded-md',
          description: 'group-[.toast]:text-neutral-500 dark:group-[.toast]:text-neutral-400',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-white',
          cancelButton:
            'group-[.toast]:bg-neutral-100 dark:group-[.toast]:bg-neutral-800 group-[.toast]:text-neutral-500 dark:group-[.toast]:text-neutral-400',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
