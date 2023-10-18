const root = document.body;

const config = { ...window.__CONFIG__, sitemap: undefined };
const sitemap = window.__CONFIG__.sitemap;

const removeChildren = (folder) => ({ ...folder, children: undefined });

const fetchJSON = (url, options) => {
  return new Promise((resolve) => {
    fetch(url, options)
      .then(res => {
        if (res.ok) {
          return resolve(res.json());
        }
        setTimeout(() => fetchJSON(url, options).then(resolve), 2000);
      })
      .catch(error => {
        setTimeout(() => fetchJSON(url, options).then(resolve), 2000);
      })
  });
}

const isOutViewport = (parent, child) => {
  var box1coords = parent.getBoundingClientRect();
  var box2coords = child.getBoundingClientRect();

  return (
    box2coords.top < box1coords.top ||
    box2coords.right > box1coords.right ||
    box2coords.bottom > box1coords.bottom ||
    box2coords.left < box1coords.left
  );
}

let path = window.location.pathname;
let exists = true;
let loading = true;

const cache = new Map();
const directories = new Map();
const files = new Map();

let headings = [];
const cursus = [];

let current = undefined;

let readingHeadingsCount = 0;
let isObserverFirstRound = true;
let contentElement = undefined;

let menuOpened = false;
let isFirstPage = true;

const setHeadingReadingStatus = (id, reading) => {
  const index = headings.findIndex((value) => value.hash === id);

  if (index !== -1) {
    headings[index].reading = reading;
  }
}

const observerCallback = (entries) => {

  if (readingHeadingsCount === 0) {
    for (const heading of headings) {
      heading.reading = false;
    }
  }

  for (const entry of entries) {
    if (entry.isIntersecting === true) {
      setHeadingReadingStatus(entry.target.id, true);
      readingHeadingsCount++;
    } else {
      setHeadingReadingStatus(entry.target.id, false);

      if (!isObserverFirstRound) {
        readingHeadingsCount--;
      }
    }
  }

  readingHeadingsCount = Math.max(0, readingHeadingsCount);

  if (readingHeadingsCount === 0 && contentElement) {
    for (let i = headings.length - 1; i >= 0; i--) {
      const rect = contentElement.querySelector('#' + headings[i].hash)?.getBoundingClientRect();

      if (rect && rect.top - rect.height <= 80) {
        headings[i].reading = true;
        break;
      }
    }
  }

  isObserverFirstRound = false;

  m.redraw();
};

const observerOptions = {
  root: document.getElementById('content'),
  rootMargin: '0px 0px -20% 0px',
  threshold: 1
};

let observer = new IntersectionObserver(observerCallback, observerOptions);

const updateTableOfContent = () => {
  readingHeadingsCount = 0;
  isObserverFirstRound = true;
  headings = [];

  for (const heading of contentElement?.querySelectorAll('h1[id], h2[id]') ?? []) {
    headings.push({
      label: heading.textContent,
      level: heading.nodeName === 'H1' ? 1 : 2,
      hash: heading.id,
      reading: false
    });

    observer.observe(heading);
  }

  m.redraw();
}

const saveSitemapChild = (child, parent) => {
  if (child.type === 0) {
    cursus.push(child.link);
    files.set(child.link, { ...child, parent: removeChildren(parent) });
  } else {
    directories.set(child.link, { ...child, parent: removeChildren(parent), children: child.children.map(removeChildren) });
  }
}

const browseSitemapChilds = (parent) => {
  for (const child of parent.children) {
    saveSitemapChild(child, parent);
    if (child.type === 1) {
      browseSitemapChilds(child);
    }
  }
}

const generateMaps = () => {
  for (const child of sitemap) {
    saveSitemapChild(child, undefined);
    if (child.type === 1) {
      browseSitemapChilds(child);
    }
  }
}

const loadPath = (path) => {
  loading = true;
  fetchJSON(`/api/doc${path}.json`)
    .then((data) => {
      cache.set(path, data);
      loading = false;
      update();
    })
    .catch(() => {
      cache.set(path, undefined);
      loading = false;
      current = undefined;
      update();
    });
}

