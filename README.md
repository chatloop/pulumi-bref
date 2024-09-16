# Pulumi Bref

A Pulumi construct to deploy a Laravel application using brefphp

## Installation

```shell
npm config set --location=project @chatloop:registry=https://npm.pkg.github.com
npm install @chatloop/pulumi-bref
```

## Usage

This is purely just an example you may tweak to suit your needs.

```ts
import { BrefLaravel } from "@chatloop/pulumi-bref";
import * as aws from '@pulumi/aws';

const commonFunctionArgs = {
  architectures: ['arm64'],
  environment: {
    variables: {
      API_URL: 'https://example.com'
    },
  },
  memorySize: 2048,
  role: 'arn:aws:iam:...',
  // optional - associate lambdas to a vpc
  vpcConfig: {
    securityGroupIds: [...],
    subnetIds: [...],
  },
} as const satisfies Partial<aws.lambda.FunctionArgs>;

const brefApp = new BrefLaravel('App', {
  name: 'pulumi-bref-example',
  phpVersion: '8.2',
  projectRoot: '/example', // folder path to the laravel app src code
  sqsQueueArn: 'arn:aws:sqs:...',
  cdn: {
    assetPaths: ['build/*', 'img/*', 'vendor/*', 'favicon.ico', 'robots.txt'],
    comment: 'My Example API CDN',
    domain: {
      name: 'bref.example.com',
      aliases: [...],
      // this ACM ARN must exist in us-east-1
      cert: 'arn:aws:acm:...',
    },
  },
  functions: {
    artisan: {
      ...commonFunctionArgs,
      description: 'My Example API Artisan',
      timeout: 120,
    },
    web: {
      ...commonFunctionArgs,
      description: 'My Example API Web',
      timeout: 30,
    },
    worker: {
      ...commonFunctionArgs,
      description: 'My Example API Worker',
      timeout: 600,
    },
  },
});
```
