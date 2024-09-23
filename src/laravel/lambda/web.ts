import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import * as bref from '@bref.sh/layers';

import { CDN } from '../cdn';

interface BrefFunctionArgs extends aws.lambda.FunctionArgs {
  phpVersion: string;
}

export class WebLambda extends pulumi.ComponentResource {
  private readonly function: aws.lambda.Function
  private readonly functionUrl: aws.lambda.FunctionUrl

  constructor(name: string, args: BrefFunctionArgs) {
    super('bref:laravel:WebLambda', name, args);

    const region = aws.getRegionOutput();

    this.function = new aws.lambda.Function('Web', {
      ...args,
      handler: 'public/index.php',
      runtime: 'provided.al2',
      layers: pulumi.all([ region.name, args.architectures ]).apply(([ regionName, arch ]) => ([
        bref.fpmLayerArn(regionName, args.phpVersion, arch && arch[0] == 'arm64' ? 'arm' : 'x86'),
      ])),
    });

    this.functionUrl = new aws.lambda.FunctionUrl('Web', {
      // authorization has been disabled due to CloudFront not being able to sign POST requests
      // if/once this feature is added in the future then this can be enabled to enforce all requests go through CloudFront
      // https://repost.aws/questions/QUbHCI9AfyRdaUPCCo_3XKMQ/lambda-function-url-behind-cloudfront-invalidsignatureexception-only-on-post
      authorizationType: 'NONE',
      functionName: this.function.name,
    });
  }

  public grantAccessToCDN(cdn: CDN) {
    new aws.lambda.Permission('WebCDN', {
      action: 'lambda:InvokeFunctionUrl',
      function: this.function.name,
      principal: 'cloudfront.amazonaws.com',
      sourceArn: cdn.nodes.distribution.arn,
    });
  }

  public get nodes() {
    return {
      function: this.function,
      functionUrl: this.functionUrl,
    }
  }
}
