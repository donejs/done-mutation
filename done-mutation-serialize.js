const TAG_SIZE = 3;

const INSERT_TAG = 0;
const REMOVE_TAG = 1;
const SET_ATTR_TAG = 2;
const REMOVE_ATTR_TAG = 3;
const STR_TAG = 4;


exports.writeArray = function(records) {
	let arr = [];
	for(let record of records) {
		for (let node of record.addedNodes) {
			arr.push(INSERT_TAG);
			arr.push(node);
		}
	}
	return arr;
};
