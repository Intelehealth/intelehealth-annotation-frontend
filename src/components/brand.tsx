import { cn } from '@/lib/utils'

interface BrandProps {
  size?: 'sm' | 'lg'
}

export function Brand({ size = 'sm' }: BrandProps) {
  return (
    <>
      <img
        src="/intelehealth-logo.png"
        alt="Intelehealth"
        className={cn(
          'w-auto rounded-xl',
          size === 'sm' ? 'h-9' : 'h-11 w-auto rounded-xl sm:h-12',
        )}
      />
      <div>
        <p
          className={cn(
            // G1: sentence case, no tracked capitals.
            'text-muted-foreground',
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
          Data Annotation
        </p>
      </div>
    </>
  )
}
