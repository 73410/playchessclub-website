function toggleDescription(event) {
    const description = event.target.closest('.rss-item').querySelector('.description');
    if (description.classList.contains('expanded')) {
      description.classList.remove('expanded');
      event.target.textContent = '展开全文';
    } else {
      description.classList.add('expanded');
      event.target.textContent = '收起全文';
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
  
    items.forEach(item => {
      const title = item.querySelector("title").textContent;
      const link = item.querySelector("link").textContent;
      const description = item.querySelector("description").textContent;
      const descriptionHtml = marked.parse(description);
      const imageUrl = item.querySelector("enclosure") ? item.querySelector("enclosure").getAttribute('url') : '';
  
      html += `
        <div class="rss-item">
          <h3><a href="${link}" target="_blank">${title}(点击查看完整版)</a></h3>
          ${imageUrl ? `<img class="lazy" data-src="${imageUrl}" alt="${title}">` : ''}
          <div class="description">${descriptionHtml}</div>
          <div class="toggle-description"><a href="javascript:void(0)">展开全文</a></div>
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
  
  // 检查是否有缓存的RSS数据
  const cachedData = localStorage.getItem('rssData');
  if (cachedData) {
    renderRSSFeed(cachedData);
  } else {
    fetch('https://news.mcpcc.fun/rss.xml')
      .then(response => response.text())
      .then(str => {
        localStorage.setItem('rssData', str);
        renderRSSFeed(str);
      })
      .catch(err => console.error(err));
  }
  