/*
 * The concept of a nesting graph comes from Sander, "Layout of Compound
 * Directed Graphs". The idea is to add new "border nodes" at the top and
 * bottom of each cluster. This serves to define a portion of the bounding box
 * for the cluster. We also add edges between the top and bottom border nodes
 * and any nodes or clusters contained within it. This ensures that all
 * children are contained within the cluster's border.
 *
 * We do not want regular (or base) nodes to be at the same level as border
 * nodes because the latter should be much smaller than the former. Sander
 * proposes to place base nodes at levels in 2k + 1, where k is the height of
 * the tree.
 *
 * We currently do not support cluster to cluster edges with this algorithm.
 *
 * This algorithm expects as input a directed graph with each edge having a
 * `minLen` attribute. It updates the graph by adding edges as described above
 * and by lengthening existing edges to ensure that base nodes and border nodes
 * are never at the same level.
 */
exports.augment = function(g) {
  var height = treeHeight(g) - 1;

  g.eachEdge(function(e, u, v, value) {
    value.minLen *= 2 * height + 1;
  });

  function dfs(u) {
    var children = g.children(u);

    if (children.length) {
      children.forEach(function(v) { dfs(v); });

      // Add a top and bottom border for clusters (except the root graph)
      if (u !== null) {
        var top = g.addNode(null, {}),
            bottom = g.addNode(null, {}),
            value = g.node(u),
            depth = value.treeDepth;
        value.borderNodeTop = top;
        value.borderNodeBottom = bottom;

        children.forEach(function(v) {
          var minLen = g.children(v).length ? 1 : height - depth + 1;
          g.addEdge(null, top, v, { minLen: minLen, nestingEdge: true });
          g.addEdge(null, v, bottom, { minLen: minLen, nestingEdge: true });
        });
      }
    }
  }

  dfs(null);
};

/*
 * This function removes any nesting edges that were added with the `augment`
 * function.
 */
exports.remove = function(g) {
  g.eachEdge(function(e, u, v, value) {
    if (value.nestingEdge) {
      g.delEdge(e);
    }
  });
};

/*
 * Return the height of the given tree and augments each compound node with
 * its depth.
 */
function treeHeight(g) {
  function dfs(u, height) {
    var children = g.children(u);
    if (children.length === 0) {
      return height;
    } else {
      if (u !== null) {
        g.node(u).treeDepth = height;
      }
      return Math.max.apply(Math,
                            children.map(function(v) { return dfs(v, height + 1); }));
    }
  }
  return dfs(null, 0);
}