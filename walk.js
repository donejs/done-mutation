
module.exports = function(node, callback, startIndex = 0) {
	let skip, tmp;
	let depth = 0;
	let index = startIndex;

	// Always start with the initial element.
	do {
		if ( !skip && (tmp = node.firstChild) ) {
			depth++;
			callback('child', node, tmp, index);
			index++;
		} else if ( tmp = node.nextSibling ) {
			skip = false;
			callback('sibling', node, tmp, index);
			index++;
		} else {
			tmp = node.parentNode;
			depth--;
			skip = true;
		}
		node = tmp;
	} while ( depth > 0 );
};
