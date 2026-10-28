// A stand-in for the page, for the tests of the screens that are built from a `document`: just enough of an element for them to
// be built, clicked and looked at. It does nothing that a page does, and needs no page. (The developer panel's tests have a
// smaller one of their own.)
class FakeElement {
  constructor(tag) {
    this.tag = tag;
    this.children = [];
    this.listeners = {};
    this.style = {};
    this.textContent = "";
    this.value = "";
    this.className = "";
    this.disabled = false;
    this.readOnly = false;
    const element = this;
    this.classList = {
      get set() {
        return new Set(element.className.split(/\s+/).filter(Boolean));
      },
      add(name) {
        element.className = [...new Set([...this.set, name])].join(" ");
      },
      remove(name) {
        element.className = [...this.set].filter((one) => one !== name).join(" ");
      },
      contains(name) {
        return this.set.has(name);
      },
      toggle(name, force) {
        const on = force === undefined ? !this.set.has(name) : force;
        if (on) this.add(name);
        else this.remove(name);
        return on;
      },
    };
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  replaceChildren(...children) {
    this.children = [...children];
  }

  addEventListener(type, callback) {
    this.listeners[type] = callback;
  }

  click() {
    this.listeners.click();
  }

  blur() {
    this.blurred = (this.blurred || 0) + 1;
  }

  select() {
    this.selected = true;
  }

  // Every element below this one (and this one) that satisfies `test`.
  findAll(test) {
    const found = test(this) ? [this] : [];
    for (const child of this.children) found.push(...child.findAll(test));
    return found;
  }
}

const fakeDocument = { createElement: (tag) => new FakeElement(tag) };
