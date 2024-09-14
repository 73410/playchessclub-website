// 设定缓存过期时间为30分钟
const CACHE_EXPIRATION_MS = 30 * 60 * 1000; // 30分钟
const CACHE_KEY = 'rssData';
const CACHE_TIMESTAMP_KEY = 'rssDataTimestamp';

function toggleDescription(event) {
  const description = event.target.closest('.rss-item').querySelector('.description');
  if (description.classList.contains('expanded')) {
    description.classList.remove('expanded');
    event.target.textContent = '展开预览';
  } else {
    description.classList.add('expanded');
    event.target.textContent = '收起预览';
  }
}

// 懒加载图片
function lazyLoadImages() {
  const lazyImages = document.querySelectorAll('img.lazy');

  if ('IntersectionObserver' in window) {
    let lazyImageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          let lazyImage = entry.target;
          lazyImage.src = lazyImage.dataset.src;
          lazyImage.classList.remove('lazy');
          lazyImage.classList.add('loaded');
          lazyImageObserver.unobserve(lazyImage);
        }
      });
    });

    lazyImages.forEach(lazyImage => {
      lazyImageObserver.observe(lazyImage);
    });
  } else {
    // Fallback for browsers that do not支持 IntersectionObserver
    lazyImages.forEach(lazyImage => {
      lazyImage.src = lazyImage.dataset.src;
      lazyImage.classList.remove('lazy');
      lazyImage.classList.add('loaded');
    });
  }
}

// 渲染RSS Feed
function renderRSSFeed(rssData) {
  const data = new window.DOMParser().parseFromString(rssData, "text/xml");
  const items = data.querySelectorAll("item");
  let html = '';

  items.forEach((item, index) => {
    if (index >= 9) return; // 只显示最近的9条新闻

    const title = item.querySelector("title").textContent;
    const link = item.querySelector("link").textContent;
    const description = item.querySelector("description").textContent;
    const descriptionHtml = marked.parse(description);
    const imageUrl = item.querySelector("enclosure") ? item.querySelector("enclosure").getAttribute('url') : '';

    html += `
      <div class="rss-item">
        <h3><a href="${link}" target="_blank">${title}</a></h3>
        ${imageUrl ? `<img class="lazy" data-src="${imageUrl}" alt="${title}">` : ''}
        <div class="description">${descriptionHtml}</div>
        <div class="toggle-description"><a href="javascript:void(0)">展开预览</a></div>
      </div>
    `;
  });

  document.getElementById("rss-feed").innerHTML = html;

  // 添加事件监听器以处理展开/收起功能
  document.querySelectorAll('.toggle-description a').forEach(button => {
    button.addEventListener('click', toggleDescription);
  });

  // 启用图片懒加载
  lazyLoadImages();
}

// 加载RSS数据
function loadRSSFeed() {
  const cachedData = localStorage.getItem(CACHE_KEY);
  const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
  const now = Date.now();

  if (cachedData && cachedTimestamp && now - cachedTimestamp < CACHE_EXPIRATION_MS) {
    renderRSSFeed(cachedData);
  } else {
    fetch('https://news.mcpcc.fun/rss.xml')
      .then(response => response.text())
      .then(str => {
        localStorage.setItem(CACHE_KEY, str);
        localStorage.setItem(CACHE_TIMESTAMP_KEY, now);
        renderRSSFeed(str);
      })
      .catch(err => console.error(err));
  }
}

// 页面加载时调用
loadRSSFeed();
