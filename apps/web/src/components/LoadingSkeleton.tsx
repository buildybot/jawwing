interface LoadingSkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
}

export default function LoadingSkeleton({ width = "100%", height = "12px", className = "" }: LoadingSkeletonProps) {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{
        width,
        height,
        background: "#141414",
      }}
    />
  );
}
