# 「近況ノート」MVP開発フェーズ

# MVP v0.1

# 技術構成変更

## 方針

Next.jsではなく、React + Viteで開発する。

このアプリはSEOよりも、LINEやInstagramで共有されたURLをスマホで開いて、すぐに近況を入力できる体験が重要。

そのため、Next.jsのSSRやApp Routerは必須ではない。

Cloudflareにデプロイしやすく、HonoやD1との相性がよいReact SPA構成を採用する。

## 採用技術

### フロントエンド

- React
- Vite
- TypeScript
- Tailwind CSS
- React Router
- React Hook Form
- Zod

### バックエンド

- Hono
- TypeScript
- Cloudflare Workers

### DB

- Cloudflare D1
- Drizzle ORM

### 画像保存

- Cloudflare R2

### デプロイ

- フロントエンド：Cloudflare Pages
- API：Cloudflare Workers

## 採用理由

- スマホ向けSPAとして作りやすい
- Cloudflareに載せやすい
- Next.js特有の実行環境差分で詰まりにくい
- Hono + D1 + R2との相性がよい
- MVPを早く作れる
- 無料枠で始めやすい

## 非採用

### Next.js

SEOやSSRが必須ではないため、MVPでは採用しない。

### PostgreSQL

Cloudflareに寄せたいので、MVPではD1を採用する。

将来的に複雑な集計や大規模データが必要になった場合は、PostgreSQLへの移行を検討する。

## MVPのゴール

中学校・小学校の同級生にURLを送って、スマホから近況を入力してもらい、一覧で見られる状態を作る。

最初の成功条件はこれ。

- グループを1つ作れる
- 共有URLを発行できる
- スマホで近況を入力できる
- 投稿が一覧に溜まる
- 最低10人に入力してもらえる
- 幹事が「これ普通に使える」と思える

---

## Phase 0：設計・準備

### 目的

作る範囲を決めて、開発を始められる状態にする。

### 作るもの

- 画面設計
- DB設計
- API設計
- 技術構成決定
- GitHubリポジトリ作成
- デプロイ先決定

### 技術構成

フロントエンド：
React + TypeScript + Vite + Tailwind CSS

バックエンド：
Hono + TypeScript

DB：
Supabase PostgreSQL

ORM：
Drizzle ORM

画像保存：
最初はなし。
後でCloudflare R2。

デプロイ：
Vercel or Cloudflare Pages

### 完了条件

ローカルでフロントとAPIが起動できる。
DBに接続できる。
最低限の画面遷移ができる。

---

## Phase 1：URL共有で近況を集める最小版

### 目的

一番大事な体験を作る。

URLを送る。
同級生が入力する。
投稿が一覧に溜まる。

ここだけ作る。

### 作る画面

#### 1. グループホーム画面

URL例。

`/g/oita-2016`

表示するもの。

- アプリ名
- グループ名
- 説明文
- 共有URL
- 近況入力ボタン
- 最近の近況3件
- みんなの近況へのリンク

#### 2. 近況入力画面

URL例。

`/g/oita-2016/new`

入力項目。

- 名前
- 当時の呼び名
- 今住んでいる地域
- 仕事
- 近況コメント
- SNS

画像はまだ入れない。

#### 3. みんなの近況画面

URL例。

`/g/oita-2016/feed`

表示するもの。

- 投稿一覧
- 名前
- 地域
- 仕事
- コメント
- 投稿日

### 作るAPI

GET /api/groups/:slug

POST /api/groups/:slug/classmates

GET /api/groups/:slug/classmates

### DB

最低限これだけ。

- groups
- classmates

### 完了条件

1つの固定グループで、URLから近況を投稿できる。
投稿した内容が一覧に表示される。
スマホで問題なく使える。

### この時点では不要

- ログイン
- 課金
- 画像アップロード
- 管理画面
- CSV
- カスタム質問
- 合言葉
- 投稿編集

まずは「使えるか」を見る。

---

## Phase 2：グループ作成機能

### 目的

自分以外の人でもグループを作れるようにする。

### 作る画面

#### 1. グループ作成画面

URL例。

`/groups/new`

入力項目。

- 学校名
- 卒業年度
- グループ名
- 説明文

#### 2. 作成完了画面

表示するもの。

- 作成された共有URL
- URLコピーボタン
- グループホームへ移動するボタン

### 作るAPI

POST /api/groups

### 追加する仕様

- slugを自動生成
- 同じslugがあれば重複回避
- グループ作成時点ではログインなしでもOK

### 完了条件

ユーザーが自分でグループを作れる。
共有URLをコピーできる。
作ったURLから近況入力と一覧表示ができる。

