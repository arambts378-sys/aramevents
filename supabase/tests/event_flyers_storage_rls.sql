-- Local-only RLS verification for public flyer and organization-logo ownership.
-- Run after all migrations against a disposable local Supabase database.
-- Fixture rows and all test changes are rolled back.
--
-- Expected: NOTICE 'event-flyers storage RLS: ALL CHECKS PASSED'.

BEGIN;

INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role)
VALUES
  ('30000000-0000-4000-8000-000000000001', 'flyer-owner@test.local', '{"full_name":"Flyer Owner"}', 'authenticated', 'authenticated'),
  ('30000000-0000-4000-8000-000000000002', 'flyer-other@test.local', '{"full_name":"Flyer Other"}', 'authenticated', 'authenticated');

INSERT INTO storage.objects (bucket_id, name)
VALUES
  ('event-flyers', '30000000-0000-4000-8000-000000000001/website_flyers/owner-fixture.png'),
  ('event-flyers', '30000000-0000-4000-8000-000000000002/website_flyers/other-fixture.png'),
  ('organization-logos', '30000000-0000-4000-8000-000000000001/logos/owner-fixture.png'),
  ('organization-logos', '30000000-0000-4000-8000-000000000002/logos/other-fixture.png'),
  ('event-flyers', 'legacy/website_flyers/legacy-owner-fixture.png'),
  ('organization-logos', 'legacy/logos/legacy-owner-fixture.png');

UPDATE storage.objects
SET owner_id = CASE
  WHEN name IN (
    '30000000-0000-4000-8000-000000000001/website_flyers/owner-fixture.png',
    '30000000-0000-4000-8000-000000000001/logos/owner-fixture.png',
    'legacy/website_flyers/legacy-owner-fixture.png',
    'legacy/logos/legacy-owner-fixture.png'
  ) THEN '30000000-0000-4000-8000-000000000001'
  ELSE '30000000-0000-4000-8000-000000000002'
END
WHERE name IN (
  '30000000-0000-4000-8000-000000000001/website_flyers/owner-fixture.png',
  '30000000-0000-4000-8000-000000000002/website_flyers/other-fixture.png',
  '30000000-0000-4000-8000-000000000001/logos/owner-fixture.png',
  '30000000-0000-4000-8000-000000000002/logos/other-fixture.png',
  'legacy/website_flyers/legacy-owner-fixture.png',
  'legacy/logos/legacy-owner-fixture.png'
);

CREATE OR REPLACE FUNCTION pg_temp.as_user(uid UUID) RETURNS void AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pg_temp.as_anon() RETURNS void AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  EXECUTE 'SET LOCAL ROLE anon';
END $$ LANGUAGE plpgsql;

-- The public bucket remains readable, but another authenticated user cannot mutate
-- or replace an uploader's object.
DO $$
DECLARE
  visible_objects INT;
  affected_rows INT;
