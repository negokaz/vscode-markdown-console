# Change Log

All notable changes to the "markdown-console" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]
[Unreleased]: https://github.com/negokaz/vscode-markdown-console/compare/v0.10.3...main

## [0.10.3] - 2024-11-30
[0.10.3]: https://github.com/negokaz/vscode-markdown-console/releases/tag/v0.10.3

### Fixed

- 新しいバージョンの VSCode で拡張の読み込みに失敗する問題を解消 [#6](https://github.com/negokaz/vscode-markdown-console/issues/6)

## [0.10.2] - 2024-01-28
[0.10.2]: https://github.com/negokaz/vscode-markdown-console/releases/tag/v0.10.2

### Fixed

- スニペットの余白を調整

## [0.10.1] - 2024-01-12
[0.10.1]: https://github.com/negokaz/vscode-markdown-console/releases/tag/v0.10.1

### Fixed

- VSCode の最新版でスニペットの背景がハイライトされて見づらくなる問題を修正

## [0.10.0] - 2023-08-28
[0.10.0]: https://github.com/negokaz/vscode-markdown-console/releases/tag/v0.10.0

### Changed

- コンテンツが編集されたときに実行可能なコンソール画面をリロードできるように

### Fixed

- コマンド実行中に画面をリサイズしてもターミナル出力が欠落しづらいように修正

## [0.9.0] - 2023-08-16
[0.9.0]: https://github.com/negokaz/vscode-markdown-console/releases/tag/v0.9.0

### Changed

- TOCアイテムのマウスオーバーで見切れているセクション名を確認できるように
- スナップショット上のターミナル出力の折返し位置が画面表示と一致するように変更

## [0.8.1] - 2023-06-29
[0.8.1]: https://github.com/negokaz/vscode-markdown-console/releases/tag/v0.8.1

### Fixed

- コンソールを有効化ボタンを連打するとプロセスが複数起動する問題を修正

## [0.8.0] - 2023-06-19
[0.8.0]: https://github.com/negokaz/vscode-markdown-console/releases/tag/v0.8.0

### Changed

- データディレクトリ名を `markdown-console` から `.markdown-console` に変更
    - これにより自作のディレクトリとデータディレクトリを区別しやすくなります

### Fixed

- 非 ASCII 文字を含むディレクトリにあるスナップショットを VSCode から開けない問題を修正

## [0.7.3] - 2023-06-18
[0.7.3]: https://github.com/negokaz/vscode-markdown-console/releases/tag/v0.7.3

- Initial release
