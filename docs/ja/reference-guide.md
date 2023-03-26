# リファレンスガイド

Markdown Console 独自の要素について説明します。

## 実行可能なコードブロック

### Example

```bash
#@cmd:[bash -i] stdin:true tty: true
echo "Hello, World!"
```

コードブロックの **1 行目** に `@cmd:[...]` を記述します。
`@cmd:` よりも前の文字列は無視されるため、言語に応じたコメント開始記号を記述してコメントアウトできます。

### `@cmd`

コードブロックを実行するインタプリタを指定します。

後述する `stdin:true` を指定しない場合、コードブロックの内容はインタプリタの最後の引数として渡されます。

### `stdin`
(default: `false`)

`stdin:true` を指定すると、コードブロックの内容は引数からではなく、標準入力からインタプリタへ渡されるようになります。

### `tty`
(default: `false`)

`tty:true` を指定すると、擬似ターミナル（pseudo-tty）が有効になります。

### `encoding`
(default: `utf-8`)

インタプリタが解釈できる文字エンコーディングを指定します。

## 設定ファイル

設定ファイルを作成すると、次のようなことができます。

- スクリプトを実行する際の環境変数を設定する
- `*.con.md` ファイルに変数を埋め込む

`*.con.md` ファイルが配置されているディレクトリか、それよりも上位のディレクトリにある
`markdown-console.yml` という名前のファイルが、設定ファイルとして読み込まれます。

### 環境変数を設定する

スクリプトを実行する際の環境変数を設定できます。

```yaml
# markdown-console.yml
env:
    PATH: /bin:/usr/bin
```

環境変数の値を Array 形式で表記すると、各文字列が単純に結合されたものが環境変数の値になります。
長くなりすぎた `PATH` を読みやすくするのに便利です。

```yaml
# markdown-console.yml
env:
    PATH:
        - "/bin:"
        - "/usr/bin"
```

既存の環境変数を `{{...}}` 形式で埋め込むこともできます。

```yaml
# markdown-console.yml
env:
    PATH:
        - "/bin:"
        - "/usr/bin:"
        - "{{PATH}}"
```

### 事前定義された環境変数

以下に示す環境変数が設定ファイルや実行スクリプト内で利用可能です。

#### `MDCON_BASE_DIR`

`markdown-console.yml` ファイルがあるディレクトリのパス。

#### `MDCON_WORKING_DIR`

開いている `*.con.md` ファイルがあるディレクトリのパス。

### 変数の埋め込み

`*.con.md` ファイルに変数を埋め込めます。

```yaml
# markdown-console.yml
variable:
    db_server:
        host: 192.168.0.1
        user: db_user
    ap_server:
        host: 192.168.0.2
        user: ap_user
```

`*.con.md` ファイル上では `{{...}}` 形式で変数を参照できます。

```bash
#@cmd:[ssh {{db_server.user}}@{{db_server.host}}]
echo "Hello, World!"
```
次のように解決されます：
```bash
#@cmd:[ssh db_user@192.168.0.1]
echo "Hello, World!"
```

### 特定の設定を上書きする

特定の設定を上書きしたい場合は、`markdown-console_*.yml`（`*` は任意の文字列）という名前のファイルを作成します。

```yaml
# markdown-console_override.yml
variable:
    db_server:
        host: 192.168.10.100
```
