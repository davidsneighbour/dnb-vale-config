import fs from 'fs';
import path from 'path';
import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import archiver from 'archiver';

const execPromise = promisify(exec);

const DIST_DIR = 'dist';
const SRC_DIR = 'src';
let OUTPUT_ZIP = ''; // Will be set dynamically based on the version
const SECOND_ZIP = path.join(DIST_DIR, 'config.zip'); // Static name for the second zip
const README_PATH = path.resolve('README.md');
const VALE_INI_PATH = path.join(SRC_DIR, '.vale.ini');

/**
 * Opens a browser window for the release edit page.
 * @param {string} tagName The tag name of the release.
 */
async function openReleaseEditPage(tagName) {
  const releaseEditUrl = `https://github.com/davidsneighbour/dnb-vale-config/releases/edit/${tagName}`;
  console.log(`Opening browser to edit the release: ${releaseEditUrl}`);
  const platform = process.platform;

  try {
    if (platform === 'win32') {
      execSync(`start ${releaseEditUrl}`);
    } else if (platform === 'darwin') {
      execSync(`open ${releaseEditUrl}`);
    } else {
      execSync(`xdg-open ${releaseEditUrl}`);
    }
  } catch (error) {
    console.error('Failed to open browser for release edit page:', error.message);
  }
}

/**
 * Reads and parses the package.json file.
 * @returns {object} Parsed package.json content.
 */
function getPackageJson() {
  const packagePath = path.resolve('package.json');
  return JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
}

/**
 * Updates the version in package.json, src/.vale.ini, and README.md.
 * @param {string} bumpType Version bump type or test version (e.g., "patch" or "1.2.3-test").
 */
async function bumpVersion(bumpType) {
  console.log(`Bumping version with: ${bumpType}`);

  const packagePath = path.resolve('package.json');
  const packageJson = getPackageJson();
  let newVersion;

  if (bumpType.includes('-test')) {
    // Use the test version directly
    newVersion = bumpType;
  } else {
    // Parse and bump version normally
    const [major, minor, patch] = packageJson.version.split('.').map(Number);

    switch (bumpType) {
      case 'major':
        newVersion = `${major + 1}.0.0`;
        break;
      case 'minor':
        newVersion = `${major}.${minor + 1}.0`;
        break;
      case 'patch':
      default:
        newVersion = `${major}.${minor}.${patch + 1}`;
        break;
    }
  }

  // Update package.json
  packageJson.version = newVersion;
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
  console.log(`Updated package.json version to ${newVersion}`);

  // Update src/.vale.ini
  if (fs.existsSync(VALE_INI_PATH)) {
    const iniContent = fs.readFileSync(VALE_INI_PATH, 'utf-8');
    const updatedIniContent = iniContent.replace(
      /#\s*Version:\s*\d+\.\d+\.\d+(-test)?/,
      `# Version: ${newVersion}`
    );
    fs.writeFileSync(VALE_INI_PATH, updatedIniContent);
    console.log(`Updated version in ${VALE_INI_PATH}`);
  } else {
    console.error(`File not found: ${VALE_INI_PATH}`);
  }

  // Update README.md to point to config.zip with the correct version
  const newLink = `https://github.com/davidsneighbour/dnb-vale-config/releases/download/v${newVersion}/config.zip`;

  if (fs.existsSync(README_PATH)) {
    const readmeContent = fs.readFileSync(README_PATH, 'utf-8');
    const updatedReadmeContent = readmeContent.replace(
      /https:\/\/github\.com\/davidsneighbour\/dnb-vale-config\/releases\/download\/v\d+\.\d+\.\d+(-test)?\/config\.zip/,
      newLink
    );
    fs.writeFileSync(README_PATH, updatedReadmeContent);
    console.log(`Updated README.md with the new download link: ${newLink}`);
  } else {
    console.error(`File not found: ${README_PATH}`);
  }

  // Set the dynamic output zip file name
  OUTPUT_ZIP = path.join(DIST_DIR, `dnb-vale-config-v${newVersion}.zip`);

  return newVersion;
}

/**
 * Ensures the repo has no uncommitted changes.
 */
async function ensureCleanGitState() {
  const { stdout } = await execPromise('git status --porcelain');
  if (stdout.trim()) {
    throw new Error('Repository has uncommitted changes. Commit or stash them before releasing.');
  }
  console.log('Git state is clean.');
}

/**
 * Creates a zip file from the src/ directory.
 * @param {string} zipPath The path for the zip file to create.
 * @param {string} description Description of the zip file being created (for logging).
 */
async function createZip(zipPath, description) {
  console.log(`Creating ${description} zip file: ${zipPath}`);
  await fs.promises.mkdir(DIST_DIR, { recursive: true });

  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.pipe(output);

  // Include the contents of src/ as the root of the zip
  archive.directory(SRC_DIR, false);

  await archive.finalize();
  console.log(`Zip file created at ${zipPath}`);
}

/**
 * Creates a Git tag and releases on GitHub.
 * @param {string} version The version number for the tag.
 */
async function createGitTagAndRelease(version) {
  const tagName = `v${version}`;
  console.log(`Creating Git tag: ${tagName}`);
  await execPromise(`git add . && git commit -m "Release ${tagName}"`);
  await execPromise(`git tag ${tagName}`);
  await execPromise('git push && git push --tags');

  console.log('Publishing release on GitHub...');
  const command = `gh release create ${tagName} ${OUTPUT_ZIP} ${SECOND_ZIP} --title "Release ${tagName}" --notes "Version ${tagName} release."`;
  const { stdout, stderr } = await execPromise(command);
  if (stderr) {
    console.error(stderr);
  } else {
    console.log(stdout);
  }

  // Open the release edit page in the browser
  await openReleaseEditPage(tagName);
}

// Main execution
(async () => {
  try {
    const bumpTypeArg = process.argv[2];
    let bumpType;
    if (bumpTypeArg && bumpTypeArg.includes('-test')) {
      bumpType = bumpTypeArg; // Use the mock test version directly
    } else {
      const allowedBumps = ['patch', 'minor', 'major'];
      bumpType = allowedBumps.includes(bumpTypeArg) ? bumpTypeArg : 'patch'; // Default to patch
    }

    await ensureCleanGitState();
    const newVersion = await bumpVersion(bumpType);

    // Create both zip files
    await createZip(OUTPUT_ZIP, `versioned (${newVersion})`);
    await createZip(SECOND_ZIP, 'config');

    // Create the Git tag and release both files
    if (!bumpType.includes('-test')) {
      await createGitTagAndRelease(newVersion);
    }
  } catch (error) {
    console.error('An error occurred:', error.message);
    process.exit(1);
  }
})();
