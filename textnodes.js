const initialNodeSymbol = Symbol.for("done.initialNode");
const deletedNodeSymbol = Symbol.for("done.deletedNode");

exports.markInitial = function markInitial(markInitialTextNodes, node) {
	if(markInitialTextNodes) {
		node[initialNodeSymbol] = true;
	}
};

function isInitialNode(node) {
	return node && node[initialNodeSymbol];
}

exports.shouldIncrementIndex = function shouldIncrementIndex(collapseTextNodes, node, previousSibling) {
	if(collapseTextNodes && node[deletedNodeSymbol]) {
		return false;
	}

	if(collapseTextNodes && previousSibling && previousSibling.nodeType === 3 && node.nodeType === 3) {
		if(previousSibling[initialNodeSymbol] && node[initialNodeSymbol]) {
			return false;
		}
	}

	return true;
};

// Update sibling TextNodes when a node is removed from the document
exports.updateSiblings = function(node, record) {
	if(node[initialNodeSymbol]) {
		if(record.previousSibling) {
			if(isInitialNode(record.previousSibling)) {
				record.previousSibling[deletedNodeSymbol] = true;
			}
		}

		if(record.nextSibling) {
			if(isInitialNode(record.nextSibling)) {
				record.nextSibling[deletedNodeSymbol] = true;
			}
		}

		/*if(!record.previousSibling) {
			if(record.nextSibling) {
				if(!isInitialNode(record.nextSibling.nextSibling)) {
					delete record.nextSibling[initialNodeSymbol];
				}
			}
		}
		else if(!record.nextSibling) {
			if(record.previousSibling) {
				if(!isInitialNode(record.previousSibling.previousSibling)) {
					delete record.previousSibling[initialNodeSymbol];
				}
			}
		}*/
	}
};
