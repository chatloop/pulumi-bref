import * as pulumi from "@pulumi/pulumi";
import * as aws from '@pulumi/aws';

enum CachePolicy {
  'Managed-CachingOptimized' = '658327ea-f89d-4fab-a63d-7e88639e58f6'
}

enum OriginRequestPolicy {
  'Managed-AllViewerExceptHostHeader' = 'b689b0a8-53d0-40ab-baf2-68738e2966ac',
  'Managed-CORS-S3Origin' = '88a5eaf4-2fd4-4709-b370-b4c650ea3fcf',
}

enum ResponseHeadersPolicy {
  'Managed-SecurityHeadersPolicy' = '67f7725c-6f97-4210-82d7-5512b31e9d03'
}

type CDNArgs = {
  assets: {
    paths: string[],
    s3DomainName: pulumi.Input<string>,
  },
  comment: string,
  domain: {
    name: pulumi.Input<string>,
    aliases?: pulumi.Input<string[]>,
    cert: pulumi.Input<string>,
  }
  name: string,
  webFunctionUrl: pulumi.Output<string>,
}

export class CDN extends pulumi.ComponentResource {
  private readonly distribution: aws.cloudfront.Distribution

  constructor(name: string, args: CDNArgs) {
    super('bref:laravel:cdn', name, args);

    const originAccessControlLambda = new aws.cloudfront.OriginAccessControl('Lambda', {
      name: `${args.name}-lambda`,
      originAccessControlOriginType: 'lambda',
      signingBehavior: 'always',
      signingProtocol: 'sigv4',
    });

    const originAccessControlS3 = new aws.cloudfront.OriginAccessControl('S3', {
      name: `${args.name}-s3`,
      originAccessControlOriginType: 's3',
      signingBehavior: 'always',
      signingProtocol: 'sigv4',
    });

    const cachePolicy = new aws.cloudfront.CachePolicy('CachePolicy', {
      name: args.name,
      comment: 'UseOriginCacheControlHeaders Excluding Host Header',
      minTtl: 0,
      defaultTtl: 0,
      maxTtl: 31536000,
      parametersInCacheKeyAndForwardedToOrigin: {
        enableAcceptEncodingBrotli: true,
        enableAcceptEncodingGzip: true,
        cookiesConfig: {
          cookieBehavior: 'none',
        },
        headersConfig: {
          headerBehavior: 'none',
        },
        queryStringsConfig: {
          queryStringBehavior: 'none',
        }
      }
    });

    this.distribution = new aws.cloudfront.Distribution('CDN', {
      aliases: pulumi.all([args.domain.name, args.domain.aliases]).apply(([ name, aliases ]) => [
        name, ...aliases ?? [],
      ]),
      comment: args.comment,
      defaultCacheBehavior: {
        allowedMethods: ['POST', 'PUT', 'PATCH', 'HEAD', 'GET', 'OPTIONS', 'DELETE'],
        cachedMethods: ['HEAD', 'GET', 'OPTIONS'],
        cachePolicyId: cachePolicy.id,
        compress: true,
        originRequestPolicyId: OriginRequestPolicy['Managed-AllViewerExceptHostHeader'],
        responseHeadersPolicyId: ResponseHeadersPolicy['Managed-SecurityHeadersPolicy'],
        targetOriginId: 'api-lambda',
        viewerProtocolPolicy: 'redirect-to-https',
      },
      enabled: true,
      httpVersion: 'http2and3',
      isIpv6Enabled: true,
      orderedCacheBehaviors: args.assets.paths.map((pathPattern) => ({
        allowedMethods: ['HEAD', 'GET', 'OPTIONS'],
        cachedMethods: ['HEAD', 'GET', 'OPTIONS'],
        cachePolicyId: CachePolicy['Managed-CachingOptimized'],
        compress: true,
        originRequestPolicyId: OriginRequestPolicy['Managed-CORS-S3Origin'],
        responseHeadersPolicyId: ResponseHeadersPolicy['Managed-SecurityHeadersPolicy'],
        pathPattern,
        targetOriginId: 'assets-s3',
        viewerProtocolPolicy: 'redirect-to-https',
      })),
      origins: [
        {
          customOriginConfig: {
            httpPort: 80,
            httpsPort: 443,
            originProtocolPolicy: 'https-only',
            originSslProtocols: ['TLSv1.2'],
          },
          domainName: args.webFunctionUrl.apply(url => new URL(url).hostname),
          originAccessControlId: originAccessControlLambda.id,
          originId: 'api-lambda',
        },
        {
          domainName: args.assets.s3DomainName,
          originAccessControlId: originAccessControlS3.id,
          originId: 'assets-s3',
        }
      ],
      priceClass: 'PriceClass_100',
      restrictions: {
        geoRestriction: {
          restrictionType: 'none',
        },
      },
      viewerCertificate: {
        acmCertificateArn: args.domain.cert,
        minimumProtocolVersion: 'TLSv1.2_2021',
        sslSupportMethod: 'sni-only',
      }
    });
  }

  public get nodes() {
    return {
      distribution: this.distribution,
    }
  }
}
