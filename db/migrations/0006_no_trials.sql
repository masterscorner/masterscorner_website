-- Phase 1: no "free trial class" feature. Everything on MastersCorner is free for now.
alter table orgs alter column offers_trial set default false;
update orgs set offers_trial = false where offers_trial;
