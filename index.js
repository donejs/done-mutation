
class NodeIndex {
	constructor(root) {
		this.root = root;
		this.map = new WeakMap();

		//debugger;
		this.walk(root);
	}

	// Based on https://gist.github.com/cowboy/958000
	walk(node, startIndex = 0) {
		let skip, tmp;

		// This depth value will be incremented as the depth increases and
		// decremented as the depth decreases. The depth of the initial node is 0.
		let depth = 0;
		let index = startIndex;

		// Always start with the initial element.
		do {
			if ( !skip && (tmp = node.firstChild) ) {
				// If not skipping, get the first child. If there is a first child,
				// increment the index since traversing downwards.
				depth++;

				// Set the index of this node
				this.map.set(tmp, index);
				index++;
			} else if ( tmp = node.nextSibling ) {
				// If skipping or there is no first child, get the next sibling. If
				// there is a next sibling, reset the skip flag.
				skip = false;
				this.map.set(tmp, index);
				index++;
			} else {
				// Skipped or no first child and no next sibling, so traverse upwards,
				tmp = node.parentNode;
				// and decrement the depth.
				depth--;
				// Enable skipping, so that in the next loop iteration, the children of
				// the now-current node (parent node) aren't processed again.
				skip = true;
			}

			// Instead of setting node explicitly in each conditional block, use the
			// tmp var and set it here.
			node = tmp;

			// Stop if depth comes back to 0 (or goes below zero, in conditions where
			// the passed node has neither children nore next siblings).
		} while ( depth > 0 );
	}

	// Get the cached index of a Node. If you can't find that,
	// Walk up to a parent that is indexed. At that point index down its children.
	for(searchNode) {
		let node = searchNode;
		let root = this.root;

		if(this.map.has(node)) {
			return this.map.get(node);
		}

		let cont = true;
		do {
			node = node.parentNode;

			if(this.map.has(node)) {
				this.walk(node, this.map.get(node) + 1);
				return this.map.get(searchNode);
			}
		} while(node !== root);
	}

	purge() {

	}
}

module.exports = NodeIndex;
