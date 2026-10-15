import { authHeaders, baseUrl, postJson } from './request';

// Only the fields the app uses; Lemmy returns more
export type PostView = {
  post: {
    id: number;
    name: string;
    body?: string;
    url?: string;
    url_content_type?: string;
    thumbnail_url?: string;
    alt_text?: string;
    nsfw: boolean;
    published: string;
  };
  creator: { name: string };
  community: { name: string };
  counts: { score: number; comments: number };
  image_details?: { width: number; height: number };
  // Only sent when logged in: 1 upvoted, -1 downvoted
  my_vote?: number;
};

type GetPostsResponse = {
  posts: PostView[];
  next_page?: string;
};

export type PostsPage = {
  posts: PostView[];
  nextPage?: string;
};

// Leaving out type_ and sort makes the instance use its own homepage defaults
// (or the user's own defaults when logged in).
// Pass the nextPage cursor from the previous page to get the 20 after it.
export async function getHomePosts(pageCursor?: string, jwt?: string | null): Promise<PostsPage> {
  const params = new URLSearchParams({ limit: '20' });
  if (pageCursor) params.set('page_cursor', pageCursor);

  const response = await fetch(`${baseUrl}post/list?${params}`, { headers: authHeaders(jwt) });
  if (!response.ok) {
    throw new Error(`Lemmy request failed: ${response.status}`);
  }
  const data: GetPostsResponse = await response.json();
  return { posts: data.posts, nextPage: data.next_page };
}

// score is 1 to upvote, -1 to downvote, 0 to take a vote back
export async function votePost(jwt: string, postId: number, score: number): Promise<PostView> {
  const data = await postJson<{ post_view: PostView }>('post/like', { post_id: postId, score }, jwt);
  return data.post_view;
}
