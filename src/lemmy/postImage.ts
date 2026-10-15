import type { PostView } from './homePost';

export type PostImage = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
};

// Lemmy sends image info with each post, so this needs no extra request.
// Image posts use the full image; link posts use the preview Lemmy generated.
export function getPostImage({ post, image_details }: PostView): PostImage | null {
  if (post.nsfw) return null;

  const isImagePost = post.url_content_type?.startsWith('image/');
  const src = isImagePost ? post.url : post.thumbnail_url;
  if (!src) return null;

  return {
    src,
    alt: post.alt_text ?? '',
    width: image_details?.width,
    height: image_details?.height,
  };
}
