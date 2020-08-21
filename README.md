# Cinerino Legacy POS API Application

[![CircleCI](https://circleci.com/gh/cinerino/legacy-pos-api.svg?style=svg)](https://circleci.com/gh/cinerino/legacy-pos-api)

## Table of contents

* [Usage](#usage)
* [License](#license)

## Usage

### Environment variables

| Name                          | Required | Value                     | Purpose                        |
| ----------------------------- | -------- | ------------------------- | ------------------------------ |
| `CINERINO_API_ENDPOINT`       | true     |                           | Cinerino API Settings          |
| `DEBUG`                       | false    | cinerino-legacy-pos-api:* | Debug                          |
| `PROJECT_ID`                  | true     |                           | Project ID                     |
| `REDIS_HOST`                  | true     |                           | redis host                     |
| `REDIS_PORT`                  | true     |                           | redis port                     |
| `REDIS_KEY`                   | true     |                           | redis key                      |
| `RESOURECE_SERVER_IDENTIFIER` | true     |                           | Resource Server Identifier     |
| `TOKEN_ISSUERS`               | true     |                           | Token issuers(Comma separated) |
| `USE_PROJECTLESS_ROUTER`      | true     |                           | Projectless router use flag    |
| `WAITER_ENDPOINT`             | true     |                           | Waiter endpoint                |
| `WAITER_SCOPE`                | true     |                           | Waiter scope                   |

## License

ISC
