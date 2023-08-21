const $id = (s) => document.getElementById(s);
const $class = (s) => document.getElementsByClassName(s)[0];
const $create = (s) => document.createElement(s);

let config, sitemap;

const util = {
  arrow: $class('arrow').cloneNode(true)
}

$class('arrow').remove();
util.arrow.removeAttribute('style');

const history = new Map();
const current = {
  path: window.location.pathname,
  doc: null
};

function getRedirect(label, link) {
  const div = $create('div');
  const span = $create('span');
  div.classList.add('redirect');
  span.textContent = label;
  div.appendChild(span);
  div.appendChild(util.arrow.cloneNode(true));
  div.setAttribute('onclick', `navigateTo('${link}')`);
  return div;
}
function getBottomNav(item, index) {
  const div = $create('div');
  const text = $create('div');
  const span = $create('span');
  const label = $create('label');
  div.classList.add(index === 0 ? 'before' : 'after');
  div.appendChild(util.arrow.cloneNode(true));
  span.textContent = index === 0 ? 'Previous' : 'Next';
  label.textContent = item.label;
  text.appendChild(span);
  text.appendChild(label);
  div.appendChild(text);
  div.onclick = navigateTo.bind(null, item.link);
  return div;
}
function getCategoryHTML(obj) {
  const fragment = $create('div');
  const heading = $create('h1');
  fragment.classList.add('redirects-column');
  heading.textContent = obj.label;
  fragment.appendChild(heading);
  for (const i of obj.childrens) {
    fragment.appendChild(getRedirect(i.label, i.link));
  }
  return fragment.outerHTML;
}
function getLink(label, link, part) {
  const a = $create('a');
  const span = $create('span');
  span.textContent = label;
  a.href = link;
  a.appendChild(span);
  if (part) {
    const svg = util.arrow.cloneNode(true);
    svg.onclick = (e) => {
      const el = e.target.closest('a');
      if (el.getAttribute('open')) {
        el.removeAttribute('open');
      } else {
        el.setAttribute('open', true);
      }
    }
    a.appendChild(svg);
  }
  a.onclick = (e) => {
    e.preventDefault();
    e.target.setAttribute('open', true);
    navigateTo(e.target.href);

  }
  return a;
}

class SummaryWrapper {
  constructor() {
    this.article = $class('article');
    this.summary = $class('summary');
    this.body = $class('body');
    this.observer = this.createObserver();
  }

  createObserver() {
    return new IntersectionObserver((entries) => {

      const active = this.summary.getElementsByClassName('active');
      const bodyBounding = this.body.getBoundingClientRect();

      for (const i of active) {
        const id = i.getAttribute('href').substring(1);

        let isRead = false;
        let target = document.getElementById(id);

        while (!isRead && target.nextElementSibling && !['H1', 'H2'].includes(target.nextElementSibling.nodeName)) {
          target = target.nextElementSibling;
          const bounding = target.getBoundingClientRect();

          if (
            (bounding.top > bodyBounding.top && bounding.top < window.innerHeight)
          ) {
            isRead = true;
          }
        }

        if (!isRead) {
          i.classList.remove('active');
        }
      }

      for (const i of entries) {
        if (i.isIntersecting) {

          this.summary
            .querySelector(`a[href="#${i.target.id}"]`)
            ?.classList.add('active');
        } else {
          if (i.boundingClientRect.top > bodyBounding.top) {
            if (active.length <= 1) {
              this.summary.querySelector(`a[href="#${i.target.id}"]`)
                .previousElementSibling
                ?.classList.add('active');

              this.summary.querySelector(`a[href="#${i.target.id}"]`).classList.remove('active');
            }
          }
        }
      }
    },
      {
        root: $class('body'),
        rootMargin: '0px 0px -20% 0px'
      });
  }
  unobserve() {
    for (const tag of this.article.querySelectorAll('h1[id], h2[id]')) {
      this.observer.unobserve(tag);
    }
  }
  observe() {
    this.unobserve();
    this.summary.innerHTML = '';
    for (const tag of this.article.querySelectorAll('h1[id], h2[id]')) {
      const a = $create('a');
      a.textContent = tag.textContent;
      a.href = `#${tag.id}`;
      a.style.setProperty(
        '--level',
        tag.tagName.toLowerCase() === 'h1'
          ? 1
          : 2
      );
      this.summary.appendChild(a);
      this.observer.observe(tag);
    }
  }
}
const summary = new SummaryWrapper();

