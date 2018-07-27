var QUnit = require("steal-qunit");
var MutationEncoder = require("./encoder");
var MutationPatcher = require("./patch");
var helpers = require("./test/test-helpers");
var log = require("./log");

QUnit.module("TextNodes", {
	afterEach: function(){
		helpers.fixture.clear();
	}
});

QUnit.test("Setting nodeValue", function(assert){
	var done = assert.async();

	var root = document.createElement("div");
	var article = document.createElement("article");
	article.appendChild(document.createTextNode("Article"));
	root.appendChild(article);
	helpers.fixture.el().appendChild(root);
	var clone = root.cloneNode(true);

	var encoder = new MutationEncoder(root);
	var patcher = new MutationPatcher(clone);

	var mo = new MutationObserver(function(records) {
		patcher.patch(encoder.encode(records));
		assert.equal(clone.textContent, "A title", "Patched correctly");
		done();
	});

	mo.observe(root, { childList: true, subtree: true, characterData: true });
	article.firstChild.nodeValue = "A title";
});

QUnit.skip("Setting textContent", function(assert){
	var done = assert.async();

	var root = document.createElement("div");
	var article = document.createElement("article");
	article.appendChild(document.createTextNode("Article"));
	root.appendChild(article);
	helpers.fixture.el().appendChild(root);
	var clone = root.cloneNode(true);

	var encoder = new MutationEncoder(root);
	var patcher = new MutationPatcher(clone);

	var mo = new MutationObserver(function(records) {
		patcher.patch(encoder.encode(records));
		assert.equal(clone.textContent, "A title", "Patched correctly");
		done();
	});

	mo.observe(root, { childList: true, subtree: true, characterData: true });
	article.textContent = "A title";
});
