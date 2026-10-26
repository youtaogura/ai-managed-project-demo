# TextField

- 見出しは入力欄の上に `label` の太字・`text-secondary`。必須の項目は「（必須）」を付ける。
- 入力欄は面 `surface-1`、枠 `line`、角丸 10〜12px、高さ `button-height`、左右の余白 14px。文字は `body`。
- フォーカス中は枠を `text-primary` にする。エラーは入力欄の下に `label`・`danger` で出し、枠も `danger`。
- 本のタイトル、書き出しの続き、引用の入力は明朝（`reading` / `quote`）。それ以外は UI の書体。
- 複数行は高さ 120px から、内容に合わせて伸ばす。
- ページ番号の欄は小さく（幅 80px、高さ 40px）、数字キーボード。「なくても大丈夫」と添える。
