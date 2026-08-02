import { assetUrl, cn } from "@/lib/utils";

const APP_NAME = "Car Rental";

type BrandLogoProps = {
  className?: string;
};

// Default NocoBase logo mark (light + dark variants).
export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <span
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center overflow-hidden",
        className
      )}
    >
      <img
        src={assetUrl("/logo-mark.png")}
        alt="NocoBase"
        className="size-full object-contain dark:hidden"
      />
      <img
        src={assetUrl("/logo-mark-dark.png")}
        alt="NocoBase"
        className="hidden size-full object-contain dark:block"
      />
    </span>
  );
}

export function BrandWordmark({ className }: BrandLogoProps) {
  return (
    <span
      className={cn(
        "inline-flex h-8 shrink-0 items-center overflow-hidden text-base font-semibold tracking-tight",
        className
      )}
    >
      {APP_NAME}
    </span>
  );
}

type BrandProps = {
  className?: string;
  logoClassName?: string;
  showText?: boolean;
};

// NocoBase logo | App name
export function Brand({
  className,
  logoClassName,
  showText = true,
}: BrandProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <BrandLogo className={logoClassName} />
      {showText && (
        <>
          <span className="h-5 w-px shrink-0 bg-border" aria-hidden="true" />
          <BrandWordmark />
        </>
      )}
    </div>
  );
}
