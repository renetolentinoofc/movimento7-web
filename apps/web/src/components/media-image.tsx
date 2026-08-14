import Image, { type ImageProps } from "next/image";

type MediaImageProps = Omit<ImageProps, "unoptimized">;

function isExternalSource(src: ImageProps["src"]): boolean {
  return typeof src === "string" && /^(?:https?:)?\/\//.test(src);
}

/**
 * Images served by this Next.js application use its optimizer. Absolute URLs
 * are already controlled and derived by the configured media provider, so
 * they keep their original URL instead of depending on an unrestricted image
 * proxy allowlist.
 */
export function MediaImage({ src, alt, ...props }: MediaImageProps) {
  return <Image {...props} src={src} alt={alt} unoptimized={isExternalSource(src)} />;
}
