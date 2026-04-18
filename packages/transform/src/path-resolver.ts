/**
 * DOM Path Resolver
 * 
 * Calculates DOM traversal paths from a template root to dynamic nodes.
 * Used to generate accessor chains like: el.firstChild.nextSibling.firstChild
 */

import type { ElementInfo, ChildInfo } from './template-extractor.js';

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

  for (const child of toDomChildren(info.children)) {
    if (!isFirst) {
      childPath = childPath.slice(0, -1);
      childPath.push('nextSibling');
    }

    if (child.type === 'element' && child.elementInfo && !child.elementInfo.isComponent) {
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

      processElementChildren(elemInfo, childPath, nextVar);
    } else if (!child.isStatic) {
      const childVar = nextVar();
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

  // Generate declarations
  const declarations = generateDeclarations(paths);

  return { paths, declarations };

  /**
   * Process children of an element, using DOM-level child list (text nodes collapsed).
   */
  function processElementChildren(
    elemInfo: ElementInfo,
    parentPath: PathStep[],
    getNextVar: () => string
  ): void {
    let childPath = [...parentPath, 'firstChild' as PathStep];
    let isFirst = true;

    for (const child of toDomChildren(elemInfo.children)) {
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

        processElementChildren(subInfo, childPath, getNextVar);
      } else if (!child.isStatic) {
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
 * Collapse consecutive static-text ChildInfo entries into a single representative entry.
 *
 * When a JSX element has multiple adjacent text/static-expression children they are
 * written as individual entries in ChildInfo[], but the HTML parser merges adjacent
 * text content into ONE Text node.  Walking .nextSibling must therefore count them
 * as a single DOM node, not one per JSX child.
 *
 * Rule: a run of consecutive children that are ALL (type==='text' && isStatic===true)
 * is represented by exactly one DOM text node → collapse to one ChildInfo entry.
 * Everything else (elements, dynamic expressions, comment markers) stays as-is.
 */
function toDomChildren(children: ChildInfo[]): ChildInfo[] {
  const result: ChildInfo[] = [];
  let i = 0;
  while (i < children.length) {
    const child = children[i]!;
    if (child.type === 'text' && child.isStatic) {
      // Consume the entire run of adjacent static-text children as one DOM node
      while (i + 1 < children.length && children[i + 1]!.type === 'text' && children[i + 1]!.isStatic) {
        i++;
      }
      result.push(child); // representative entry (one DOM text node)
    } else {
      result.push(child);
    }
    i++;
  }
  return result;
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
