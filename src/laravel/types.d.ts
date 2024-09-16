declare module '@bref.sh/layers' {
  type Region = string
  type Platform = 'x86' | 'arm'
  type PhpVersion = string
  type LayerArn = string

  function consoleLayerArn(region: Region): LayerArn
  function fpmLayerArn(region: Region, phpVersion: PhpVersion, platform: Platform): LayerArn
  function functionLayerArn(region: Region, phpVersion: PhpVersion, platform: Platform): LayerArn
}
