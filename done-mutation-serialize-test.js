var QUnit = require("steal-qunit");
var serialize = require("./done-mutation-serialize");
var helpers = require("./test-helpers");

QUnit.module("done-mutation-serialize", {
	afterEach: function(){
		helpers.fixture.clear();
	}
});

QUnit.test("Basics", function(assert){
	var done = assert.async();

	var root = document.createElement("div");
	var child1 = document.createElement("article");
	var child2 = document.createElement("section");
	root.appendChild(child1);
	root.appendChild(child2);
	helpers.fixture.el().appendChild(root);

	var mo = new MutationObserver(function(records) {
		var instr = serialize.writeArray(records);

		assert.ok(instr.length);
		done();
	});

	mo.observe(root, { childList: true, subtree: true });
	child1.appendChild(document.createTextNode("foo"));
});
