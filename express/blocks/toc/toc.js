import {
  getLottie,
  toClassName,
  getIconElement as genericGetIconElement,
  getMobileOperatingSystem,
} from '../../scripts/utils.js';

export function getToggleButton() {
  const $toggle = document.querySelector('.default-content-wrapper .button.accent');
  $toggle.classList.add('toc-toggle');
  $toggle.href = '#toc';
  $toggle.target = '';
  return $toggle;
}

export function getCloseButton() {
  const $close = document.createElement('a');
  $close.classList.add('button');
  $close.classList.add('toc-close');
  $close.href = '#toc';
  $close.innerText = 'Close';
  return $close;
}

function getIcon(icons, alt) {
  // eslint-disable-next-line no-param-reassign
  icons = Array.isArray(icons) ? icons : [icons];
  const [defaultIcon, mobileIcon] = icons;
  const icon = (mobileIcon && window.innerWidth < 600) ? mobileIcon : defaultIcon;
  const iconName = icon;
  return `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-${icon}">
    ${alt ? `<title>${alt}</title>` : ''}
    <use href="/express/blocks/toc/toc-sprite.svg#${iconName}"></use>
  </svg>`;
}

export function getIconElement(icons, alt) {
  const $div = document.createElement('div');
  $div.innerHTML = getIcon(icons, alt);
  return ($div.firstChild);
}

export async function fixIcons($block = document) {
  $block.querySelectorAll('img').forEach(($img) => {
    const alt = $img.getAttribute('alt');
    if (!alt) {
      return;
    }

    const lowerAlt = alt.toLowerCase();
    if (!lowerAlt.includes('icon:')) {
      return;
    }

    const [icon, mobileIcon] = lowerAlt
      .split(';')
      .map((i) => (i ? toClassName(i.split(':')[1].trim()) : null));

    const $picture = $img.closest('picture');
    const $icon = getIconElement([icon, mobileIcon], alt);
    $picture.parentElement.replaceChild($icon, $picture);
  });
}

export function toggleToc($toggle, $block, status) {
  const s = status === undefined ? !$block.parentElement.parentElement.classList.contains('open') : status;
  $toggle.style.display = s ? 'none' : 'block';
  $block.parentElement.parentElement.classList.toggle('open', s);
}

export function attachEventListeners($block, $toggle, $close) {
  $block.parentElement.addEventListener('click', (ev) => {
    if (ev.target === $block.parentElement) {
      ev.stopPropagation();
      toggleToc($toggle, $block, false);
    }
  });
  $toggle.addEventListener('click', (ev) => {
    ev.stopPropagation();
    ev.preventDefault();
    toggleToc($toggle, $block);
  });
  $close.addEventListener('click', (ev) => {
    ev.stopPropagation();
    ev.preventDefault();
    toggleToc($toggle, $block, false);
  });
  const linksPopulated = new CustomEvent('linkspopulated', { detail: [$toggle, ...$block.querySelectorAll('a'), $block.parentElement] });
  document.dispatchEvent(linksPopulated);

  let lastPosition = 0;
  const threshold = document.querySelector('header').offsetHeight + 6;
  document.addEventListener('scroll', () => {
    if ($block.parentElement.parentElement.classList.add('feds')) {
      return;
    }
    if (document.documentElement.scrollTop > threshold && lastPosition <= threshold) {
      $block.parentElement.parentElement.classList.toggle('sticky', true);
    } else if (document.documentElement.scrollTop <= threshold && lastPosition > threshold) {
      $block.parentElement.parentElement.classList.toggle('sticky', false);
    }
    lastPosition = document.documentElement.scrollTop;
  });
}

export function addAppStoreButton($block) {
  const $icon = $block.querySelector('.icon-dl');
  if (!$icon) {
    return;
  }
  const os = getMobileOperatingSystem();
  const $button = document.createElement('a');
  const $container = $icon.parentElement.parentElement.children;
  $button.href = $container[1].children[0].href;
  $button.title = $container[1].children[0].title;
  $container[1].append($button);
  if (os === 'iOS') {
    $button.append(genericGetIconElement('apple-store'));
  } else {
    $button.append(genericGetIconElement('google-store'));
  }
}

export default async function decorate($block) {
  const iconHTML = getLottie('arrow-down', '/express/icons/arrow-down.json');
  const $toggle = getToggleButton();
  $toggle.innerHTML = iconHTML + $toggle.innerHTML;

  [...$block.children].forEach((div) => {
    const wrapper = div.children.item(1);
    const child = wrapper.children.length ? wrapper.children.item(0) : null;
    if (child.nodeName === 'A') {
      child.classList.remove('accent');
      child.removeAttribute('target');
      child.addEventListener('click', (ev) => {
        ev.stopPropagation();
        toggleToc($toggle, $block, false);
        const url = new URL(ev.target.href);
        if (url.pathname === window.location.pathname) {
          ev.preventDefault();
          window.location.hash = url.hash;
        }
      });
    } else if (child.nodeName === 'H2') {
      child.classList.add('toc-heading');
      child.innerHTML = iconHTML + child.innerHTML;
    }
  });

  const $closeIcon = getIconElement(['close'], 'Icon: Close');
  const $close = getCloseButton();
  $close.innerHTML = $closeIcon.outerHTML + $close.innerHTML;
  $block.append($close);

  const $handle = document.createElement('div');
  $handle.classList.add('toc-handle');
  $handle.addEventListener('click', (ev) => {
    ev.stopPropagation();
    toggleToc($toggle, $block, false);
  });
  $block.append($handle);
  const linksPopulated = new CustomEvent('linkspopulated', { detail: [$handle] });
  document.dispatchEvent(linksPopulated);

  await fixIcons($block);
  addAppStoreButton($block);
  attachEventListeners($block, $toggle, $close);
}
