$ErrorActionPreference = 'Stop'
# Only the explicitly recorded Windows-only version may be promoted here.
$planPath = 'desktop/windows-publication.json'
if (!(Test-Path $planPath)) { exit 0 }
$plan = Get-Content $planPath | ConvertFrom-Json
$version = (Get-Content desktop/release.json | ConvertFrom-Json).version
if ($plan.version -ne $version) { Write-Output 'No Windows-only publication plan for this version.'; exit 0 }
$tag = "v$version"
$repo = $env:GITHUB_REPOSITORY
$release = gh release view $tag --json isDraft,assets | ConvertFrom-Json
if ($LASTEXITCODE) { throw 'Cannot inspect candidate release' }
$ref = gh api "repos/$repo/git/ref/tags/$tag" | ConvertFrom-Json
if ($LASTEXITCODE -or $ref.object.type -ne 'commit' -or $ref.object.sha -ne $env:GITHUB_SHA) {
  throw 'Candidate tag must identify this exact tested commit'
}
if (!$release.isDraft) { Write-Output 'Release already public; preserving immutable assets.'; exit 0 }
$verify = 'release/publication-verification'
New-Item -ItemType Directory -Force $verify | Out-Null
# Check uploaded Windows bytes against the installer and metadata tested in this run.
foreach ($name in @('Scenic-Windows-Setup.exe','latest.yml','Scenic-Windows-Setup.exe.blockmap','SHA256-Windows.txt')) {
  gh release download $tag --repo $repo --pattern $name --dir $verify --clobber
  if ($LASTEXITCODE) { throw "Cannot verify uploaded $name" }
  if ((Get-FileHash "$verify/$name").Hash -ne (Get-FileHash "release/windows/$name").Hash) {
    throw "Uploaded Windows asset differs from tested candidate: $name"
  }
}
# Mac's existing appcast uses /latest/ for its enclosure, so retain the exact signed
# 1.4.23 archive too. These are unchanged prior-release assets, not a new Mac build.
foreach ($asset in $plan.assets.PSObject.Properties) {
  $name = $asset.Name
  gh release download $plan.retainedMacTag --repo $repo --pattern $name --dir $verify --clobber
  if ($LASTEXITCODE) { throw "Cannot retrieve retained Mac asset: $name" }
  if ((Get-FileHash "$verify/$name" -Algorithm SHA256).Hash.ToLower() -ne $asset.Value) {
    throw "Retained Mac asset hash mismatch: $name"
  }
  if ($release.assets.name -notcontains $name) {
    gh release upload $tag "$verify/$name" --repo $repo
    if ($LASTEXITCODE) { throw "Cannot upload retained Mac asset: $name" }
  }
  $remote = gh api "repos/$repo/releases/tags/$tag" | ConvertFrom-Json
  if ($LASTEXITCODE) { throw 'Cannot verify retained release assets' }
  $uploaded = @($remote.assets | Where-Object name -eq $name)
  if ($uploaded.Count -ne 1 -or $uploaded[0].digest -ne ('sha256:' + $asset.Value)) {
    throw "Published Mac asset digest mismatch: $name"
  }
}
gh release edit $tag --repo $repo --draft=false --latest --title "Scenic $version for Windows (Mac remains 1.4.23)" --notes-file desktop/release-notes.txt
if ($LASTEXITCODE) { throw 'Release publication failed; inspect state before retrying' }
