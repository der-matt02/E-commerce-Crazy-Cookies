interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`skeleton ${className}`} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="product-card-skeleton">
      <div className="product-card-skeleton__image" />
      <div className="product-card-skeleton__body">
        <div className="product-card-skeleton__cat" />
        <div className="product-card-skeleton__name" />
        <div className="product-card-skeleton__footer">
          <div className="product-card-skeleton__price" />
          <div className="product-card-skeleton__btn" />
        </div>
      </div>
    </div>
  );
}
