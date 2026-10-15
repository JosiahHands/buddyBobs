import { authHeaders, baseUrl, postJson } from './request';

export type LoginResponse = {
  // Missing when the account still needs email confirmation or approval
  jwt?: string;
  registration_created: boolean;
  verify_email_sent: boolean;
};

export type RegisterForm = {
  username: string;
  password: string;
  password_verify: string;
  email?: string;
  captcha_uuid?: string;
  captcha_answer?: string;
  // Answer to the instance's sign-up question
  answer?: string;
};

export type Captcha = {
  png: string;
  wav: string;
  uuid: string;
};

export function login(usernameOrEmail: string, password: string, totp?: string) {
  return postJson<LoginResponse>('user/login', {
    username_or_email: usernameOrEmail,
    password,
    totp_2fa_token: totp || undefined,
  });
}

export function register(form: RegisterForm) {
  return postJson<LoginResponse>('user/register', form);
}

// Tells Lemmy to stop accepting this token
export function logout(jwt: string) {
  return postJson<unknown>('user/logout', {}, jwt);
}

export async function getCaptcha(): Promise<Captcha | null> {
  const response = await fetch(`${baseUrl}user/get_captcha`);
  if (!response.ok) {
    throw new Error(`Lemmy request failed: ${response.status}`);
  }
  const data: { ok?: Captcha } = await response.json();
  return data.ok ?? null;
}

// The site endpoint includes the logged-in user when sent a token
export async function getMyUsername(jwt: string): Promise<string | null> {
  const response = await fetch(`${baseUrl}site`, { headers: authHeaders(jwt) });
  if (!response.ok) return null;
  const data: { my_user?: { local_user_view: { person: { name: string } } } } = await response.json();
  return data.my_user?.local_user_view.person.name ?? null;
}
