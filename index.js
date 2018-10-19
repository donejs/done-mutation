const parentSymbol = Symbol.for("done.parentNode");

class NodeIndex {
	constructor(root, options = { collapseTextNodes: false }) {
		this.root = root;
		this.map = new WeakMap();
		this.parentMap = new WeakMap();
		this.collapseTextNodes = options.collapseTextNodes;
		this.walk(root);
		this._onMutations = this._onMutations.bind(this);
	}

	reIndexFrom() {
		// TODO make this not horrible.
		// This should walk up the parents until it finds a parent without
		// Any nextSiblings.
		let startNode = this.root;
		this.walk(startNode);
	}

	setParentIndex(searchNode) {
		let parent = searchNode.parentNode;
		let node = parent.firstChild;
		let index = 0;

		while(node && node !== searchNode) {
			index++;
			node = node.nextSibling;
		}

		this.parentMap.set(searchNode, index);
	}

	// Based on https://gist.github.com/cowboy/958000
	walk(node, startIndex = 0) {
		let collapseTextNodes = this.collapseTextNodes;
		let skip, tmp;
		let parentIndex = new Map();
		parentIndex.set(node, 0);

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

				parentIndex.set(node, 0);
				this.parentMap.set(tmp, 0);
				tmp[parentSymbol] = node;


				let incrementIndex = true;
				if(collapseTextNodes && node.nodeName === "HTML" &&
					(node.firstChild && node.firstChild.nodeType === 3)) {
					incrementIndex = false;
				}

				if(incrementIndex) {
					index++;
				}
			} else if ( tmp = node.nextSibling ) {
				// If skipping or there is no first child, get the next sibling. If
				// there is a next sibling, reset the skip flag.
				skip = false;
				this.map.set(tmp, index);

				let incrementIndex = true;
				let parentI = parentIndex.get(tmp.parentNode);

				if(collapseTextNodes && tmp.nodeType === 3 && node.nodeType === 3) {
					incrementIndex = false;
				} else {
					parentI = parentI + 1;
				}

				parentIndex.set(tmp.parentNode, parentI);
				this.parentMap.set(tmp, parentI);

				tmp[parentSymbol] = tmp.parentNode;

				if(incrementIndex) {
					index++;
				}
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
	for(node) {
		if(this.map.has(node)) {
			return this.map.get(node);
		}

		throw new Error("We don't know about this node", node);
	}

	fromParent(node) {
		let parent = node[parentSymbol];
		let parentIndex = this.for(parent);
		let childIndex = this.parentMap.get(node);
		return [parentIndex, childIndex];
	}

	purge(node) {
		// TODO this should do something different...
		let index = this.for(node);
		this.map.delete(node);
		this.parentMap.delete(node);
		return index;
	}

	startObserving() {
		let doc = this.root.nodeType === 9 ? this.root : this.root.ownerDocument;
		let window = doc.defaultView;
		console.assert(window, "Cannot observe without a 'window' object");
		let MutationObserver = window.MutationObserver;
		console.assert(MutationObserver, "Cannot observe without a MutationObserver");
		this._observer = new MutationObserver(this._onMutations);
		this._observer.observe(this.root, {
			subtree: true,
			childList: true
		});
	}

	stopObserving() {
		if(this._observer) {
			this._observer.disconnect();
		}
	}

	_onMutations(records) {
		// Ensure that we have indexed each added Node.
		let index = this;
		records.forEach(function(record){
			record.addedNodes.forEach(function(node){
				index.reIndexFrom(node);
			});
		});
	}
}

module.exports = NodeIndex;
