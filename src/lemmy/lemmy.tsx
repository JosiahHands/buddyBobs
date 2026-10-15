import baseUrl from './apiUtils';

// Only the fields the app uses; Lemmy returns more
export type PostView = {
  post: {
    id: number;
    name: string;
    body?: string;
    url?: string;
    published: string;
  };
  creator: { name: string };
  community: { name: string };
  counts: { score: number; comments: number };
};

type GetPostsResponse = {
  posts: PostView[];
  next_page?: string;
};

// Leaving out type_ and sort makes the instance use its own homepage defaults
export async function getHomePosts(): Promise<PostView[]> {
  const response = await fetch(`${baseUrl}api/v3/post/list?limit=20`);
  if (!response.ok) {
    throw new Error(`Lemmy request failed: ${response.status}`);
  }
  const data: GetPostsResponse = await response.json();
  return data.posts;
}
