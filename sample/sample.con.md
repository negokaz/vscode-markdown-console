# Sample

実装例です。`Activate  Console` ボタンを押すと実行できるようになります。
Markdown を編集した場合は `Edit` ボタンを押して再び `Activate Console` を押します。

```bash
#@cmd: [bash -c]
echo 'Hello, World!' 
```

```bash
#@cmd: [bash] stdin: true
echo 'Hello, World!' 
```

```bash
#@cmd:[bash -c] tty: true
read -p 'Name?' -s input
echo
echo "Hello, ${input}!"
```

```bash
#@cmd:[bash -c]
for i in $(seq 20)
do
    sleep 1
    echo "${i}"
done
```
