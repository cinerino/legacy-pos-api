# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/).

## Unreleased

### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security

## v1.6.0 - 2020-12-31

### Changed

- USE_ORDER_CODE設定を追加

## v1.5.1 - 2020-12-04

### Changed

- update @cinerino/sdk

## v1.5.0 - 2020-08-21

### Added

- USE_PROJECTLESS_ROUTER設定を追加

## v1.4.0 - 2020-08-18

### Added

- EXCLUDE_TICKET_TYPES_IN_EVENTS設定を追加

## v1.3.2 - 2020-08-17

### Changed

- request -> node-fetch
- 不要なパッケージを削除

## v1.3.1 - 2020-08-17

### Changed

- リクエストに対するCinerino認証クライアントの設定を調整

## v1.3.0 - 2020-08-17

### Changed

- 全サービスをマルチプロジェクト対応
- WAITER_SCOPEを環境変数化
- オファーカテゴリーの設定に関係なくイベント残席数を取得できるように調整
- 注文取引開始時に販売者を指定できるように調整

## v1.2.0 - 2020-08-16

### Changed

- イベント検索時に認証済のクライアントとしてオファーを検索するように変更

## v1.1.0 - 2020-08-16

### Changed

- chevreからインポートするオファーコード設定を削除
- オファーコード設定を静的に保持しないように調整

## v1.0.0 - 2020-08-16

### Added

- ttts-apiから全サービスを移行
