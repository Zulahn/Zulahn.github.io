/**
 * File Tree Visualizer
 * Generates ASCII tree representation of folder structures
 */

// DOM Elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const outputSection = document.getElementById('output-section');
const outputBox = document.getElementById('output-box');
const outputInfo = document.getElementById('output-info');
const copyBtn = document.getElementById('copy-btn');
const viewToggle = document.getElementById('view-toggle');

// Folders to exclude in simple mode
const SIMPLE_EXCLUDE = [
  // Dependencies
  'node_modules', 'vendor', 'packages', '.pnpm', 'bower_components', 'jspm_packages',
  // Build outputs
  'dist', 'build', 'out', '.next', '.nuxt', '.output', 'target', 'bin', 'obj', '.parcel-cache',
  // Cache
  '.cache', '__pycache__', '.pytest_cache', '.mypy_cache', '.tox', '.eggs',
  // Version control
  '.git', '.svn', '.hg',
  // IDE/Editor
  '.idea', '.vscode', '.vs', '.eclipse', '.settings',
  // Virtual environments
  'venv', '.venv', 'env', '.virtualenv',
  // Coverage/testing
  'coverage', '.nyc_output', 'htmlcov',
  // Misc
  '.terraform', '.serverless'
];

// State
let currentTree = '';
let currentRawTree = null;
let currentRootName = '';
let isSimpleMode = true;

/**
 * Build a nested tree object from file list
 * @param {FileList} files - Files from input or drop
 * @returns {Object} Nested tree structure
 */
function buildTree(files) {
  const tree = {};

  Array.from(files).forEach(file => {
    const path = file.webkitRelativePath || file.name;
    const parts = path.split('/');
    let current = tree;

    parts.forEach((part, index) => {
      if (!current[part]) {
        // null for files, empty object for folders
        current[part] = index === parts.length - 1 ? null : {};
      }
      if (current[part] !== null) {
        current = current[part];
      }
    });
  });

  return tree;
}

/**
 * Render tree object to ASCII string
 * @param {Object} tree - Nested tree structure
 * @param {string} prefix - Current line prefix
 * @returns {string} ASCII tree representation
 */
function renderTree(tree, prefix = '') {
  let result = '';
  const entries = Object.entries(tree);

  // Sort: folders first, then files, alphabetically within each group
  entries.sort(([nameA, valueA], [nameB, valueB]) => {
    const aIsFolder = valueA !== null;
    const bIsFolder = valueB !== null;

    if (aIsFolder && !bIsFolder) return -1;
    if (!aIsFolder && bIsFolder) return 1;
    return nameA.localeCompare(nameB);
  });

  entries.forEach(([name, subtree], index) => {
    const isLast = index === entries.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const extension = isLast ? '    ' : '│   ';

    // Check if this is a collapsed folder
    if (isCollapsed(subtree)) {
      result += prefix + connector + name + `/ [${subtree._count} items]\n`;
      return;
    }

    // Add trailing slash for folders
    const displayName = subtree !== null ? name + '/' : name;
    result += prefix + connector + displayName + '\n';

    // Recurse into folders
    if (subtree !== null && Object.keys(subtree).length > 0) {
      result += renderTree(subtree, prefix + extension);
    }
  });

  return result;
}

/**
 * Get the root folder name from files
 * @param {FileList} files
 * @returns {string} Root folder name
 */
function getRootName(files) {
  if (files.length === 0) return '';
  const firstPath = files[0].webkitRelativePath || files[0].name;
  return firstPath.split('/')[0];
}

/**
 * Count files and folders in tree
 * @param {Object} tree
 * @returns {{files: number, folders: number}}
 */
function countItems(tree) {
  let files = 0;
  let folders = 0;

  function traverse(node) {
    Object.entries(node).forEach(([name, value]) => {
      if (value === null) {
        files++;
      } else if (isCollapsed(value)) {
        folders++; // Count collapsed folder but not its contents
      } else {
        folders++;
        traverse(value);
      }
    });
  }

  traverse(tree);
  return { files, folders };
}

/**
 * Calculate maximum depth of tree
 * @param {Object} tree
 * @returns {number}
 */
function getTreeDepth(tree) {
  if (tree === null || isCollapsed(tree) || Object.keys(tree).length === 0) {
    return 0;
  }

  let maxDepth = 0;

  Object.values(tree).forEach(value => {
    if (value !== null && !isCollapsed(value)) {
      const depth = 1 + getTreeDepth(value);
      if (depth > maxDepth) {
        maxDepth = depth;
      }
    }
  });

  return maxDepth;
}

/**
 * Count all items (files + folders) in a tree recursively
 * @param {Object} tree
 * @returns {number}
 */
function countAllItems(tree) {
  if (tree === null) return 0;

  let count = 0;
  Object.values(tree).forEach(value => {
    count++; // Count this item
    if (value !== null && typeof value === 'object') {
      count += countAllItems(value); // Count children
    }
  });
  return count;
}

/**
 * Filter tree to collapse common clutter folders
 * @param {Object} tree
 * @param {Object} originalTree - Original unfiltered tree for counting
 * @returns {Object} Filtered tree with collapsed markers
 */
function filterTree(tree, originalTree = tree) {
  if (tree === null) return null;

  const filtered = {};

  Object.entries(tree).forEach(([name, value]) => {
    // Collapse excluded folders (show folder, hide contents with count)
    if (value !== null && SIMPLE_EXCLUDE.includes(name)) {
      const itemCount = countAllItems(value);
      filtered[name] = { _collapsed: true, _count: itemCount };
      return;
    }
    // Recurse into non-excluded folders
    if (value !== null) {
      filtered[name] = filterTree(value, value);
    } else {
      filtered[name] = null;
    }
  });

  return filtered;
}

