#!/usr/bin/env node

/**
 * Update Ecosystem Documentation Script
 * 
 * This script updates the ecosystem.json documentation based on the current version
 * and release information. It reads package version metadata and generates or updates
 * the ecosystem documentation accordingly.
 * 
 * Usage: node scripts/update-ecosystem-docs.js [--dry-run] [--output-path <path>]
 * 
 * Generated: 2025-12-26 03:56:26 UTC
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  packageJsonPath: path.join(__dirname, '../package.json'),
  ecosystemDocPath: path.join(__dirname, '../ecosystem.json'),
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose'),
};

/**
 * Log utility function
 */
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  console.log(`${prefix} ${message}`);
}

/**
 * Get current package version and metadata
 */
function getPackageMetadata() {
  try {
    const packageJsonContent = fs.readFileSync(CONFIG.packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonContent);
    
    return {
      version: packageJson.version,
      name: packageJson.name,
      description: packageJson.description,
      author: packageJson.author,
      license: packageJson.license,
      repository: packageJson.repository,
      homepage: packageJson.homepage,
    };
  } catch (error) {
    log(`Failed to read package.json: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Get git commit information
 */
function getGitInfo() {
  try {
    const commitHash = execSync('git rev-parse --short HEAD').toString().trim();
    const commitDate = execSync('git log -1 --format=%ci').toString().trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    
    return {
      commitHash,
      commitDate,
      branch,
    };
  } catch (error) {
    log(`Warning: Could not retrieve git information: ${error.message}`, 'warn');
    return {
      commitHash: 'unknown',
      commitDate: new Date().toISOString(),
      branch: 'unknown',
    };
  }
}

/**
 * Generate ecosystem documentation object
 */
function generateEcosystemDoc(packageMetadata, gitInfo) {
  const now = new Date().toISOString();
  
  return {
    name: packageMetadata.name,
    version: packageMetadata.version,
    description: packageMetadata.description,
    author: packageMetadata.author,
    license: packageMetadata.license,
    repository: packageMetadata.repository,
    homepage: packageMetadata.homepage,
    releaseInfo: {
      releaseDate: now,
      commitHash: gitInfo.commitHash,
      commitDate: gitInfo.commitDate,
      branch: gitInfo.branch,
    },
    documentation: {
      readme: 'README.md',
      changelog: 'CHANGELOG.md',
      contributing: 'CONTRIBUTING.md',
    },
    components: {
      core: {
        description: 'Core Aave V4 protocol contracts',
        status: 'active',
        mainContracts: [],
      },
      periphery: {
        description: 'Peripheral contracts and utilities',
        status: 'active',
        mainContracts: [],
      },
    },
    ecosystem: {
      networks: [],
      deployments: [],
    },
    metadata: {
      lastUpdated: now,
      updatedBy: 'update-ecosystem-docs.js',
      generatedAt: now,
    },
  };
}

/**
 * Load existing ecosystem documentation
 */
function loadExistingEcosystemDoc() {
  try {
    if (fs.existsSync(CONFIG.ecosystemDocPath)) {
      const content = fs.readFileSync(CONFIG.ecosystemDocPath, 'utf8');
      return JSON.parse(content);
    }
  } catch (error) {
    log(`Warning: Could not load existing ecosystem.json: ${error.message}`, 'warn');
  }
  return null;
}

/**
 * Merge new documentation with existing data (preserving custom fields)
 */
function mergeEcosystemDoc(newDoc, existingDoc) {
  if (!existingDoc) {
    return newDoc;
  }

  // Preserve ecosystem-specific data from existing doc
  if (existingDoc.ecosystem) {
    newDoc.ecosystem = {
      ...newDoc.ecosystem,
      networks: existingDoc.ecosystem.networks || [],
      deployments: existingDoc.ecosystem.deployments || [],
    };
  }

  // Preserve component details if they exist
  if (existingDoc.components) {
    Object.keys(existingDoc.components).forEach((key) => {
      if (newDoc.components[key] && existingDoc.components[key]) {
        newDoc.components[key] = {
          ...newDoc.components[key],
          mainContracts: existingDoc.components[key].mainContracts || [],
        };
      }
    });
  }

  return newDoc;
}

/**
 * Validate ecosystem documentation structure
 */
function validateEcosystemDoc(doc) {
  const requiredFields = ['version', 'name', 'releaseInfo', 'metadata'];
  const missingFields = requiredFields.filter((field) => !doc[field]);

  if (missingFields.length > 0) {
    log(`Validation warning: Missing fields: ${missingFields.join(', ')}`, 'warn');
    return false;
  }

  if (!doc.releaseInfo.releaseDate) {
    log('Validation warning: Missing releaseDate in releaseInfo', 'warn');
    return false;
  }

  return true;
}

/**
 * Write ecosystem documentation to file
 */
function writeEcosystemDoc(doc, outputPath = CONFIG.ecosystemDocPath) {
  try {
    const jsonContent = JSON.stringify(doc, null, 2);
    
    if (CONFIG.dryRun) {
      log('DRY RUN: Would write the following content to ecosystem.json:', 'info');
      console.log(jsonContent);
      return true;
    }

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, jsonContent, 'utf8');
    log(`Successfully wrote ecosystem documentation to ${outputPath}`, 'info');
    return true;
  } catch (error) {
    log(`Failed to write ecosystem documentation: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    log('Starting ecosystem documentation update...', 'info');

    if (CONFIG.dryRun) {
      log('Running in DRY RUN mode - no files will be modified', 'warn');
    }

    // Step 1: Gather metadata
    log('Gathering package metadata...', 'info');
    const packageMetadata = getPackageMetadata();
    
    log('Retrieving git information...', 'info');
    const gitInfo = getGitInfo();

    // Step 2: Generate new documentation
    log('Generating ecosystem documentation...', 'info');
    let ecosystemDoc = generateEcosystemDoc(packageMetadata, gitInfo);

    // Step 3: Load and merge with existing documentation
    log('Loading existing ecosystem documentation...', 'info');
    const existingDoc = loadExistingEcosystemDoc();
    ecosystemDoc = mergeEcosystemDoc(ecosystemDoc, existingDoc);

    // Step 4: Validate
    log('Validating ecosystem documentation...', 'info');
    const isValid = validateEcosystemDoc(ecosystemDoc);

    if (!isValid && !CONFIG.dryRun) {
      log('Validation warnings detected, but proceeding with update', 'warn');
    }

    // Step 5: Write documentation
    log('Writing ecosystem documentation...', 'info');
    writeEcosystemDoc(ecosystemDoc);

    // Summary
    log(`✓ Ecosystem documentation updated successfully`, 'info');
    log(`  Version: ${ecosystemDoc.version}`, 'info');
    log(`  Commit: ${ecosystemDoc.releaseInfo.commitHash}`, 'info');
    log(`  Last Updated: ${ecosystemDoc.metadata.lastUpdated}`, 'info');

  } catch (error) {
    log(`Fatal error: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Execute main function
main().catch((error) => {
  log(`Unexpected error: ${error.message}`, 'error');
  process.exit(1);
});

module.exports = {
  getPackageMetadata,
  getGitInfo,
  generateEcosystemDoc,
  loadExistingEcosystemDoc,
  mergeEcosystemDoc,
  validateEcosystemDoc,
  writeEcosystemDoc,
};
