import { readdirSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';

const appRoot = resolve('src/app');
const sourceFiles = collectTypeScriptFiles(appRoot);
const violations = [];

for (const sourceFile of sourceFiles) {
  const sourceArea = describeArea(sourceFile);
  const source = readFileSync(sourceFile, 'utf8');
  const importPattern = /\b(?:import|export)\s+(?!\()(?:[\s\S]*?\s+from\s+)?['"](\.[^'"]+)['"]/g;

  for (const match of source.matchAll(importPattern)) {
    const targetFile = resolve(dirname(sourceFile), match[1]);
    const targetArea = describeArea(targetFile);
    const reason = invalidDependency(sourceArea, targetArea);

    if (reason) {
      violations.push(
        `${relative(appRoot, sourceFile)} -> ${relative(appRoot, targetFile)} (${reason})`,
      );
    }
  }
}

if (violations.length > 0) {
  console.error('Architecture boundary violations:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Architecture boundaries passed for ${sourceFiles.length} production TypeScript files.`,
  );
}

function collectTypeScriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      return collectTypeScriptFiles(path);
    }

    return entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')
      ? [path]
      : [];
  });
}

function describeArea(file) {
  const parts = relative(appRoot, file).split(sep);
  if (parts[0] === 'features') {
    return { layer: 'feature', feature: parts[1] };
  }

  if (parts[0] === 'core' || parts[0] === 'shared') {
    return { layer: parts[0] };
  }

  return { layer: 'shell' };
}

function invalidDependency(source, target) {
  if (source.layer === 'shared' && (target.layer === 'core' || target.layer === 'feature')) {
    return 'shared code cannot depend on core or feature code';
  }

  if (source.layer === 'core' && target.layer === 'feature') {
    return 'core code cannot depend on feature code';
  }

  if (
    source.layer === 'feature' &&
    target.layer === 'feature' &&
    source.feature !== target.feature
  ) {
    return 'features cannot import another feature directly';
  }

  if (source.layer === 'shell' && target.layer === 'feature') {
    return 'the application shell must reach features through dynamic route imports';
  }

  return undefined;
}
