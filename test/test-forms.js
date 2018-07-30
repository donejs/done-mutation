var QUnit = require("steal-qunit");
var MutationDecoder = require("../decoder");
var MutationEncoder = require("../encoder");
var MutationPatcher = require("../patch");
var helpers = require("./test-helpers");

QUnit.module("Forms", {
	afterEach: function(){
		helpers.fixture.clear();
	}
});

QUnit.test("Text Input Change event", function(assert){
	var done = assert.async();

	var root = document.createElement("div");
	var input = document.createElement("input");
	input.type = "text";
	input.setAttribute("value", "foo");
	root.appendChild(input);
	helpers.fixture.el().appendChild(root);
	var clone = root.cloneNode(true);

	var encoder = new MutationEncoder(root);
	var decoder = new MutationDecoder(root.ownerDocument);
	var patcher = new MutationPatcher(clone);

	root.addEventListener("change", ev => {
		// Patching
		patcher.patch(encoder.encodeEvent(ev));
		assert.equal(clone.firstChild.value, "hello");

		// Decoding
		var mutations = Array.from(decoder.decode(encoder.encodeEvent(ev)));
		assert.equal(mutations.length, 1);
		assert.equal(mutations[0].type, "property");

		done();
	});

	input.value = "hello";
	input.dispatchEvent(new Event("change", { bubbles: true }));
});

QUnit.test("Checkbox change event", function(assert){
	var done = assert.async();

	var root = document.createElement("div");
	var input = document.createElement("input");
	input.type = "checkbox";
	input.setAttribute("checked", "");
	root.appendChild(input);
	helpers.fixture.el().appendChild(root);
	var clone = root.cloneNode(true);

	var encoder = new MutationEncoder(root);
	var decoder = new MutationDecoder(root.ownerDocument);
	var patcher = new MutationPatcher(clone);

	root.addEventListener("change", ev => {
		// Patching
		let bytes = encoder.encodeEvent(ev);
		patcher.patch(bytes);
		assert.equal(clone.firstChild.checked, false, "now unchecked");

		// Decoding
		var mutations = Array.from(decoder.decode(encoder.encodeEvent(ev)));
		assert.equal(mutations.length, 1);
		assert.equal(mutations[0].type, "property");

		done();
	});

	input.checked = false;
	input.dispatchEvent(new Event("change", { bubbles: true }));
});
