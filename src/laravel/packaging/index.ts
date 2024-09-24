import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

const asset = pulumi.asset;

export class Package extends pulumi.ComponentResource {
  private readonly bucketObject: aws.s3.BucketObjectv2

  constructor(name: string, args: { name: string, projectRoot: string }) {
    super('bref:laravel:Package', name, args);

    const { projectRoot } = args;

    const emptyDirAsset = new asset.AssetArchive({
      '.gitkeep': new asset.StringAsset("\n"),
    });

    this.bucketObject = new aws.s3.BucketObjectv2('Archive', {
      bucket: new aws.s3.Bucket('Code', {
        bucket: `${args.name}-code`
      }),
      key: `${args.name}.zip`,
      source: new asset.AssetArchive({
        'app': new asset.FileArchive(`${projectRoot}/app`),
        'bootstrap': new asset.FileArchive(`${projectRoot}/bootstrap`),
        'config': new asset.FileArchive(`${projectRoot}/config`),
        'database': new asset.FileArchive(`${projectRoot}/database`),
        'lang': new asset.FileArchive(`${projectRoot}/lang`),
        'php': new asset.FileArchive(`${projectRoot}/php`),
        'public': new asset.AssetArchive({
          'build/manifest.json': new asset.FileAsset(`${projectRoot}/public/build/manifest.json`),
          'index.php': new asset.FileAsset(`${projectRoot}/public/index.php`),
        }),
        'resources': new asset.FileArchive(`${projectRoot}/resources`),
        'routes': new asset.FileArchive(`${projectRoot}/routes`),
        'storage': new asset.AssetArchive({
          'app/public': emptyDirAsset,
          'framework/cache': emptyDirAsset,
          'framework/sessions': emptyDirAsset,
          'framework/views': emptyDirAsset,
          'logs': emptyDirAsset,
        }),
        'vendor': new asset.FileArchive(`${projectRoot}/vendor`),
        // Files in the root of the repository
        'artisan': new asset.FileAsset(`${projectRoot}/artisan`),
        'composer.json': new asset.FileAsset(`${projectRoot}/composer.json`),
      }),
    });
  }

  public get nodes() {
    return {
      bucketObject: this.bucketObject,
    }
  }
}
