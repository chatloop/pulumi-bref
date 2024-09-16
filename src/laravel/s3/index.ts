import { ComponentResource, interpolate } from "@pulumi/pulumi";
import * as aws from '@pulumi/aws';
import { CDN } from "../cdn";

export class AssetsBucket extends ComponentResource {
  private readonly bucket: aws.s3.BucketV2

  constructor(name: string, args: aws.s3.BucketV2Args) {
    super('bref:laravel:assets', name, args);

    this.bucket = new aws.s3.BucketV2('Assets', {
      forceDestroy: true,
      ...args,
    });
  }

  public grantAccessToCDN(cdn: CDN) {
    new aws.s3.BucketPolicy('Assets', {
      bucket: this.bucket.bucket,
      policy: {
        Version: '2012-10-17',
        Statement: [{
          Effect: 'Allow',
          Principal: {
            Service: 'cloudfront.amazonaws.com',
          },
          Action: 's3:GetObject',
          Resource: interpolate `${this.bucket.arn}/*`,
          Condition: {
            StringEquals: {
              'AWS:SourceArn': cdn.nodes.distribution.arn,
            }
          }
        }],
      }
    });
  }

  public get nodes() {
    return {
      bucket: this.bucket,
    }
  }
}
