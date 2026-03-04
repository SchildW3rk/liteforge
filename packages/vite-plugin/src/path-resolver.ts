/**
 * DOM Path Resolver
 * 
 * Calculates DOM traversal paths from a template root to dynamic nodes.
 * Used to generate accessor chains like: el.firstChild.nextSibling.firstChild
 */

import type { ElementInfo } from './template-extractor.js';

// =============================================================================
// Types
// =============================================================================

/**
 * A single step in a DOM path
 */
export type PathStep = 'firstChild' | 'nextSibling';

/**
 * A complete path from root to a target node
 */
export interface DomPath {
  /** The steps to reach this node from root */
  steps: PathStep[];
  /** Variable name for this node (e.g., "_el2") */
  varName: string;
  /** Type of target: attribute, child, or event */
  targetType: 'attribute' | 'child' | 'event';
  /** For attribute targets, the attribute names */
  attrNames?: string[];
  /** For child targets, the index in children array */
  childIndex?: number;
}

/**
 * Result of path resolution for a template
 */
export interface PathResolution {
  /** All paths needed for hydration */
  paths: DomPath[];
  /** Variable declarations code */
  declarations: string[];
}

// =============================================================================
// Path Resolution
// =============================================================================

/**
 * Resolve all DOM paths needed for a template
 */
export function resolvePaths(info: ElementInfo): PathResolution {
  const paths: DomPath[] = [];
  let varCounter = 1; // Start from 1 (_el is root)
  
  /**
   * Generate next variable name
   */
  function nextVar(): string {
    return `_el${++varCounter}`;
  }
  
  // Start processing from root
  // Root element's dynamic attrs/events don't need a path (they're on _el)
  if (info.dynamicAttrs.length > 0 || info.eventHandlers.length > 0 || info.hasSpread) {
    paths.push({
      steps: [],
      varName: '_el',
      targetType: 'attribute',
      attrNames: [...info.dynamicAttrs, ...info.eventHandlers],
    });
  }
  
  // Process children of root
  let childPath: PathStep[] = ['firstChild'];
  let isFirst = true;
  
  for (const child of info.children) {
    if (!isFirst) {
      // Replace last step with nextSibling
      childPath = childPath.slice(0, -1);
      childPath.push('nextSibling');
    }
    
    if (child.type === 'element' && child.elementInfo && !child.elementInfo.isComponent) {
      // Non-component element child: may need attribute/event binding + recurse into children
      const elemInfo = child.elementInfo;
      const needsVar =
        elemInfo.dynamicAttrs.length > 0 ||
        elemInfo.eventHandlers.length > 0 ||
        elemInfo.hasSpread;

      if (needsVar) {
        const varName = nextVar();
        paths.push({
          steps: [...childPath],
          varName,
          targetType: 'attribute',
          attrNames: [...elemInfo.dynamicAttrs, ...elemInfo.eventHandlers],
        });
      }

      // Process children recursively
      processElementChildren(elemInfo, childPath, nextVar);
    } else if (!child.isStatic) {
      // Dynamic child (expression, fragment, or component element) needs a 'child' path.
      // A comment marker placeholder is emitted in the HTML template for this slot.
      const childVar = nextVar();
      paths.push({
        steps: [...childPath],
        varName: childVar,
        targetType: 'child',
        childIndex: child.index,
      });
    }
    
    isFirst = false;
    // Add nextSibling for next iteration
    childPath = [...childPath, 'nextSibling'];
  }
  
  // Generate declarations
  const declarations = generateDeclarations(paths);
  
  return { paths, declarations };
  
  /**
   * Process children of an element
   */
  function processElementChildren(
    elemInfo: ElementInfo,
    parentPath: PathStep[],
    getNextVar: () => string
  ): void {
    let childPath = [...parentPath, 'firstChild' as PathStep];
    let isFirst = true;
    
    for (const child of elemInfo.children) {
      if (!isFirst) {
        childPath = childPath.slice(0, -1);
        childPath.push('nextSibling');
      }
      
      if (child.type === 'element' && child.elementInfo && !child.elementInfo.isComponent) {
        const subInfo = child.elementInfo;
        const needsVar =
          subInfo.dynamicAttrs.length > 0 ||
          subInfo.eventHandlers.length > 0 ||
          subInfo.hasSpread;

        if (needsVar) {
          const varName = getNextVar();
          paths.push({
            steps: [...childPath],
            varName,
            targetType: 'attribute',
            attrNames: [...subInfo.dynamicAttrs, ...subInfo.eventHandlers],
          });
        }

        // Recurse
        processElementChildren(subInfo, childPath, getNextVar);
      } else if (!child.isStatic) {
        // Dynamic child (expression, fragment, or component element) — comment marker slot
        const childVar = getNextVar();
        paths.push({
          steps: [...childPath],
          varName: childVar,
          targetType: 'child',
          childIndex: child.index,
        });
      }
      
      isFirst = false;
      childPath = [...childPath, 'nextSibling'];
    }
  }
}

/**
 * Generate variable declarations from paths
 */
function generateDeclarations(paths: DomPath[]): string[] {
  const declarations: string[] = [];
  
  // Group paths by their prefix to optimize traversal
  // Sort by path length so we can reuse shorter paths
  const sortedPaths = [...paths]
    .filter(p => p.steps.length > 0)
    .sort((a, b) => a.steps.length - b.steps.length);
  
  // Track what variables we've created
  const varMap = new Map<string, string>();
  varMap.set('', '_el'); // Root
  
  for (const path of sortedPaths) {
    const stepsKey = path.steps.join('.');
    
    // Check if we can build from an existing variable
    let bestPrefix = '';
    let bestPrefixVar = '_el';
    
    for (const [key, varName] of varMap) {
      if (stepsKey.startsWith(key) && key.length > bestPrefix.length) {
        bestPrefix = key;
        bestPrefixVar = varName;
      }
    }
    
    // Build the remaining path
    const remainingSteps = path.steps.slice(
      bestPrefix ? bestPrefix.split('.').length : 0
    );
    
    if (remainingSteps.length > 0) {
      const accessor = remainingSteps.join('.');
      declarations.push(`const ${path.varName} = ${bestPrefixVar}.${accessor};`);
      varMap.set(stepsKey, path.varName);
    }
  }
  
  return declarations;
}

/**
 * Simplify a path by finding common prefixes with existing paths
 */
export function pathToAccessor(steps: PathStep[], rootVar = '_el'): string {
  if (steps.length === 0) {
    return rootVar;
  }
  return `${rootVar}.${steps.join('.')}`;
}
