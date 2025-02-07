import {
  fetchPlaceholders,
  createTag,
  getMetadata,
} from './utils.js';

function loadExpressProduct() {
  if (!window.hlx.preload_product) return;
  if (document.body.dataset.device === 'mobile') return;
  const path = ['www.adobe.com'].includes(window.location.hostname)
    ? 'https://new.express.adobe.com/static/preload.html' : 'https://stage.projectx.corp.adobe.com/static/preload.html';
  const iframe = createTag('iframe', { src: path, style: 'display:none' });
  document.body.append(iframe);
}

function getSegmentsFromAlloyResponse(response) {
  const ids = [];
  if (response?.destinations) {
    Object.values(response.destinations).forEach(({ segments }) => {
      if (segments) {
        Object.values(segments).forEach(({ id }) => {
          ids.push(id);
        });
      }
    });
  }
  return ids;
}

async function isSignedIn() {
  if (window.adobeProfile?.getUserProfile()) return true;
  if (window.feds.events?.profile_data) return false; // data ready -> not signed in
  let resolve;
  const resolved = new Promise((r) => {
    resolve = r;
  });
  window.addEventListener('feds.events.profile_data.loaded', () => {
    resolve();
  }, { once: true });
  // if not ready, abort
  await Promise.race([resolved, new Promise((r) => setTimeout(r, 5000))]);
  return window.adobeProfile?.getUserProfile();
}

// product entry prompt
async function canPEP() {
  if (document.body.dataset.device !== 'desktop') return false;
  const pepSegment = getMetadata('pep-segment');
  if (!pepSegment) return false;
  const placeholders = await fetchPlaceholders();
  if (!placeholders.cancel || !placeholders['pep-header'] || !placeholders['pep-cancel']) return false;
  const segments = getSegmentsFromAlloyResponse(await window.alloyLoader);
  if (!pepSegment.replace(/\s/g, '').split(',').some((pepSeg) => segments.includes(pepSeg))) return false;
  return !!(await isSignedIn());
}

const PEP_DELAY = 3000;

/**
 * Executes everything that happens a lot later, without impacting the user experience.
 */
export default async function loadDelayed(DELAY = 15000) {
  if (await canPEP()) {
    const { default: loadLoginUserAutoRedirect } = await import('../features/direct-path-to-product/direct-path-to-product.js');
    return new Promise((resolve) => {
      // TODO: not preloading product this early to protect desktop CWV
      // until we see significant proof of preloading improving product load time
      // loadExpressProduct();
      setTimeout(() => {
        loadLoginUserAutoRedirect();
        resolve();
      }, PEP_DELAY);
    });
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      loadExpressProduct();
      resolve();
    }, window.delay_preload_product ? DELAY * 2 : DELAY);
  });
}
