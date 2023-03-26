# 設定ファイル有り（単一）

{{fizz}}

```bash
#@cmd:[bash -c]
set -ex
echo "{{fizz}}"
printenv SSH_ASKPASS
```

- `buzz.aaa`: {{buzz.aaa}}
- `buzz.bbb`: {{buzz.bbb}}
- `buzz.ccc`: {{buzz.ccc}}

```bash
#@cmd:[bash] stdin: true
name="$("${SSH_ASKPASS}" 'Can I ask your name?')"
echo "Hello, ${name}!"
```

## 拡張環境変数

```bash
#@cmd:[bash -c]
set -ex
# ドキュメントがあるディレクトリの絶対パス
printenv MDCON_WORKING_DIR
# 設定ファイルがあるディレクトリの絶対パス
printenv MDCON_BASE_DIR

# 設定ファイル内での拡張環境変数の参照
test "$(printenv TEST_MDCON_WORKING_DIR)" = "$(printenv MDCON_WORKING_DIR)"
test "$(printenv TEST_MDCON_BASE_DIR)" = "$(printenv MDCON_BASE_DIR)"
```

## 拡張環境変数を使って PATH を設定してスクリプトを呼ぶ

```bash
#@cmd:[bash] stdin: true
test.sh
```