BEGIN
  PERFORM pg_temp.as_user('30000000-0000-4000-8000-000000000002');

  SELECT count(*) INTO visible_objects
  FROM storage.objects
  WHERE bucket_id = 'event-flyers'
    AND name = '30000000-0000-4000-8000-000000000001/website_flyers/owner-fixture.png';
  IF visible_objects <> 1 THEN RAISE EXCEPTION 'FAIL: public flyer read access changed'; END IF;

  SELECT count(*) INTO visible_objects
  FROM storage.objects
  WHERE bucket_id = 'organization-logos'
    AND name = '30000000-0000-4000-8000-000000000001/logos/owner-fixture.png';
  IF visible_objects <> 1 THEN RAISE EXCEPTION 'FAIL: public logo read access changed'; END IF;

  UPDATE storage.objects
  SET name = name
  WHERE bucket_id = 'event-flyers'
    AND name = 'legacy/website_flyers/legacy-owner-fixture.png';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN RAISE EXCEPTION 'FAIL: another user updated a legacy flyer'; END IF;

  DELETE FROM storage.objects
  WHERE bucket_id = 'event-flyers'
    AND name = 'legacy/website_flyers/legacy-owner-fixture.png';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN RAISE EXCEPTION 'FAIL: another user deleted a legacy flyer'; END IF;

  UPDATE storage.objects
  SET name = name
  WHERE bucket_id = 'organization-logos'
    AND name = 'legacy/logos/legacy-owner-fixture.png';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN RAISE EXCEPTION 'FAIL: another user updated a legacy logo'; END IF;

  DELETE FROM storage.objects
  WHERE bucket_id = 'organization-logos'
    AND name = 'legacy/logos/legacy-owner-fixture.png';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN RAISE EXCEPTION 'FAIL: another user deleted a legacy logo'; END IF;

  UPDATE storage.objects SET name = '30000000-0000-4000-8000-000000000002/website_flyers/overwritten.png'
  WHERE bucket_id = 'event-flyers'
    AND name = '30000000-0000-4000-8000-000000000001/website_flyers/owner-fixture.png';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN RAISE EXCEPTION 'FAIL: user updated another uploader''s flyer'; END IF;

  DELETE FROM storage.objects
  WHERE bucket_id = 'event-flyers'
    AND name = '30000000-0000-4000-8000-000000000001/website_flyers/owner-fixture.png';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN RAISE EXCEPTION 'FAIL: user deleted another uploader''s flyer'; END IF;

  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner_id)
    VALUES (
      'event-flyers',
      '30000000-0000-4000-8000-000000000001/website_flyers/forged.png',
      '30000000-0000-4000-8000-000000000002'
    );
    RAISE EXCEPTION 'FAIL: user uploaded into another uploader''s folder';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  INSERT INTO storage.objects (bucket_id, name, owner_id)
  VALUES (
    'event-flyers',
    '30000000-0000-4000-8000-000000000002/website_flyers/own-upload.png',
    '30000000-0000-4000-8000-000000000002'
  );

  UPDATE storage.objects SET name = '30000000-0000-4000-8000-000000000002/website_flyers/own-updated.png'
  WHERE bucket_id = 'event-flyers'
    AND name = '30000000-0000-4000-8000-000000000002/website_flyers/own-upload.png';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 1 THEN RAISE EXCEPTION 'FAIL: user could not update own flyer'; END IF;

  BEGIN
    UPDATE storage.objects SET name = '30000000-0000-4000-8000-000000000001/website_flyers/stolen.png'
    WHERE bucket_id = 'event-flyers'
      AND name = '30000000-0000-4000-8000-000000000002/website_flyers/own-updated.png';
    RAISE EXCEPTION 'FAIL: user moved own flyer into another uploader''s folder';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  DELETE FROM storage.objects
  WHERE bucket_id = 'event-flyers'
    AND name = '30000000-0000-4000-8000-000000000002/website_flyers/own-updated.png';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 1 THEN RAISE EXCEPTION 'FAIL: user could not delete own flyer'; END IF;

  INSERT INTO storage.objects (bucket_id, name, owner_id)
  VALUES (
    'organization-logos',
    '30000000-0000-4000-8000-000000000002/logos/own-upload.png',
    '30000000-0000-4000-8000-000000000002'
  );

  UPDATE storage.objects
  SET name = '30000000-0000-4000-8000-000000000002/logos/own-updated.png'
  WHERE bucket_id = 'organization-logos'
    AND name = '30000000-0000-4000-8000-000000000002/logos/own-upload.png';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 1 THEN RAISE EXCEPTION 'FAIL: user could not update own organization logo'; END IF;

  BEGIN
    UPDATE storage.objects
    SET name = '30000000-0000-4000-8000-000000000001/logos/stolen.png'
    WHERE bucket_id = 'organization-logos'
      AND name = '30000000-0000-4000-8000-000000000002/logos/own-updated.png';
    RAISE EXCEPTION 'FAIL: user moved own logo into another uploader''s folder';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  DELETE FROM storage.objects
  WHERE bucket_id = 'organization-logos'
    AND name = '30000000-0000-4000-8000-000000000002/logos/own-updated.png';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 1 THEN RAISE EXCEPTION 'FAIL: user could not delete own organization logo'; END IF;

  UPDATE storage.objects
  SET name = '30000000-0000-4000-8000-000000000002/logos/overwritten.png'
  WHERE bucket_id = 'organization-logos'
    AND name = '30000000-0000-4000-8000-000000000001/logos/owner-fixture.png';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN RAISE EXCEPTION 'FAIL: user updated another uploader''s logo'; END IF;

  DELETE FROM storage.objects
  WHERE bucket_id = 'organization-logos'
    AND name = '30000000-0000-4000-8000-000000000001/logos/owner-fixture.png';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN RAISE EXCEPTION 'FAIL: user deleted another uploader''s logo'; END IF;

  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner_id)
    VALUES (
      'organization-logos',
      '30000000-0000-4000-8000-000000000001/logos/forged.png',
      '30000000-0000-4000-8000-000000000002'
    );
    RAISE EXCEPTION 'FAIL: user uploaded into another workspace logo folder';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;
