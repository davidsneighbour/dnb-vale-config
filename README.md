<!-- markdownlint-disable MD041 -->
This repository contains a custom Vale configuration, styles, and dictionary files for writing and linting text.

## Usage

The DNB Vale Configuration package is hosted as an externally downloadable `.zip` file. You can include it in your Vale setup by adding its URL to the `Packages` key in your `.vale.ini` file.

### Example Configuration

```ini
MinAlertLevel = suggestion # suggestion, warning, error
Packages = https://github.com/davidsneighbour/dnb-vale-config/releases/latest/download/DNB.zip
```

### Understanding Vale Configuration Merging

Vale merges configurations **from right to left** when multiple packages are specified in the `Packages` key. This means that packages listed **later in the sequence override and merge** their settings into those listed earlier.

For example, consider the following configuration:

```ini
Packages = Microsoft,
https://github.com/davidsneighbour/dnb-vale-config/releases/latest/download/DNB.zip
```

In this setup:

1. **`Microsoft`**: Provides a base set of configurations and rules.
2. **`dnb-vale-config`**: Our custom package, listed last, **overrides settings** from `Microsoft`.

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
     - The version number in the source files (if present).
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