const openNav = () => {
  const p = path;

  const iterate = (children) => {
    for (const child of children) {
      if (child.type === 1 && p.startsWith(child.link) && p.substring(child.link)[0] === '/') {
        child.open = true;
        iterate(child.children);
        break;
      }
    }
  }

  iterate(sitemap);
}

const showPath = (path) => {
  openNav();

  const index = cursus.indexOf(path);

  const previous = index > 0 && index !== -1 ? cursus[index - 1] : null;
  const next = index < cursus.length - 1 && index !== -1 ? cursus[index + 1] : null;

  current = { ...cache.get(path), ...files.get(path), ...directories.get(path), next, previous };

  document.title = `${current.label} · ${config.title}`;
}



const update = () => {
  path = window.location.pathname;

  if (path.endsWith('/') && path.length > 1) {
    path = path.slice(0, -1);
    history.replaceState({}, '', path);
  }

  if (files.has(path)) {
    exists = true;
    if (cache.has(path)) {
      showPath(path);
    } else {
      return loadPath(path);
    }
  } else if (directories.has(path)) {
    exists = true;
    current = directories.get(path);
    openNav();
  } else {
    exists = false;
    current = undefined;
  }

  m.redraw.sync();
  updateTableOfContent();
  showCurrentHash();
  isFirstPage = false;
}

const navigate = (path) => {
  window.history.pushState({}, path, path);
  path = window.location.pathname;
  menuOpened = false;
  update();
}

const showCurrentHash = () => {
  if (window.location.hash) {
    document.querySelector(`.body ${window.location.hash}`)?.scrollIntoView();
  } else {
    document.querySelector('.body').scrollTop = 0;
  }
}

const navigationArrow = {
  view: (node) => m('svg', {
    fill: 'none',
    viewBox: '0 0 24 24',
    stroke: 'currentColor',
    class: 'arrow',
    onclick: node.attrs.onclick
  }, m('path', {
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-width': 2,
    d: 'M9 5l7 7-7 7'
  }))
};

const navFragment = {
  view: (node) => m('div', { class: 'category', 'max-height': '' }, node.attrs.children.map((child) => {

    if (child.type === 0) {
      if (node.attrs.level > 1 && child.link === node.attrs.parent) {
        return;
      }
      return m(
        'a',
        {
          href: child.link,
          class: child.link === path ? 'current-link' : '',
          onclick: (e) => {
            navigate(child.link);
            e.preventDefault();
          }
        },
        m('span', child.label)
      );
    } else if (child.type === 1) {
      const category = m(navFragment, { children: child.children, level: node.attrs.level + 1, parent: child.link });

      if (node.attrs.level === 0) {
        return [
          m('h1', child.label),
          category
        ];
      }

      return [
        m(
          'a',
          {
            class: child.link === path ? 'current-link' : '',
            open: child.open,
            href: child.link,
            onclick: (e) => {
              e.preventDefault();
              if (e.currentTarget === e.target) {
                child.open = true;
                navigate(child.link);
              }
            }
          },
          [
            m('span', child.label),
            m(navigationArrow, {
              onclick: () => child.open = child.open ? false : true
            })
          ]
        ),
        category
      ];
    }
  }))
};

const notFound = {
  view: () => m('div', { class: 'notfound' }, 
    loading ? undefined : [
      m('h1', 'O.o'),
      m('span', 'Page not found')
    ]
  )
};

const redirect = {
  view: (node) => m('div', { class: 'redirect', onclick: () => navigate(node.attrs.child.link) }, [
    m('span', node.attrs.child.label),
    m(navigationArrow)
  ])
};

const bottomNavLink = {
  view(node) {
    const file = files.get(node.attrs.link);

    return m('div', { class: node.attrs.class, onclick: () => navigate(node.attrs.link) }, [
      m(navigationArrow),
      m('div', [
        m('span', node.attrs.label + (file.parent?.label && file.parent.label !== current.parent?.label ? ` - ${file.parent.label}` : '')),
        m('label', file.label)
      ])
    ])
  }
}

