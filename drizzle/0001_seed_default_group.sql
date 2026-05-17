INSERT INTO `groups` (`name`, `slug`, `description`, `created_at`, `updated_at`)
SELECT
  '大分 2016 同級生近況ノート',
  'oita-2016',
  '久しぶりに会う前に、今どこで何をしているかをゆるく共有する場所です。',
  unixepoch(),
  unixepoch()
WHERE NOT EXISTS (
  SELECT 1 FROM `groups` WHERE `slug` = 'oita-2016'
);
