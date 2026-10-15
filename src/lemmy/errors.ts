// Plain-English versions of Lemmy's error codes
const messages: Record<string, string> = {
  incorrect_login: 'Wrong username or password.',
  email_not_verified: 'Confirm your email first. Check your inbox for a link from Lemmy.World.',
  registration_application_is_pending: 'Your account is still waiting for a moderator to approve it.',
  registration_denied: 'Lemmy.World turned down this sign-up.',
  registration_closed: 'Lemmy.World isn’t taking new sign-ups right now.',
  missing_totp_token: 'This account uses two-factor login. Enter the code from your authenticator app.',
  incorrect_totp_token: 'That two-factor code didn’t work.',
  captcha_incorrect: 'The captcha answer didn’t match. Try the new image.',
  user_already_exists: 'That username is taken.',
  email_already_exists: 'That email already has an account.',
  email_required: 'An email address is required.',
  passwords_do_not_match: 'The passwords don’t match.',
  invalid_password: 'Passwords need to be 10 to 60 characters.',
  invalid_name: 'Usernames can only use letters, numbers and underscores.',
  registration_application_answer_required: 'Please answer the sign-up question.',
  rate_limit_error: 'Too many tries. Wait a minute and try again.',
  not_logged_in: 'Your login expired. Log in again.',
  locked: 'This post is locked, so it can’t take new comments.',
  deleted: 'That has been deleted.',
  banned_from_community: 'You’re banned from this community.',
  site_ban: 'This account is banned from Lemmy.World.',
  person_is_banned_from_site: 'This account is banned from Lemmy.World.',
  max_comment_depth_reached: 'This thread is too deep to reply to.',
  couldnt_create_comment: 'Couldn’t post that comment.',
  couldnt_create_post: 'Couldn’t create the post.',
  only_mods_can_post_in_community: 'Only moderators can post in this community.',
  couldnt_find_community: 'That community couldn’t be found.',
  invalid_post_title: 'Titles need some text and can’t be longer than 200 characters.',
  invalid_url: 'That link doesn’t look right.',
  url_without_domain: 'That link doesn’t look right.',
  blocked_url: 'Links to that site aren’t allowed on Lemmy.World.',
  invalid_body_field: 'The post text is too long.',
  couldnt_like_post: 'Couldn’t save your vote.',
  couldnt_like_comment: 'Couldn’t save your vote.',
}

export function friendlyError(code?: string) {
  if (!code) return 'Something went wrong.'
  return messages[code] ?? `Something went wrong (${code}).`
}

// For votes and comments: Lemmy answers a missing or expired token with incorrect_login
export function actionError(code?: string) {
  return friendlyError(code === 'incorrect_login' ? 'not_logged_in' : code)
}
