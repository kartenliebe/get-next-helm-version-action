const core = require('@actions/core');
const github = require('@actions/github');
const semver  = require('semver');

try {
  const tag = core.getInput('latestTag');
  const buildNumber = core.getInput('buildNumber');
  const bumpMaster = core.getInput('bumpMaster');
  let { runNumber, payload } = github.context;

  if (buildNumber !== '' && !isNaN(buildNumber)) {
    runNumber = buildNumber;
  }

  const isPR = !!payload.pull_request
  const prNumber = isPR ? payload.pull_request.number : null;
  const branchRef = isPR ? payload.pull_request.head.ref : github.context.ref
  const branchName = branchRef.replace('refs/heads/', '');
  const currentVersion = semver.clean(tag)
  if (!currentVersion) {
    throw Error('Failed to extract latest release')
  }

  if (branchName === 'master' || branchName === 'main') {
    core.debug('Branch master or main');
    if (bumpMaster === 'true') {
      const nextHelmVersion = semver.inc(currentVersion, 'patch')
      core.setOutput('helmVersion', nextHelmVersion);
      return;
    }
    core.setOutput('helmVersion', currentVersion);
    return;
  }

  if (branchName === 'develop') {
    core.debug('Branch develop');
    const nextHelmVersion = semver.inc(currentVersion, 'prerelease', `dev-${runNumber}`)
    core.setOutput('helmVersion', nextHelmVersion);
    return;
  }

  if (isPR) {
    core.debug('Pull Request');
    const nextHelmVersion = semver.inc(currentVersion, 'prerelease', `PR-${prNumber}-${runNumber}`)
    core.setOutput('helmVersion', nextHelmVersion);
    return;
  }

  if (branchName.match('^(feature|bugfix|renovate|staging)')) {
    core.debug('feature/bugfix branch');
    const preReleaseName = branchName.replace(/\//g, '-')
    const nextHelmVersion = semver.inc(currentVersion, 'prerelease', `${preReleaseName}-${runNumber}`)
    core.setOutput('helmVersion', nextHelmVersion);
    return;
  }

  throw Error ('Branch is not allowed to get built')
} catch (error) {
  core.setFailed(error.message);
}
