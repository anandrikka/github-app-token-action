const core = require('@actions/core');
const github = require('@actions/github')
const jwt = require('jsonwebtoken');

const { repo } = github.context.repo;

const generateJWTToken = (appId, privateKey) => {
  try {
    return jwt.sign({
      exp: Math.floor(Date.now()/1000) + 120,
      iss: appId
    }, privateKey, { algorithm: 'RS256' });
  } catch (e) {
    core.debug('Unable to generate JWT token')
    core.setFailed(e);
  }
};

const fetchInstallationId = async (octokit) => {
  try {
    const response = await octokit.request(`GET /repos/${repo}/installation`, {
      mediaType: {
        previews: ['machine-man']
      }
    });
    if (!response.data || !response.data.id) {
      core.setFailed(`Unable to get installation ID. Install Github app on the ${repo}`);
    }
    return response.data.id;
  } catch (e) {
    core.debug('Unable to get installation token');
    core.setFailed(e);
  }
};

const fetchAppToken = async (octokit, installationId) => {
  try {
    const response = await octokit.request(`POST /app/installations/${installationId}/access_token`, {
      mediaType: {
        previews: ['machine-man']
      }
    });
    if (!response.data || !response.data.token) {
      core.setFailed(`Unable to get app token for ${repo}.`);
    }
    return response.data.token;
  } catch (e) {
    core.debug('Unable to get app token')
    core.setFailed(e)
  }
};

async function run() {
  // Inputs
  const privateKey = core.getInput('private_key', { required: true });
  const appId = core.getInput('app_id', { required: true });
  let installationId = core.getInput('installation_id', { required: false });

  // JWT Token
  jwtToken = generateJWTToken(appId, privateKey);

  // Octokit client
  const octokit = github.getOctokit(jwtToken);

  // Fetch Installation ID
  if (!installationId) {
    installationId = await fetchInstallationId(octokit);
  }

  // Generate App Token
  const token = await fetchAppToken(octokit, installationId);

  // Set Output
  core.setSecret(token)
  core.setOutput('token', token);
}

run().catch((e) => core.setFailed(e instanceof Error ? e.message : JSON.stringify(e)));