/**
 * Check if a value is a collapsed marker
 */
function isCollapsed(value) {
  return value && typeof value === 'object' && value._collapsed === true;
}

/**
 * Render the current tree with current view mode
 */
function renderCurrentTree() {
  if (!currentRawTree || !currentRootName) return;

  const treeToRender = isSimpleMode
    ? filterTree(currentRawTree[currentRootName] || currentRawTree)
    : (currentRawTree[currentRootName] || currentRawTree);

  const counts = countItems(isSimpleMode ? { [currentRootName]: treeToRender } : currentRawTree);
  const depth = getTreeDepth(isSimpleMode ? { [currentRootName]: treeToRender } : currentRawTree);

  currentTree = currentRootName + '/\n' + renderTree(treeToRender);

  outputBox.textContent = currentTree;

  const modeLabel = isSimpleMode ? ' (simple)' : ' (full)';
  outputInfo.textContent = `${counts.folders} folders, ${counts.files} files, ${depth} deep${modeLabel}`;
}

/**
 * Process files and generate tree
 * @param {FileList} files
 */
function processFiles(files) {
  if (files.length === 0) return;

  // Store raw tree for toggle switching
  currentRawTree = buildTree(files);
  currentRootName = getRootName(files);

  // Render with current mode
  renderCurrentTree();
  outputSection.classList.add('visible');

  // Reset copy button state
  resetCopyButton();

  // Scroll to output
  outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Reset copy button to default state
 */
function resetCopyButton() {
  copyBtn.classList.remove('copied');
  copyBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
    Copy to clipboard
  `;
}

/**
 * Handle file input change
 */
fileInput.addEventListener('change', (e) => {
  processFiles(e.target.files);
});

/**
 * Handle drop zone click
 */
dropZone.addEventListener('click', () => {
  fileInput.click();
});

/**
 * Handle drag over
 */
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.add('drag-over');
});

/**
 * Handle drag leave
 */
dropZone.addEventListener('dragleave', (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.remove('drag-over');
});

/**
 * Handle drop
 */
dropZone.addEventListener('drop', async (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.remove('drag-over');

  const items = e.dataTransfer.items;

  if (items && items.length > 0) {
    const item = items[0];

    // Check if it's a directory using webkitGetAsEntry
    if (item.webkitGetAsEntry) {
      const entry = item.webkitGetAsEntry();

      if (entry && entry.isDirectory) {
        const files = await readDirectory(entry);
        processFilesFromEntries(files, entry.name);
        return;
      }
    }
  }

  // Fallback to regular file handling
  if (e.dataTransfer.files.length > 0) {
    processFiles(e.dataTransfer.files);
  }
});

/**
 * Read directory recursively using FileSystemEntry API
 * @param {FileSystemDirectoryEntry} dirEntry
 * @param {string} path
 * @returns {Promise<Array>}
 */
async function readDirectory(dirEntry, path = '') {
  const entries = [];

  async function readEntries(reader) {
    return new Promise((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });
  }

  async function processEntry(entry, currentPath) {
    const entryPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;

    if (entry.isFile) {
      entries.push({
        name: entry.name,
        path: entryPath,
        isFile: true
      });
    } else if (entry.isDirectory) {
      entries.push({
        name: entry.name,
        path: entryPath,
        isFile: false
      });

      const reader = entry.createReader();
      let batch;

      do {
        batch = await readEntries(reader);
        for (const childEntry of batch) {
          await processEntry(childEntry, entryPath);
        }
      } while (batch.length > 0);
    }
  }

  await processEntry(dirEntry, path);
  return entries;
}

/**
 * Process files from FileSystemEntry API
 * @param {Array} entries
 * @param {string} rootName
 */
function processFilesFromEntries(entries, rootName) {
  const tree = {};

  entries.forEach(entry => {
    const parts = entry.path.split('/');
    let current = tree;

    parts.forEach((part, index) => {
      if (!current[part]) {
        current[part] = index === parts.length - 1 && entry.isFile ? null : {};
      }
      if (current[part] !== null) {
        current = current[part];
      }
    });
  });

  // Store raw tree for toggle switching
  currentRawTree = tree;
  currentRootName = rootName;

  // Render with current mode
  renderCurrentTree();
  outputSection.classList.add('visible');

  resetCopyButton();
  outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Copy to clipboard - always copy what's currently displayed
 */
copyBtn.addEventListener('click', async () => {
  try {
    const textToCopy = outputBox.textContent;
    await navigator.clipboard.writeText(textToCopy);

    copyBtn.classList.add('copied');
    copyBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
      Copied!
    `;

    setTimeout(() => {
      copyBtn.classList.remove('copied');
      copyBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        Copy to clipboard
      `;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy:', err);
  }
});

/**
 * Click to select all text in output
 */
outputBox.addEventListener('click', () => {
  const range = document.createRange();
  range.selectNodeContents(outputBox);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
});

/**
 * Prevent default drag behavior on document
 */
document.addEventListener('dragover', (e) => {
  e.preventDefault();
});

document.addEventListener('drop', (e) => {
  e.preventDefault();
});

/**
 * Handle view toggle change
 */
viewToggle.addEventListener('change', () => {
  isSimpleMode = !viewToggle.checked;
  if (currentRawTree) {
    renderCurrentTree();
    resetCopyButton();
  }
});
