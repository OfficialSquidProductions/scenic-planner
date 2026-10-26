param([string]$CandidateSha = $env:GITHUB_SHA, [long]$VerificationRunId = 0)
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
if (!$release.isDraft) { Write-Output 'Release already public; preserving immutable assets.'; exit 0 }
$candidate = gh api "repos/$repo/releases/tags/$tag" | ConvertFrom-Json
if ($LASTEXITCODE -or $candidate.target_commitish -ne $CandidateSha) { throw 'Draft target differs from tested commit' }
# GitHub does not create the tag until a draft is published. If a tag already
# exists, it must also point to the candidate; never move an existing tag.
$refText = gh api "repos/$repo/git/ref/tags/$tag" 2>$null
if ($LASTEXITCODE -eq 0) {
  $ref = $refText | ConvertFrom-Json
  if ($ref.object.type -ne 'commit' -or $ref.object.sha -ne $CandidateSha) { throw 'Existing tag differs from tested commit' }
}
if ($VerificationRunId) {
  $run = gh api "repos/$repo/actions/runs/$VerificationRunId" | ConvertFrom-Json
  if ($LASTEXITCODE -or $run.head_sha -ne $CandidateSha -or $run.status -ne 'completed' -or $run.path -ne '.github/workflows/windows.yml') { throw 'Unexpected verification run' }
  $jobs = gh api "repos/$repo/actions/runs/$VerificationRunId/jobs" | ConvertFrom-Json
  if ($LASTEXITCODE) { throw 'Cannot inspect verification steps' }
  foreach ($step in @('Shared model and geometry checks','Portable project and file dialog checks','Release notes and update prompts','Run python tools/build_windows.py','Run python tools/check_windows.py','Publish tested Windows installer')) {
    if (!($jobs.jobs.steps | Where-Object { $_.name -eq $step -and $_.conclusion -eq 'success' })) { throw "Required verification failed: $step" }
  }
  gh run download $VerificationRunId --repo $repo --name windows-verification --dir release/windows-verification
  if ($LASTEXITCODE) { throw 'Cannot retrieve installer verification evidence' }
  foreach ($label in @('packaged','installed','reinstalled')) {
    $proof = Get-Content "release/windows-verification/$label.json" | ConvertFrom-Json
    if (!$proof.passed -or $proof.version -ne $version -or $proof.checks.Count -ne 13) { throw "Invalid $label evidence" }
  }
}
$verify = 'release/publication-verification'
New-Item -ItemType Directory -Force $verify | Out-Null
# Check uploaded Windows bytes against the installer and metadata tested in this run.
foreach ($name in @('Scenic-Windows-Setup.exe','latest.yml','Scenic-Windows-Setup.exe.blockmap','SHA256-Windows.txt')) {
  gh release download $tag --repo $repo --pattern $name --dir $verify --clobber
  if ($LASTEXITCODE) { throw "Cannot verify uploaded $name" }
  if (!$VerificationRunId -and (Get-FileHash "$verify/$name").Hash -ne (Get-FileHash "release/windows/$name").Hash) {
    throw "Uploaded Windows asset differs from tested candidate: $name"
  }
}
if ($VerificationRunId) {
  $proof = Get-Content release/windows-verification/installer.json | ConvertFrom-Json
  $actual = (Get-FileHash "$verify/Scenic-Windows-Setup.exe" -Algorithm SHA256).Hash.ToLower()
  if (!$proof.passed -or !$proof.silentInstall -or !$proof.reinstallPreservesWorkspace -or $actual -ne $proof.sha256) { throw 'Installer differs from the CI-tested bytes' }
  if ((Get-Content "$verify/SHA256-Windows.txt" -Raw).Trim() -ne "$actual  Scenic-Windows-Setup.exe") { throw 'Published checksum mismatch' }
  $manifest = Get-Content "$verify/latest.yml" -Raw
  $hash512 = [Convert]::ToBase64String([Security.Cryptography.SHA512]::HashData([IO.File]::ReadAllBytes((Resolve-Path "$verify/Scenic-Windows-Setup.exe"))))
  if ($manifest -notmatch "(?m)^version: $([regex]::Escape($version))\s*$" -or !$manifest.Contains($hash512)) { throw 'Update manifest differs from verified installer' }
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