### 注意

この時点ではログインなしなので、作成者本人だけが管理できる仕組みはまだ弱い。

ただしMVPなら、まずはこれでいい。

---

## Phase 3：管理者機能

### 目的

幹事が投稿を管理できるようにする。

### 作る画面

#### 管理画面

URL例。

`/g/oita-2016/admin`

できること。

- 投稿一覧を見る
- 投稿を非表示にする
- 投稿を削除する
- グループ情報を編集する

### 管理者認証

MVPでは簡易パスワードでよい。

グループ作成時に管理用パスワードを設定する。

管理URL + パスワードで管理画面に入れる。

### DB追加

groups.admin_password_hash

classmates.status

classmatesのstatus。

- published
- hidden
- deleted

### 作るAPI

GET /api/groups/:slug/admin/classmates

PATCH /api/classmates/:id

DELETE /api/classmates/:id

PATCH /api/groups/:slug

### 完了条件

幹事が不適切な投稿を非表示・削除できる。
グループ名や説明文を編集できる。

---

## Phase 4：公開範囲と合言葉

### 目的

個人情報まわりの安心感を上げる。

### 作るもの

#### 投稿ごとの公開範囲

近況入力時に選べるようにする。

- 全員に公開
- 幹事だけに公開
- 非公開

#### グループの合言葉

グループ閲覧時に合言葉を求める。

例。

担任の先生の名前は？

### 画面

#### 合言葉入力画面

このグループを見るには合言葉が必要です。

入力欄。

- 合言葉

### DB追加

groups.passcode_hash

groups.visibility

classmates.visibility

### 完了条件

合言葉を知っている人だけがグループを見られる。
投稿ごとに公開範囲を選べる。
幹事だけ公開の投稿は一覧に出ない。

---

## Phase 5：画像アップロード

### 目的

近況に写真をつけられるようにする。

ただし、画像はコストと荒らし対応があるので、ここで追加する。

### 作るもの

- 写真アップロード
- サムネイル表示
- 画像削除
- ファイルサイズ制限
- ファイル形式制限

### 保存先

Cloudflare R2

### 制限

- JPG / PNG
- 最大5MB
- 1投稿1枚まで

### DB追加

classmate_images

### 作るAPI

POST /api/uploads/presigned-url

POST /api/classmates/:id/images

DELETE /api/images/:id

### 完了条件

スマホから写真を1枚アップロードできる。
近況一覧にサムネイルが表示される。
詳細画面で写真を見られる。
幹事が画像付き投稿を削除できる。

---

## Phase 6：有料プランの見せ方だけ作る

### 目的

まだ決済は入れず、課金ニーズを見る。

### 作る画面

#### 有料プラン画面

URL例。

`/g/oita-2016/upgrade`

表示するもの。

- カスタム質問
- CSV出力
- 写真投稿
- 合言葉設定
- 管理者承認制
- 回答数上限解除

### ボタン

最初は決済ではなく、これでいい。

有料プランに興味がある

押したらDBに記録する。

### DB追加

upgrade_interests

### 完了条件

有料プラン画面を見られる。
興味ありボタンを押せる。
どのグループで何回押されたか分かる。

### ここで見ること

幹事が課金に興味を持つか。
CSVやカスタム質問に需要があるか。
写真投稿に価値を感じるか。

---

## Phase 7：CSV出力

### 目的

幹事向けの実用価値を作る。

### 作るもの

管理画面からCSVをダウンロードできる。

### CSV項目

- 名前
- 当時の呼び名
- 地域
- 仕事
- 近況コメント
- SNS
- 公開範囲
- 投稿日

### 作るAPI

GET /api/groups/:slug/export.csv

### 完了条件

幹事が投稿データをCSVで出力できる。
Googleスプレッドシートで開ける形式になっている。

### 課金との関係

CSV出力は有料機能候補。

ただし最初は無料で試してもいい。

使われるなら課金価値あり。

---

## Phase 8：カスタム質問

### 目的

有料化しやすい機能を作る。

### 作るもの

幹事が質問項目を追加できる。

### 質問タイプ

MVPでは3つだけでいい。

- テキスト
- 単一選択
- 複数選択

年収レンジも単一選択で作れる。

### 画面

#### カスタム質問管理画面

できること。

- 質問追加
- 質問編集
- 質問削除
- 並び替え

#### 近況入力画面

通常項目の下にカスタム質問を表示する。

### DB追加

custom_questions

custom_answers

### 完了条件

幹事が質問を追加できる。
回答者のフォームに追加質問が表示される。
回答内容が投稿に紐づいて保存される。
管理画面で回答を確認できる。

