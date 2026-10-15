import { authHeaders, baseUrl, postJson } from './request';

// Only the fields the app uses; Lemmy returns more
export type CommentView = {
  comment: {
    id: number;
    content: string;
    // Reply chain of comment ids, e.g. "0.12.34" is a reply to comment 12
    path: string;
    published: string;
    deleted: boolean;
    removed: boolean;
  };
  creator: { name: string };
  counts: { score: number; child_count: number };
  // Only sent when logged in: 1 upvoted, -1 downvoted
  my_vote?: number;
};

type GetCommentsResponse = {
  comments: CommentView[];
};

type CommentResponse = {
  comment_view: CommentView;
};

// max_depth returns whole reply threads, flattened into one list
export async function getPostComments(postId: number, jwt?: string | null): Promise<CommentView[]> {
  const response = await fetch(
    `${baseUrl}comment/list?post_id=${postId}&sort=Hot&max_depth=8&type_=All`,
    { headers: authHeaders(jwt) },
  );
  if (!response.ok) {
    throw new Error(`Lemmy request failed: ${response.status}`);
  }
  const data: GetCommentsResponse = await response.json();
  return data.comments;
}

// Leave out parentId for a top-level comment; pass a comment id to reply to it
export async function addComment(
  jwt: string,
  postId: number,
  content: string,
  parentId?: number,
): Promise<CommentView> {
  const data = await postJson<CommentResponse>(
    'comment',
    { post_id: postId, content, parent_id: parentId },
    jwt,
  );
  return data.comment_view;
}

// score is 1 to upvote, -1 to downvote, 0 to take a vote back
export async function voteComment(jwt: string, commentId: number, score: number): Promise<CommentView> {
  const data = await postJson<CommentResponse>('comment/like', { comment_id: commentId, score }, jwt);
  return data.comment_view;
}
