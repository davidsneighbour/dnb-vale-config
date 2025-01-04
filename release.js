import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
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
 * Reads and parses the package.json file.
 * @returns {object} Parsed package.json content.
 */
function getPackageJson() {
  const packagePath = path.resolve('package.json');
  return JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
}

/**
 * Updates the version in README.md and src/.vale.ini to ensure consistency.
 * @param {string} newVersion - The new version string to replace in the files.
 */
function updateVersionInFiles(newVersion) {
  const readmeContent = fs.readFileSync(README_PATH, 'utf-8');
  const updatedReadmeContent = readmeContent.replace(
    /https:\/\/github\.com\/davidsneighbour\/dnb-vale-config\/releases\/download\/v\d+\.\d+\.\d+\/config\.zip/g,
    `https://github.com/davidsneighbour/dnb-vale-config/releases/download/v${newVersion}/config.zip`
  );
  fs.writeFileSync(README_PATH, updatedReadmeContent);
  console.log(`Updated version in README.md to v${newVersion}`);

  if (fs.existsSync(VALE_INI_PATH)) {
    const iniContent = fs.readFileSync(VALE_INI_PATH, 'utf-8');
    const updatedIniContent = iniContent.replace(
      /#\s*Version:\s*\d+\.\d+\.\d+/,
      `# Version: ${newVersion}`
    );
    fs.writeFileSync(VALE_INI_PATH, updatedIniContent);
    console.log(`Updated version in .vale.ini to v${newVersion}`);
  } else {
    console.error(`File not found: ${VALE_INI_PATH}`);
  }
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
}

// Main execution
(async () => {
  try {
    const bumpTypeArg = process.argv[2];
    const allowedBumps = ['patch', 'minor', 'major'];
    const bumpType = allowedBumps.includes(bumpTypeArg) ? bumpTypeArg : 'patch';

    await ensureCleanGitState();
    const packagePath = path.resolve('package.json');
    const packageJson = getPackageJson();
    const [major, minor, patch] = packageJson.version.split('.').map(Number);
    let newVersion;

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

    // Update version in files
    updateVersionInFiles(newVersion);

    // Create zip files
    OUTPUT_ZIP = path.join(DIST_DIR, `dnb-vale-config-v${newVersion}.zip`);
    await createZip(OUTPUT_ZIP, `versioned (${newVersion})`);
    await createZip(SECOND_ZIP, 'config');

    // Create Git tag and release
    await createGitTagAndRelease(newVersion);
  } catch (error) {
    console.error('An error occurred:', error.message);
    process.exit(1);
  }
})();
