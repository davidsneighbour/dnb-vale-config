import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const DIST_DIR = path.resolve('dist');
const SRC_DIR = path.resolve('src');
const README_PATH = path.resolve('README.md');
const VALE_INI_PATH = path.join(SRC_DIR, '.vale.ini');
const RELEASE_SCRIPT = path.resolve('release.js');
const PACKAGE_JSON_PATH = path.resolve('package.json');
const testVersion = '1.2.3-test';
const versionedZip = path.join(DIST_DIR, `dnb-vale-config-v${testVersion}.zip`);
const configZip = path.join(DIST_DIR, 'config.zip');

// Helper to clean up generated files after tests
function cleanup() {
  console.log('Cleaning up...');
  execSync(`git restore ${README_PATH} ${VALE_INI_PATH} ${PACKAGE_JSON_PATH}`, { stdio: 'inherit' });
  if (fs.existsSync(versionedZip)) fs.unlinkSync(versionedZip);
  if (fs.existsSync(configZip)) fs.unlinkSync(configZip);
  if (fs.existsSync(DIST_DIR) && fs.readdirSync(DIST_DIR).length === 0) {
    fs.rmdirSync(DIST_DIR);
  }
}

// Helper to check for uncommitted changes
function hasUncommittedChanges() {
  const status = execSync('git status --porcelain').toString().trim();
  return status.length > 0;
}

describe('Release Process Tests', () => {
  beforeAll(() => {
    if (hasUncommittedChanges()) {
      throw new Error('Repository has uncommitted changes. Commit or stash them before running tests.');
    }

    console.log(`Running release.js with version: ${testVersion}`);
    execSync(`node ${RELEASE_SCRIPT} ${testVersion}`, { stdio: 'inherit' });
  });

  afterAll(() => {
    cleanup();
  });

  it('README.md contains the correct version in the download URL', () => {
    const readmeContent = fs.readFileSync(README_PATH, 'utf-8');
    const expectedUrl = `https://github.com/davidsneighbour/dnb-vale-config/releases/download/v${testVersion}/config.zip`;
    expect(readmeContent).toContain(expectedUrl);
  });

  it('.vale.ini contains the correct version', () => {
    const iniContent = fs.readFileSync(VALE_INI_PATH, 'utf-8');
    const expectedVersionLine = `# Version: ${testVersion}`;
    expect(iniContent).toContain(expectedVersionLine);
  });

  it('Generated zip files exist', () => {
    expect(fs.existsSync(versionedZip)).toBe(true);
    expect(fs.existsSync(configZip)).toBe(true);
  });

  it('Required files and directories exist', () => {
    expect(fs.existsSync(SRC_DIR)).toBe(true);
    expect(fs.existsSync(DIST_DIR)).toBe(true);
    expect(fs.existsSync(README_PATH)).toBe(true);
    expect(fs.existsSync(VALE_INI_PATH)).toBe(true);
  });

  it('README.md and .vale.ini have consistent versions', () => {
    const readmeContent = fs.readFileSync(README_PATH, 'utf-8');
    const iniContent = fs.readFileSync(VALE_INI_PATH, 'utf-8');
    const readmeVersion = readmeContent.match(/\/v(\d+\.\d+\.\d+(-test)?)\//)?.[1];
    const iniVersion = iniContent.match(/# Version: (\d+\.\d+\.\d+(-test)?)/)?.[1];
    expect(readmeVersion).toBe(testVersion);
    expect(iniVersion).toBe(testVersion);
  });
});
