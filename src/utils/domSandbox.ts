/**
 * Utilitário de DOM Sandbox compatível com Browser e Node.js (sem dependência de jsdom no bundle web).
 */

export interface VirtualDOMLike {
  window: {
    document: any;
  };
}

class MinimalVirtualElement {
  public id: string = '';
  public tagName: string;
  public className: string = '';
  public style: Record<string, string> = {};
  public name: string = '';
  public value: string = '';
  public checked: boolean = false;
  public children: MinimalVirtualElement[] = [];
  public parent: MinimalVirtualElement | null = null;
  private attributes: Record<string, string> = {};
  private _innerHTML: string = '';
  private _textContent: string = '';

  constructor(tagName: string = 'div') {
    this.tagName = tagName.toUpperCase();
  }

  public get innerHTML(): string {
    return this._innerHTML;
  }

  public set innerHTML(html: string) {
    this._innerHTML = html;
    this.children = [];
    const stack: MinimalVirtualElement[] = [this];
    const tokenRegex = /<\/?([a-zA-Z0-9-]+)([^>]*)>|([^<]+)/g;
    let match: RegExpExecArray | null;
    while ((match = tokenRegex.exec(html)) !== null) {
      if (match[3]) {
        const text = match[3].trim();
        if (text && stack.length > 0) {
          const top = stack[stack.length - 1];
          top._textContent = top._textContent ? `${top._textContent} ${text}` : text;
        }
        continue;
      }
      const fullTag = match[0];
      const tagName = match[1];
      const attrs = match[2] || '';
      const isClosing = fullTag.startsWith('</');
      const isSelfClosing = fullTag.endsWith('/>') || ['br', 'hr', 'img', 'input', 'meta', 'link'].includes(tagName.toLowerCase());

      if (isClosing) {
        if (stack.length > 1) stack.pop();
      } else {
        const el = new MinimalVirtualElement(tagName);
        const idMatch = attrs.match(/\bid=["']([^"']+)["']/);
        if (idMatch) el.id = idMatch[1];
        const classMatch = attrs.match(/\bclass=["']([^"']+)["']/);
        if (classMatch) el.className = classMatch[1];
        const statusMatch = attrs.match(/\bdata-status-ata=["']([^"']+)["']/);
        if (statusMatch) el.setAttribute('data-status-ata', statusMatch[1]);
        const parent = stack[stack.length - 1];
        parent.appendChild(el);
        if (!isSelfClosing) {
          stack.push(el);
        }
      }
    }
  }

  public get textContent(): string {
    if (this._textContent) return this._textContent;
    return this.children.map((c) => c.textContent).join('');
  }

  public set textContent(val: string) {
    this._textContent = val;
  }

  public setAttribute(key: string, val: string): void {
    this.attributes[key] = val;
    if (key === 'id') this.id = val;
  }

  public getAttribute(key: string): string | null {
    if (key === 'id') return this.id || null;
    return this.attributes[key] ?? null;
  }

  public appendChild(child: MinimalVirtualElement): MinimalVirtualElement {
    child.parent = this;
    this.children.push(child);
    return child;
  }

  public prepend(child: MinimalVirtualElement): void {
    child.parent = this;
    this.children.unshift(child);
  }

  public replaceWith(replacement: MinimalVirtualElement): void {
    if (!this.parent) return;
    const idx = this.parent.children.indexOf(this);
    if (idx !== -1) {
      replacement.parent = this.parent;
      this.parent.children[idx] = replacement;
    }
  }

  public remove(): void {
    if (!this.parent) return;
    this.parent.children = this.parent.children.filter((c) => c !== this);
    this.parent = null;
  }

  public findById(targetId: string): MinimalVirtualElement | null {
    if (this.id === targetId) return this;
    for (const child of this.children) {
      const found = child.findById(targetId);
      if (found) return found;
    }
    return null;
  }

  public querySelectorAll(selector: string): MinimalVirtualElement[] {
    const results: MinimalVirtualElement[] = [];
    const selectors = selector.split(',').map((s) => s.trim());
    const visit = (node: MinimalVirtualElement) => {
      for (const child of node.children) {
        const matches = selectors.some((sel) => {
          if (sel.startsWith('#')) return child.id === sel.slice(1);
          if (sel.startsWith('.')) return child.className.split(/\s+/).includes(sel.slice(1));
          if (sel === 'form' || sel === 'textarea' || sel === 'input') {
            return child.tagName.toLowerCase() === sel;
          }
          if (sel.startsWith('button')) return child.tagName.toLowerCase() === 'button';
          return false;
        });
        if (matches) results.push(child);
        visit(child);
      }
    };
    visit(this);
    return results;
  }

  public querySelector(selector: string): MinimalVirtualElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }
}

export function createIsolatedDomSandbox(initialBodyHtml: string): VirtualDOMLike {
  // 1. Ambiente Browser ou Node com DOM já disponível (ex: JSDOM inicializado)
  if (
    typeof document !== 'undefined' &&
    document.implementation &&
    typeof document.implementation.createHTMLDocument === 'function'
  ) {
    const isolatedDoc = document.implementation.createHTMLDocument('TTFA Audit Sandbox');
    isolatedDoc.body.innerHTML = initialBodyHtml;
    return {
      window: {
        document: isolatedDoc
      }
    };
  }

  // 2. Fallback leve em Node.js puro (sem dependência de jsdom no bundle)
  const root = new MinimalVirtualElement('body');
  root.innerHTML = initialBodyHtml;

  const fakeDoc = {
    body: root,
    getElementById: (id: string) => root.findById(id),
    querySelector: (sel: string) => root.querySelector(sel),
    querySelectorAll: (sel: string) => root.querySelectorAll(sel),
    createElement: (tag: string) => new MinimalVirtualElement(tag)
  };

  return {
    window: {
      document: fakeDoc
    }
  };
}