class DocumentWrapper {
  constructor(sitemap) {
    this.nav = $class('nav');
    this.article = $class('article');
    this.content = $class('content');
    this.summary = $class('summary');
    this.notFoundHTML = $class('notfound').innerHTML;

    this.sitemap = sitemap;
    this.history = new Map();
    this.next = [null];
    this.convert = new Map();

    this.nav
      .appendChild(
        this.createSiteMap({ link: '', childrens: sitemap }, true)
      );

    Array.from(
      document.getElementsByClassName('category')
    )
      .forEach(
        (i) => i.style.setProperty(
          '--max-height',
          (i.offsetHeight + i.scrollHeight + 100) + 'px'
        )
      );

    this.next.push(null);
  }

  addNext(item) {
    this.convert.set(item.link, this.next.length);
    this.next.push(item);
  }

  openCategory(element) {
    const el = element?.closest('.category:not([open])')?.previousElementSibling;
    if (el) {
      el.setAttribute('open', true);
      this.openCategory(el);
    }
  }

  createSiteMap(parent, root) {
    const fragment = $create('div');
    fragment.classList.add('category')
    for (const i of parent.childrens) {
      if (i.type === 0) {
        if (i.link !== parent.link) {
          fragment.appendChild(getLink(i.label, i.link));
          this.addNext(i);
        }
      } else if (i.type === 1) {
        if (root) {
          const heading = $create('h1');
          heading.textContent = i.label;
          fragment.appendChild(heading);
        } else {
          const a = getLink(i.label, i.link, true);
          fragment.appendChild(a);
        }
        fragment.appendChild(this.createSiteMap(i, false));
      }
    }
    return fragment;
  }

  fromSitemap(map, path, sub) {
    const [_, part, rest] = /^\/([^\/]+?)?(\/.*)?$/
      .exec(path.substring(sub));

    if (!part) return;

    const item = map
      .find((i) => i.link.substring(sub)
        .split(/\//)[1] === part);

    if (!item) return;

    if (item.link === path) {
      return item;
    } else {
      if (item.type === 0 || !rest) {
        return;
      } else if (item.type === 1) {
        return this.fromSitemap(item.childrens, path, sub + part.length + 1);
      }
    }
  }

  scrollToHash() {
    if (window.location.hash) {
      $id(window.location.hash.substring(1))?.scrollIntoView();
    } else {
      this.content.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }
  showDocument() {
    const page = this.history.get(current.path);

    $class('current-link')?.classList.remove('current-link');

    if (page?.exists) {

      const a = this.nav
        .querySelector(`a[href="${current.path}"]`)

      a?.classList.add('current-link');

      this.openCategory(a);

      document.title = page.label
        ? `${page.label} | ${config.title}`
        : config.title;

      const html = this.history.get(current.path).html;
      this.article.innerHTML = html;

      summary.observe();
    } else {
      document.title = `Not found | ${config.title}`
      this.article.innerHTML = this.notFoundHTML;
    }

    const index = this.convert.get(current.path);

    if (index) {
      const div = $create('div');
      div.classList.add('bottom-nav');
      const before = this.next[index - 1];
      const after = this.next[index + 1];
      if (before) div.appendChild(getBottomNav(before, 0));
      if (after) div.appendChild(getBottomNav(after, 1));
      this.article.appendChild(div);
    }

    this.scrollToHash();
  }

  fetchDocument() {

    if (this.history.has(current.path)) {
      return this.showDocument(current.path);
    }

    const category = this.fromSitemap(this.sitemap, current.path, 0);

    if (category?.type === 1) {
      this.history.set(category.link, {
        exists: true,
        metadata: {},
        label: category.label,
        html: getCategoryHTML(category)
      });
      return this.showDocument(current.path);
    }

    console.log('Fetching', current.path);
    fetch(`/api/doc${current.path}`)
      .then((res) => res.json())
      .then(((data) => {
        this.history.set(data.path, {
          exists: data.exists,
          html: data.content,
          metadata: data.metadata,
          label: data.label
        });
        this.showDocument(data.path);
      }).bind(this));
  }
}
const documents = new DocumentWrapper(window.__CONFIG__.sitemap);

function navigateTo(path) {
  window.history.pushState({}, path, path);
  current.path = window.location.pathname;
  documents.fetchDocument();
}
/*
function fetchSummary() {
  fetch('/summary.json')
    .then(r => r.json())
    .then(data => summary.children(1).html(getDetails(data.items)));
}

input.on('input', (e) => {
  const reg = new RegExp(e.target.value.toLowerCase().replace(/(\w+)/g, '(?=.*$1)').replace(/ /g, ''), "g");
  summary.children(1).find('li').each(i => {
    if (i.textContent.toLowerCase().search(reg) === -1) {
      i.style.display = 'none';
    } else {
      i.style.display = 'block';
    }
  });
});
*/

window.onload = async () => {
  config = window.__CONFIG__;
  sitemap = window.__CONFIG__.sitemap;
  delete config.sitemap;
  documents.fetchDocument();
}
window.onpopstate = async () => {
  current.path = window.location.pathname;
  await documents.fetchDocument();

}