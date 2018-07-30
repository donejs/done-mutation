var QUnit = require("steal-qunit");
var MutationEncoder = require("../encoder");
var MutationPatcher = require("../patch");
var helpers = require("./test-helpers");

QUnit.module("Attributes", {
	afterEach: function(){
		helpers.fixture.clear();
	}
});

QUnit.test("Setting attributes", function(assert){
	var done = assert.async();

	var root = document.createElement("div");
	var article = document.createElement("article");
	article.setAttribute("foo", "bar");
	root.appendChild(article);
	helpers.fixture.el().appendChild(root);
	var clone = root.cloneNode(true);

	var encoder = new MutationEncoder(root);
	var patcher = new MutationPatcher(clone);

	var mo = new MutationObserver(function(records) {
		patcher.patch(encoder.encode(records));
		assert.equal(clone.firstChild.getAttribute("foo"), "baz", "it is now baz");
		done();
	});

	mo.observe(root, { subtree: true, attributes: true });
	article.setAttribute("foo", "baz");
});
