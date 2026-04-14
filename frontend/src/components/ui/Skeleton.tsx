interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`skeleton ${className}`} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-cream">
      <div className="skeleton" style={{ aspectRatio: '1' }} />
      <div className="space-y-2 px-[18px] py-4 pb-5">
        <div className="skeleton h-2.5 w-1/3" />
        <div className="skeleton h-[18px] w-3/4" />
        <div className="flex items-center justify-between pt-1">
          <div className="skeleton h-4 w-20" />
          <div className="skeleton h-[30px] w-[30px] rounded-full" />
        </div>
      </div>
    </div>
  );
}
