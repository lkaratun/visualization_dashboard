const d3 = require("d3");

d3.selection.prototype.moveToFront = function () {
  return this.each(function () {
    this.parentNode.appendChild(this);
  });
};
d3.selection.prototype.moveToBack = function () {
  return this.each(function () {
    const { firstChild } = this.parentNode;
    if (firstChild) {
      this.parentNode.insertBefore(this, firstChild);
    }
  });
};