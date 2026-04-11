/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { Card, CardContent } from "@/components/ui/card";

type ImageGalleryProps = {
  images: Array<{
    id?: string;
    position?: number;
    originalValue: string;
    url: string | null;
    fileName: string | null;
    author?: string | null;
    isUrl: boolean;
  }>;
};

export function ImageGallery({ images }: ImageGalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const slides = images
    .filter((image) => image.url)
    .map((image) => ({
      src: image.url!,
      title: image.fileName ?? image.originalValue,
      description: image.author ?? undefined,
    }));

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {images.map((image) => {
          const src = image.url ?? null;

          return (
            <Card key={image.id ?? `${image.position}-${image.originalValue}`} className="overflow-hidden">
              <CardContent className="p-0">
                {src ? (
                  <button
                    type="button"
                    onClick={() => setOpenIndex(slides.findIndex((slide) => slide.src === src))}
                    className="group block w-full text-left"
                  >
                    <img
                      src={src}
                      alt={image.fileName ?? image.originalValue}
                      className="h-60 w-full object-cover transition duration-300 group-hover:scale-[1.01]"
                    />
                    <div className="space-y-1 p-4">
                      <p className="truncate text-sm font-medium text-[var(--foreground)]">
                        {image.fileName ?? image.originalValue}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {image.author ?? "Author unknown"}
                      </p>
                    </div>
                  </button>
                ) : (
                  <div className="space-y-2 p-4">
                    <div className="flex h-60 items-center justify-center rounded-[20px] bg-[var(--muted)] text-center text-sm text-[var(--muted-foreground)]">
                      No preview available
                    </div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{image.originalValue}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Stored as file reference only
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Lightbox
        open={openIndex !== null}
        index={openIndex ?? 0}
        close={() => setOpenIndex(null)}
        slides={slides}
      />
    </>
  );
}
