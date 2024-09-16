import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import * as bref from '@bref.sh/layers';

interface BrefFunctionArgs extends aws.lambda.FunctionArgs {
  phpVersion: string;
}

export class WorkerLambda extends pulumi.ComponentResource {
  private readonly function: aws.lambda.Function

  constructor(name: string, args: BrefFunctionArgs) {
    super('bref:laravel:worker', name, args);

    const region = aws.getRegionOutput();

    this.function = new aws.lambda.Function('Worker', {
      ...args,
      handler: 'Bref\\LaravelBridge\\Queue\\QueueHandler',
      runtime: 'provided.al2',
      layers: pulumi.all([ region.name, args.architectures ]).apply(([ regionName, arch ]) => ([
        bref.functionLayerArn(regionName, args.phpVersion, arch && arch[0] == 'arm64' ? 'arm' : 'x86'),
      ])),
    });
  }

  public bindToQueue(sqsArn: pulumi.Input<string>) {
    new aws.lambda.Permission('Worker', {
      action: "lambda:InvokeFunction",
      function: this.function.name,
      principal: "sqs.amazonaws.com",
      sourceArn: sqsArn,
    });

    new aws.lambda.EventSourceMapping('WorkerQueue', {
      eventSourceArn: sqsArn,
      functionName: this.function.name,
    });
  }

  public get nodes() {
    return {
      function: this.function,
    }
  }
}
