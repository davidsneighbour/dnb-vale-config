# DNB Vale Configuration

This repository contains a custom Vale configuration, styles, and dictionary files for writing and linting text.

## Structure

- `src/.vale.ini`: Main configuration file for Vale.
- `src/Styles/`: Custom styles and rules.
- `src/Dictionary/`: Custom dictionary for spell checking.

## Usage

The DNB Vale Configuration package is hosted as an externally downloadable `.zip` file. You can include it in your Vale setup by adding its URL to the `Packages` key in your `.vale.ini` file.

### Example Configuration

```ini
MinAlertLevel = suggestion

Packages = https://github.com/davidsneighbour/dnb-vale-config/releases/download/v0.0.3/config.zip
```

### Steps to Use

1. Add the latest release URL of the DNB Vale Configuration to your `.vale.ini` under the `Packages` key.
2. Run Vale as usual. It will automatically download and use the package during linting.

### Understanding Vale Configuration Merging

Vale merges configurations **from right to left** when multiple packages are specified in the `Packages` key. This means that packages listed **later in the sequence override and merge** their settings into those listed earlier.

For example, consider the following configuration:

```ini
Packages = Microsoft,
https://github.com/davidsneighbour/dnb-vale-config/releases/download/v0.0.0/config.zip
```

In this setup:

1. **`Microsoft`**: Provides a base set of configurations and rules.
2. **`dnb-vale-config`**: Our custom package, listed last, **overrides settings** from `Microsoft`.

#### How Merging Works

- **Override, Not Replace**: If multiple packages define the same setting, the one listed last (furthest to the right) takes precedence.
- **Merged Configuration**: Settings and rules that do not conflict are combined from all specified packages.

#### Example Scenario

Suppose the `Microsoft` package defines:

```ini
[*.md]
BasedOnStyles = Microsoft
```

Our `dnb-vale-config` package adds:

```ini
[*.md]
BasedOnStyles = DNB
```

The resulting configuration for Markdown files (`*.md`) after merging:

```ini
[*.md]
BasedOnStyles = DNB
```

Here, `BasedOnStyles = DNB` from `dnb-vale-config` overrides the earlier settings. However, any rules or configurations not defined in `dnb-vale-config` will still come from `Microsoft`.

#### Why This Matters

By placing your custom package last in the `Packages` key, you ensure that your rules and configurations take precedence while still benefiting from the base configurations of other packages.

This approach provides flexibility and control, allowing you to **build upon existing packages** without completely replacing them.

## Release Process

This repository follows **semantic versioning** (`MAJOR.MINOR.PATCH`) for all releases.

### Steps for Creating a Release

1. **Bump the Version**:
   - Run the release script with the desired bump type:

     ```bash
     node release.js [patch|minor|major]
     ```

   - Defaults to `patch` if no bump type is specified.

2. **Version Updates**:
   - The script automatically updates:
     - The `version` field in `package.json`.
     - The version number in `src/.vale.ini` (if present).
     - The download link in the `README.md` file to point to the latest release.

3. **Check for Uncommitted Changes**:
   - The release process ensures there are no uncommitted changes in the repository.

4. **Create a Git Tag**:
   - The script creates a Git tag in the format `vX.X.X`, where `X.X.X` represents the new semantic version.

5. **Generate and Upload Zip File**:
   - The script creates a zip file from the contents of the `src/` folder, which becomes the root of the zip file.
   - The zip file is uploaded as part of the GitHub release.

### Example Release Command

```bash
node release.js minor
```

This command performs the following:

- Increments the minor version in `package.json` and `src/.vale.ini`.
- Updates the download link in `README.md`.
- Commits the changes to Git.
- Creates a Git tag with the updated version.
- Publishes a release on GitHub with the generated zip file.

## License

[MIT License](LICENSE.md)
