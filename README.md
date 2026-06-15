# Japanecho Resources

Japanecho mobile resource packs distributed through GitHub Releases.

## Files

- `resources.json`: remote resource catalog consumed by the mobile app.
- `packs/*.jepack`: installable resource packs. A JEPACK file is a ZIP archive
  with a custom extension.
- `scripts/configure-repository.ps1`: sets the GitHub repository in the remote
  catalog.
- `scripts/publish-release.ps1`: creates or updates a GitHub Release and uploads
  the catalog and packs.

## First Publish

Run `配置并发布资源.bat`, enter a public repository such as
`your-name/japanecho-resources`, then complete GitHub login if prompted.

The generated download catalog is:

`https://github.com/<owner>/<repo>/releases/latest/download/resources.json`