END $$;

-- Existing unprefixed objects remain mutable only by their recorded uploader.
DO $$
DECLARE
  affected_rows INT;
BEGIN
  PERFORM pg_temp.as_user('30000000-0000-4000-8000-000000000001');

  BEGIN
    UPDATE storage.objects
    SET name = '30000000-0000-4000-8000-000000000002/website_flyers/legacy-owner-fixture.png'
    WHERE bucket_id = 'event-flyers'
      AND name = 'legacy/website_flyers/legacy-owner-fixture.png';
    RAISE EXCEPTION 'FAIL: legacy flyer owner moved an object outside their path';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  DELETE FROM storage.objects
  WHERE bucket_id = 'event-flyers'
    AND name = 'legacy/website_flyers/legacy-owner-fixture.png';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 1 THEN RAISE EXCEPTION 'FAIL: legacy flyer owner could not delete its object'; END IF;

  BEGIN
    UPDATE storage.objects
    SET name = '30000000-0000-4000-8000-000000000002/logos/legacy-owner-fixture.png'
    WHERE bucket_id = 'organization-logos'
      AND name = 'legacy/logos/legacy-owner-fixture.png';
    RAISE EXCEPTION 'FAIL: legacy logo owner moved an object outside their path';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  DELETE FROM storage.objects
  WHERE bucket_id = 'organization-logos'
    AND name = 'legacy/logos/legacy-owner-fixture.png';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 1 THEN RAISE EXCEPTION 'FAIL: legacy logo owner could not delete its object'; END IF;
  RESET ROLE;
END $$;

-- Anonymous users retain public read access but cannot add objects.
DO $$
DECLARE
  visible_objects INT;
BEGIN
  PERFORM pg_temp.as_anon();
  SELECT count(*) INTO visible_objects
  FROM storage.objects
  WHERE bucket_id = 'organization-logos'
    AND name = '30000000-0000-4000-8000-000000000001/logos/owner-fixture.png';
  IF visible_objects <> 1 THEN RAISE EXCEPTION 'FAIL: anonymous logo read access changed'; END IF;

  SELECT count(*) INTO visible_objects
  FROM storage.objects
  WHERE bucket_id = 'event-flyers'
    AND name = '30000000-0000-4000-8000-000000000002/website_flyers/other-fixture.png';
  IF visible_objects <> 1 THEN RAISE EXCEPTION 'FAIL: public flyer read access changed for another uploader'; END IF;

  BEGIN
    INSERT INTO storage.objects (bucket_id, name)
    VALUES ('event-flyers', 'anonymous/website_flyers/anonymous-upload.png');
    RAISE EXCEPTION 'FAIL: anonymous user uploaded an event flyer';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO storage.objects (bucket_id, name)
    VALUES ('organization-logos', 'anonymous/logos/anonymous-upload.png');
    RAISE EXCEPTION 'FAIL: anonymous user uploaded an organization logo';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;
END $$;

DO $$ BEGIN RAISE NOTICE 'event-flyers storage RLS: ALL CHECKS PASSED'; END $$;

ROLLBACK;
