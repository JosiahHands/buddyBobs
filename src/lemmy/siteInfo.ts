import { baseUrl } from './request';

// Only the fields the app uses; Lemmy returns more
export type SiteView = {
  site: {
    name: string;
    description?: string;
    icon?: string;
    published: string;
    actor_id: string;
  };
  counts: {
    users: number;
    communities: number;
    comments: number;
    users_active_month: number;
  };
  // Sign-up and voting rules for this instance
  local_site: {
    registration_mode: 'Closed' | 'RequireApplication' | 'Open';
    captcha_enabled: boolean;
    require_email_verification: boolean;
    application_question?: string;
    enable_downvotes: boolean;
    actor_name_max_length: number;
  };
};

type GetSiteResponse = {
  site_view: SiteView;
};

export async function getSiteInfo(): Promise<SiteView> {
  const response = await fetch(`${baseUrl}site`);
  if (!response.ok) {
    throw new Error(`Lemmy request failed: ${response.status}`);
  }
  const data: GetSiteResponse = await response.json();
  return data.site_view;
}
