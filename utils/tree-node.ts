export function isChildNode(parentId: string, childId: string) {
  return childId.length > parentId.length && childId.startsWith(parentId)
}

export function isParentNode(parentId: string, childId: string) {
  return childId.length < parentId.length && childId.startsWith(parentId)
}

export function isRootNode(nodeId: string) {
  return nodeId === '0' // equal to `nodeDepth(nodeId) === 1`
}

export function parentNodeId(nodeId: string) {
  return nodeId.split('-').shift()
}

export function nodeIndex(nodeId: string) {
  return parseInt(nodeId.split('-').pop()!)
}

export function nodeDepth(nodeId: string) {
  return nodeId.split('-').length
}

/** Returns the next search breadth at a given node */
export function searchBreadth(initialBreadth: number, nodeId: string) {
  return Math.ceil(initialBreadth / Math.pow(2, nodeDepth(nodeId) - 1))
}
