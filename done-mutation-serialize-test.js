var QUnit = require("steal-qunit");
var serialize = require("./done-mutation-serialize");
var helpers = require("./test-helpers");
var log = require("./log");

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
	var child3 = document.createElement("ul");
	root.appendChild(child1);
	root.appendChild(child2);
	root.appendChild(child3);
	helpers.fixture.el().appendChild(root);

	var logger = log.element(root);

	var mo = new MutationObserver(function(records) {
		let instr = [];
		for(let b of serialize.bytes(records)) {
			instr.push(b);
		}

		console.log(instr);

		assert.ok(instr.length);
		logger.disconnect();
		done();
	});

	mo.observe(root, { childList: true, subtree: true });
	child1.appendChild(document.createTextNode("foo"));
	root.insertBefore(child3, child1);
});
