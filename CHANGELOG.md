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

## v1.12.2 - 2021-06-24

### Changed

- update @cinerino/sdk

## v1.12.1 - 2021-06-20

### Changed

- update @cinerino/sdk

## v1.12.0 - 2021-06-09

### Added

- 施設検索を追加

### Changed

- update @cinerino/sdk

## v1.11.0 - 2021-05-15

### Added

- コンテンツ検索を追加
- 施設コンテンツ検索を追加

### Changed

- 返品取引開始前の注文状態確認処理を追加
- 返品取引開始前に注文クライアントと返品クライアントの同一性を確認
- aws.cognito.signin.user.adminスコープへの許可を廃止
- cinerinoのsomethingスコープを許可するように設定
- posスコープへの許可を廃止
- イベント検索条件拡張
- 返品のための一時的な注文保管を廃止
- 上映日での注文返品を廃止
- 注文取引確定時に金額を指定できるように調整
- 注文金額自動計算を廃止

## v1.10.0 - 2021-03-19

### Changed

- 注文取引確定結果に注文番号を追加
- 注文番号での返品処理に対応
- イベント検索時の取得属性を最適化
- update packages

## v1.9.0 - 2021-03-11

### Added

- 新しいイベント検索を追加

### Removed

- previewルーターを削除

## v1.8.0 - 2021-01-07

### Changed

- PROJECT_ID設定を削除
- USE_PROJECTLESS_ROUTERを削除

## v1.7.0 - 2021-01-02

### Added

- サイネージ専用のイベント検索サービスを追加

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
