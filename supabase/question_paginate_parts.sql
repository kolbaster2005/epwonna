-- multi_part: показывать пункты по одному, даже если их ≤ 3.
alter table public.questions add column if not exists paginate_parts boolean;