---

## Phase 9：Stripe決済

### 目的

実際に課金できるようにする。

### 課金方式

最初はグループ単位の買い切り。

Plus：980円 / グループ

Pro：2,980円 / グループ

### 作るもの

- Stripe Checkout
- 決済完了ページ
- 決済キャンセルページ
- Webhook
- グループのplan更新

### 作るAPI

POST /api/groups/:id/checkout

POST /api/stripe/webhook

### DB追加

payments

groups.plan

### 完了条件

Stripeで決済できる。
決済完了後にグループのプランがplus/proになる。
有料機能が解放される。

---

## 最短で公開するならここまで

### 最短MVP

Phase 1

Phase 2

Phase 3

つまり、

- グループ作成
- 共有URL発行
- 近況入力
- 一覧表示
- 管理者削除

ここまでできれば一旦人に使ってもらえる。

---

## 実用MVP

Phase 1

Phase 2

Phase 3

Phase 4

Phase 5

ここまでできると、かなりそれっぽい。

- グループ作成
- URL共有
- 近況入力
- 一覧表示
- 管理者管理
- 合言葉
- 公開範囲
- 画像アップロード

同級生に送っても恥ずかしくないレベル。

---

## 課金検証MVP

Phase 1

Phase 2

Phase 3

Phase 4

Phase 6

Phase 7

画像や決済より先に、課金ニーズを見たいならこれ。

- URL共有
- 入力
- 一覧
- 管理画面
- 合言葉
- 有料プラン画面
- CSV出力
- 興味ありボタン

この状態で、

CSV使いたい？

カスタム質問ほしい？

写真投稿にお金払う？

を見られる。

---

## 個人的なおすすめ順

いきなり決済や画像を入れない。

まずはこれ。

### Step 1

Phase 1：URL共有で近況を集める

ここでアプリの核を作る。

### Step 2

Phase 2：グループ作成

Phase 3：管理者機能

他の人も使える状態にする。

### Step 3

Phase 4：合言葉・公開範囲

安心して使えるようにする。

### Step 4

Phase 6：有料プラン画面

Phase 7：CSV出力

課金ポイントを検証する。

### Step 5

Phase 5：画像アップロード

Phase 8：カスタム質問

Phase 9：Stripe決済

反応があれば本格化。

---

## 最初のリリース判定

### v0.1

固定グループで投稿できる

リリース対象。

自分だけ。

### v0.2

グループを作成できる。
URL共有できる。
投稿が一覧に出る。

リリース対象。

友達1〜2人。

### v0.3

管理者削除できる。
スマホUIが整っている。

リリース対象。

同級生10人。

### v0.4

合言葉がある。
公開範囲を選べる。

リリース対象。

クラスLINEに投げられる。

### v0.5

CSV出力できる。
有料プラン画面がある。

リリース対象。

幹事にヒアリングできる。

### v1.0

画像投稿。
カスタム質問。
Stripe決済。

リリース対象。

外部ユーザーにも公開。

---

## 最初に実装するタスク一覧

### 1. プロジェクト作成

- Vite + React + TypeScript
- Hono API
- Tailwind CSS

### 2. DB作成

- groups
- classmates

### 3. 画面作成

- /g/:slug
- /g/:slug/new
- /g/:slug/feed

### 4. API作成

- GET /api/groups/:slug
- POST /api/groups/:slug/classmates
- GET /api/groups/:slug/classmates

### 5. 投稿フォーム作成

- React Hook Form
- Zod validation

### 6. 投稿一覧作成

- 投稿カード表示
- 新しい順

### 7. スマホUI調整

- 下部ナビゲーション
- 1カラム
- 大きめボタン
- 入力しやすいフォーム

---

## まず作るべきMVPの範囲

最初はこれでいい。

グループは手動でDBに1件作る。
URLは /g/oita-2016 固定。
そのURLから近況入力できる。
投稿が一覧に表示される。

この段階ではグループ作成すら不要。

なぜなら、一番確認したいのは、

同級生は本当に入力してくれるのか？
入力フォームは面倒じゃないか？
一覧を見るのは楽しいか？

だから。

グループ作成や課金は、そのあとでいい。

---

## 最小DB

### groups

- id
- name
- slug
- description
- created_at
- updated_at

### classmates

- id
- group_id
- name
- nickname
- current_location
- job
- comment
- sns_url
- visibility
- status
- created_at
- updated_at

---

## 最小画面

ホーム
↓
近況入力
↓
送信完了
↓
みんなの近況

---

## 最小機能

投稿する。
見る。
削除する。

この3つだけ。

これができればMVPとしては十分。
