import { ComponentResource, Input } from "@pulumi/pulumi";
import { FunctionArgs } from '@pulumi/aws/lambda'
import { ArtisanLambda, WebLambda, WorkerLambda } from './lambda';
import { AssetsBucket } from "./s3";
import { CDN } from "./cdn";
import { Package } from "./packaging";

type ComponentArgs = {
  cdn : {
    assetPaths: string[],
    comment: string,
    domain: {
      name: Input<string>,
      aliases?: Input<string[]>,
      cert: Input<string>,
    },
    webAclId?: Input<string>,
  },
  functions: {
    artisan: FunctionArgs,
    web: FunctionArgs,
    worker: FunctionArgs,
  },
  name: string,
  phpVersion: string,
  projectRoot: string,
  sqsQueueArn: Input<string>,
}

export class BrefLaravel extends ComponentResource {
  private readonly cdn: CDN;

  constructor(name: string, args: ComponentArgs) {
    super('bref:laravel', name, args);

    const archive = new Package('Code', {
      name: args.name,
      projectRoot: args.projectRoot,
    });

    const commonFunctionArgs = {
      phpVersion: args.phpVersion,
      s3Bucket: archive.nodes.bucketObject.bucket,
      s3Key: archive.nodes.bucketObject.key,
      sourceCodeHash: archive.nodes.bucketObject.etag,
    } as const satisfies Partial<FunctionArgs> & { phpVersion: string };

    const artisanLambda = new ArtisanLambda('Artisan', { name: `${args.name}-artisan`, ...commonFunctionArgs, ...args.functions.artisan, });
    const webLambda = new WebLambda('Web', { name: `${args.name}-web`, ...commonFunctionArgs, ...args.functions.web, });
    const workerLambda = new WorkerLambda('Worker', { name: `${args.name}-worker`, ...commonFunctionArgs, ...args.functions.worker, });

    const assetsBucket = new AssetsBucket('Assets', {
      bucket: `${args.name}-assets`,
    });

    this.cdn = new CDN('CDN', {
      assets: {
        paths: args.cdn.assetPaths,
        s3DomainName: assetsBucket.nodes.bucket.bucketRegionalDomainName,
      },
      comment: args.cdn.comment,
      domain: args.cdn.domain,
      name: args.name,
      webAclId: args.cdn.webAclId,
      webFunctionUrl: webLambda.nodes.functionUrl.functionUrl,
    });

    assetsBucket.grantAccessToCDN(this.cdn);
    artisanLambda.enableSchedule();
    webLambda.grantAccessToCDN(this.cdn);
    workerLambda.bindToQueue(args.sqsQueueArn);
  }

  public get nodes() {
    return {
      cdn: this.cdn,
    }
  }
}
