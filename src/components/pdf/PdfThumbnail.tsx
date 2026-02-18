import { useEffect, useRef, useState } from "react";
import { Page } from "react-pdf";
import { Skeleton } from "@/components/ui/skeleton";

interface PdfThumbnailProps {
  pageNumber: number;
}

export function PdfThumbnail({ pageNumber }: PdfThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="rounded-lg border bg-background p-1"
    >
      <div className="flex justify-center overflow-hidden rounded">
        {isVisible ? (
          <Page
            pageNumber={pageNumber}
            width={120}
            renderAnnotationLayer={false}
            renderTextLayer={false}
            loading={
              <Skeleton className="h-[170px] w-[120px]" />
            }
          />
        ) : (
          <Skeleton className="h-[170px] w-[120px]" />
        )}
      </div>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        {pageNumber}
      </p>
    </div>
  );
}