const nav = {
  oncreate: () => {
    Array.from(
      document.getElementsByClassName('category')
    )
      .forEach(
        (i) => i.style.setProperty(
          '--max-height',
          (i.offsetHeight + i.scrollHeight + 100) + 'px'
        )
      );
  },
  view: () => m('nav', {
    class: menuOpened ? 'open' : ''
  }, m(navFragment, { level: 0, children: sitemap, parent: '' }))
}

const links = {
  view: () => m('div', { class: 'links' }, config?.header?.links?.map((link) => m('a', { href: link.link, target: "_blank" }, link.label)) ?? [])
}

const header = () => ({
  view: () => m(
    'header',
    [
      m('div', { class: 'menu' }, [
        m('svg', {
          xmlns: "http://www.w3.org/2000/svg",
          fill: "none",
          viewBox: "0 0 24 24",
          'stroke-width': "1.5",
          stroke: "currentColor",
          id: 'menu-button',
          onclick: () => menuOpened = !menuOpened
        }, [
          m('path', {
            'stroke-linecap': "round",
            'stroke-linejoin': "round",
            d: "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12"
          })
        ]),
        m('img', { src: config?.header?.icon }),
        m('h1', config?.header?.title)
      ]),
      m(links)
    ]
  )
});

const content = {
  onupdate() {
    contentElement = document.getElementById('content');

    for (const link of contentElement.querySelectorAll('a[href]')) {
      if (new URL(document.baseURI).origin === new URL(link.href, document.baseURI).origin) {
        link.target = undefined;
        
        if (!link.href.startsWith('#')) {
          link.onclick = (e) => {
            e.preventDefault();
            navigate(link.href);
          }
        }
      }
    }

    if (isFirstPage) {
      observer = new IntersectionObserver(observerCallback, { ...observerOptions, root: document.querySelector('.body') });
      showCurrentHash();
    }
  },
  view: () => m('div', { class: 'content', id: 'content' }, [
    m('div', { class: 'article', id: 'article' }, (
      exists
        ? (
          current
            ? (
              current.type === 0 || current?.content
                ? [
                  m.trust(current?.content),
                  m('div', { class: 'bottom-nav' }, [
                    current.previous !== null ? m(bottomNavLink, { class: 'before', label: 'Previous', link: current.previous }) : undefined,
                    current.next !== null ? m(bottomNavLink, { class: 'after', label: 'Next', link: current.next }) : undefined,
                  ])
                ]
                : m(
                  'div',
                  { class: 'redirects-column' },
                  [
                    m('h1', current.label),
                    ...current.children.map((child) => m(redirect, { child }))
                  ]
                )
            )
            : m(notFound)
        )
        : m(notFound)
    )),
    m(links)
  ])
}

const summary = {
  onupdate(node) {
    const childrens = node.instance.children;

    for (let i = childrens.length - 1; i >= 0; i--) {
      if (childrens[i].attrs.className === 'active') {

        if (isOutViewport(node.dom, childrens[i].dom)) {
          node.dom.scrollTop = childrens[i].dom.offsetTop;
        }

        break;
      }
    }
  },
  view: () => m('aside', headings.map((heading) => m('a', { style: `--level:${heading.level};`, href: `#${heading.hash}`, class: heading.reading ? 'active' : '' }, heading.label)))
}

const app = {
  view: () => m(
    'main',
    [
      m(header),
      m('div', { class: 'body' }, [
        m(nav),
        m(content),
        m(summary)
      ])
    ])
};

generateMaps();
update();

const favicon = document.createElement('link');
favicon.rel = 'icon';
document.head.appendChild(favicon);
favicon.href = config.favicon;

m.mount(document.body, app);

window.onpopstate = () => {
  update();
}

window.onhashchange = () => {
  showCurrentHash();
}