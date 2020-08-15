# Cinerino Legacy POS API Application

[![CircleCI](https://circleci.com/gh/cinerino/legacy-pos-api.svg?style=svg)](https://circleci.com/gh/cinerino/legacy-pos-api)

## Table of contents

* [Usage](#usage)
* [License](#license)

## Usage

### Environment variables

| Name                               | Required | Value                     | Purpose                        |
| ---------------------------------- | -------- | ------------------------- | ------------------------------ |
| `CINERINO_API_ENDPOINT`            | true     |                           | Cinerino API Settings          |
| `CINERINO_AUTHORIZE_SERVER_DOMAIN` | true     |                           | Chevre API Settings            |
| `CINERINO_CLIENT_ID`               | true     |                           | Chevre API Settings            |
| `CINERINO_CLIENT_SECRET`           | true     |                           | Chevre API Settings            |
| `DEBUG`                            | false    | cinerino-legacy-pos-api:* | Debug                          |
| `NODE_ENV`                         | true     |                           | environment name               |
| `MONGOLAB_URI`                     | true     |                           | MongoDB connection URI         |
| `PROJECT_ID`                       | true     |                           | Project ID                     |
| `REDIS_HOST`                       | true     |                           | redis host                     |
| `REDIS_PORT`                       | true     |                           | redis port                     |
| `REDIS_KEY`                        | true     |                           | redis key                      |
| `RESOURECE_SERVER_IDENTIFIER`      | true     |                           | Resource Server Identifier     |
| `TOKEN_ISSUERS`                    | true     |                           | Token issuers(Comma separated) |
| `WAITER_ENDPOINT`                  | true     |                           | Waiter endpoint                |

## License

ISC
