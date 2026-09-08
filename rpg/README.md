# rpg/ — フィールド探索プロトタイプ

ドット絵のフィールドをヒーローで歩き回るRPGの土台です。ルートにある
「時空英雄譚」とは独立していて、`rpg/index.html` を開くだけで動きます。

- ローカル確認: `python3 -m http.server` などで配信して `http://localhost:8000/rpg/`
  （ES モジュールと `fetch` を使うため、`file://` では動きません）

## いま出来ること

- MCHウォーリアーが8方向にアニメーションしながら歩く（待機 / 歩行 / 攻撃）
- スマホ: 画面左側のどこを触ってもその位置に仮想スティックが出る。倒し具合で速度が変わる
- PC: 矢印キー / WASD で移動、`Space`・`Z`・`Enter` でしらべる、`X`・`Shift` で攻撃
- 草原・森・湖・街道のあるフィールド（64×48タイル）を自由に歩ける。木や岩、水は通れない
- フィールドに8個の宝箱。近づくと `A` プロンプトが出て、開けるとコインが増える
- キャラは木や宝箱の後ろに回り込む（足元のYで並べ替え）

## 操作

| | スマホ | PC |
|---|---|---|
| 移動 | 画面左側をドラッグ（仮想スティック） | 矢印キー / WASD |
| しらべる | `A` ボタン | `Space` / `Z` / `Enter` |
| 攻撃 | `B` ボタン | `X` / `Shift` |

## ファイル構成

```
rpg/
├── index.html            画面（canvas + HUD + 仮想スティック）
├── css/rpg.css
├── js/
│   ├── main.js           起動（ロード → タイトル → ゲーム開始）
│   ├── game.js           メインループ / カメラ / 宝箱とのやり取り
│   ├── input.js          仮想スティック＋キーボード
│   ├── worldmap.js       フィールド生成・当たり判定・描画
│   ├── tiles.js          タイルと木・岩・茂みをコードで描く
│   ├── player.js         ヒーローの移動と当たり判定
│   ├── chest.js          宝箱（閉 / 開く / 開いた状態）
│   ├── hero.js           HeroAnimations マニフェストの読み込み
│   ├── anim.js           コマ送り再生（durations_ms をそのまま使う）
│   ├── particles.js      土ぼこり・金貨・浮き文字
│   └── pixelfont.js      3x5 のビットマップフォント
├── assets/
│   ├── hero_animations.json      マニフェスト（パスをこのフォルダ用に書き換え済み）
│   ├── heroes/16x32/10001/*.png  スプライトシート21枚
│   └── objects/chest.png         宝箱 32x32 × 8コマ
└── tools/build_chest_sprite.py   宝箱スプライトの生成スクリプト
```

地面のタイルと木・岩・茂みは画像を持たず、`tiles.js` が起動時に 16x16 のピクセルを
打って生成しています（seed 固定なので毎回同じ見た目）。画像アセットはヒーローと
宝箱だけです。

## 素材

ヒーローのアニメーションは
[bearko/mycryptoheroes](https://github.com/bearko/mycryptoheroes) の
`Data/HeroAnimations` / `Image/HeroAnimations`（ブランチ `claude/webgl-hero-compendium-mg2u8m`）
から取り込んでいます。

- ヒーローID `10001`（MCHウォーリアー）、`idle` / `walk` は8方向4コマ、`attack` は5方向7コマ
- 左向き3方向（`nw` / `w` / `sw`）は右向きの左右反転で表示（マニフェストの
  `mirrored_directions` に従う）
- コマの表示時間は `durations_ms` をそのまま使用。等速だと攻撃のタメと振りが崩れる
- キャラクターテンプレート: [Eris Esra's Character Templates Pack](https://erisesra.itch.io/character-templates-pack)
  （素材を再配布・改変する場合はテンプレート側のライセンスも要確認）

ヒーローを増やすときは、元リポジトリから該当IDのシートを
`assets/heroes/16x32/<ID>/` にコピーし、`assets/hero_animations.json` に
同じ形式で追記すれば `hero.js` がそのまま読みます。

## 宝箱スプライトの作り直し

マイクリの宝箱アイコン（金地にクリームの縁取り・縦帯・中央の錠前）を元にした
ドット絵です。8コマの内訳は 閉 → ガタッ×2 → 開く×3 → 開いた状態×2。

```bash
pip install Pillow
python3 rpg/tools/build_chest_sprite.py
```

`rpg/assets/objects/chest.png`（256x32）と、目視確認用の `chest_preview.gif` が出ます。
色や形はスクリプト上部のパレットと座標定数で調整できます。

## Vercel で確認する

リポジトリをそのまま静的サイトとして配信できます（ビルド不要）。
RPGは `/rpg/`、ルートの「時空英雄譚」は `/` に出ます。

### 注意: RPGはこのブランチにしか無い

`rpg/` があるのは `claude/rpg-hero-movement-t9z864` だけです。
デフォルトブランチ（`claude/historical-timeslip-rpg-SHwfw`）には無いので、
そちらから作られた本番デプロイでは `/rpg/` は 404 になります。

### プレビューで見る

このブランチに push すると Preview デプロイが作られます。
Deployments 一覧は既定で Production だけ表示されることがあるので、
Environment のフィルタを **All / Preview** にして
`claude/rpg-hero-movement-t9z864` の行を開き、URL末尾に `/rpg/` を付けます。

### 本番URLで見る

次のどちらかです。

- Preview デプロイの「⋯」→ **Promote to Production**（デフォルトブランチはそのまま）
- Settings → Git → **Production Branch** をこのブランチに変更して再デプロイ
- もしくはこのブランチをデフォルトブランチにマージする

### vercel.json

リポジトリ直下の `vercel.json` で `trailingSlash: true` を指定しています。
`/rpg`（末尾スラッシュなし）で開かれると `css/rpg.css` などの相対パスが
ルート側を指してしまうため、必ず `/rpg/` に寄せるための設定です。

Vercel の **Root Directory** を `rpg` にすると `/` が直接RPGになりますが、
その場合は時空英雄譚が配信されなくなり、直下の `vercel.json` も読まれなくなります。

## この先やるなら

- 敵とエンカウント（`attack` モーションは既に読み込み済み）
- マップの切り替え・町・NPC・会話
- 宝箱の中身をアイテム化してインベントリへ
