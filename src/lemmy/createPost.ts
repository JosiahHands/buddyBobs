import { baseUrl, postJson } from './request';
import type { PostView } from './homePost';

// Only the fields the app uses; Lemmy returns more
export type CommunityView = {
  community: {
    id: number;
    name: string;
    title: string;
    actor_id: string;
    local: boolean;
    posting_restricted_to_mods: boolean;
  };
  counts: { subscribers: number };
};

export type NewPost = {
  community_id: number;
  name: string;
  url?: string;
  body?: string;
  nsfw?: boolean;
};

// Communities from every instance lemmy.world knows about, biggest first
export async function searchCommunities(query: string): Promise<CommunityView[]> {
  const params = new URLSearchParams({
    q: query,
    type_: 'Communities',
    listing_type: 'All',
    sort: 'TopAll',
    limit: '8',
  });
  const response = await fetch(`${baseUrl}search?${params}`);
  if (!response.ok) {
    throw new Error(`Lemmy request failed: ${response.status}`);
  }
  const data: { communities: CommunityView[] } = await response.json();
  return data.communities;
}

export async function createPost(jwt: string, post: NewPost): Promise<PostView> {
  const data = await postJson<{ post_view: PostView }>('post', post, jwt);
  return data.post_view;
}
