INSERT INTO `groups` (`name`, `slug`, `description`, `created_at`, `updated_at`)
SELECT
  '判中 同級生近況ノート',
  'hanchu',
  '久しぶりに会う前に、今どこで何をしているかをゆるく共有する場所です。',
  unixepoch(),
  unixepoch()
WHERE NOT EXISTS (
  SELECT 1 FROM `groups` WHERE `slug` = 'hanchu'
);
