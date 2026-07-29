-- The test release intentionally supports only in-app competitor alerts.
drop table if exists public.push_subscriptions;

alter table public.competitor_monitor_settings
  drop column if exists notify_browser;

alter table public.competitor_alerts
  drop column if exists push_sent_at;
