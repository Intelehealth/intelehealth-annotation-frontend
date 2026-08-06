import { cn } from '@/lib/utils'

interface BrandProps {
  size?: 'sm' | 'lg'
}

export function Brand({ size = 'sm' }: BrandProps) {
  return (
    <>
      <img
        src="/logo.png"
        alt="Logo"
        className={cn(
          'w-auto rounded-xl',
          size === 'sm' ? 'h-10' : 'h-12 w-auto rounded-xl sm:h-[3.25rem]',
        )}
      />
      <div>
        <p
          className={cn(
            'font-mono uppercase tracking-[0.2em] text-gray-500',
            size === 'sm' ? 'text-xs' : 'text-sm',
          )}
        >
          Platform
        </p>
        <p
          className={cn(
            'font-medium text-gray-900',
            size === 'sm' ? 'text-sm' : 'text-lg sm:text-xl',
          )}
        >
          Latent Verify
        </p>
      </div>
    </>
  )
}
