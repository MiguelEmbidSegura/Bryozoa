"use client";

import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyLinkButton({ href }: { href: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(href);
          toast.success("Link copied");
        } catch {
          toast.error("Could not copy link");
        }
      }}
    >
      <Copy className="mr-2 h-4 w-4" />
      Copy link
    </Button>
  );
}
