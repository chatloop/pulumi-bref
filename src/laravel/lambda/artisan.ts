import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import * as bref from '@bref.sh/layers';

interface BrefFunctionArgs extends aws.lambda.FunctionArgs {
  phpVersion: string;
}

export class ArtisanLambda extends pulumi.ComponentResource {
  private readonly function: aws.lambda.Function;

  constructor(name: string, args: BrefFunctionArgs) {
    super('bref:laravel:ArtisanLambda', name, args);

    const region = aws.getRegionOutput();

    this.function = new aws.lambda.Function('Artisan', {
      ...args,
      handler: 'artisan',
      runtime: 'provided.al2',
      layers: pulumi.all([ region.name, args.architectures ]).apply(([ regionName, arch ]) => ([
        bref.functionLayerArn(regionName, args.phpVersion, arch && arch[0] == 'arm64' ? 'arm' : 'x86'),
        bref.consoleLayerArn(regionName),
      ])),
    });
  }

  public enableSchedule() {
    const artisanEventRule = new aws.cloudwatch.EventRule('Artisan', {
      scheduleExpression: 'cron(* * * * ? *)',
    });

    new aws.lambda.Permission("Artisan", {
      action: "lambda:InvokeFunction",
      function: this.function.name,
      principal: "events.amazonaws.com",
      sourceArn: artisanEventRule.arn,
    });

    new aws.cloudwatch.EventTarget('Artisan', {
      arn: this.function.arn,
      rule: artisanEventRule.name,
      input: '"schedule:run"'
    });
  }

  public get nodes() {
    return {
      function: this.function,
    }
  }
}
