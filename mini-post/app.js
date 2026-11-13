(function () {
  'use strict';

  var STORAGE_KEY = 'minipost.posts.v1';
  var MAX_LEN = 280;
  var AUTHOR = { name: '我', initial: '我' };

  var els = {
    card: document.getElementById('composer-card'),
    form: document.getElementById('composer'),
    input: document.getElementById('composer-input'),
    submit: document.getElementById('submit-btn'),
    counter: document.getElementById('char-counter'),
    timeline: document.getElementById('timeline'),
    count: document.getElementById('post-count'),
    empty: document.getElementById('empty-state'),
    emptyAction: document.getElementById('empty-action'),
    toast: document.getElementById('toast')
  };

  var posts = [];
  var justPublishedId = null;
  var toastTimer = 0;

  /* ---------------- 存储层 ---------------- */

  function loadPosts() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        window.localStorage.removeItem(STORAGE_KEY);
        return [];
      }
      return parsed.filter(function (item) {
        return item && typeof item.content === 'string' && typeof item.createdAt === 'number';
      });
    } catch (err) {
      return [];
    }
  }

  function savePosts(list) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return true;
    } catch (err) {
      return false;
    }
  }

  /* ---------------- 工具函数 ---------------- */

  function countChars(text) {
    return Array.from(text).length;
  }

  function pad(num) {
    return num < 10 ? '0' + num : String(num);
  }

  function createPost(content) {
    return {
      id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
      content: content,
      createdAt: Date.now()
    };
  }

  function formatRelativeTime(timestamp) {
    var diff = Date.now() - timestamp;
    if (diff < 60 * 1000) return '刚刚';

    var minutes = Math.floor(diff / (60 * 1000));
    if (minutes < 60) return minutes + ' 分钟前';

    var hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + ' 小时前';

    var days = Math.floor(hours / 24);
    if (days < 7) return days + ' 天前';

    var date = new Date(timestamp);
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function formatFullTime(timestamp) {
    var date = new Date(timestamp);
    return (
      date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
      ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes())
    );
  }

  /* ---------------- 渲染 ---------------- */

  function createPostNode(post) {
    var item = document.createElement('li');
    item.className = 'post';
    if (post.id === justPublishedId) item.classList.add('post--new');

    var avatar = document.createElement('span');
    avatar.className = 'post-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = AUTHOR.initial;

    var body = document.createElement('article');
    body.className = 'post-body';

    var meta = document.createElement('div');
    meta.className = 'post-meta';

    var author = document.createElement('span');
    author.className = 'post-author';
    author.textContent = AUTHOR.name;

    var time = document.createElement('time');
    time.className = 'post-time';
    time.dateTime = new Date(post.createdAt).toISOString();
    time.title = formatFullTime(post.createdAt);
    time.textContent = formatRelativeTime(post.createdAt);

    meta.appendChild(author);
    meta.appendChild(time);

    var content = document.createElement('p');
    content.className = 'post-content';
    content.textContent = post.content;

    body.appendChild(meta);
    body.appendChild(content);

    item.appendChild(avatar);
    item.appendChild(body);

    return item;
  }

  function render() {
    var hasPosts = posts.length > 0;

    els.empty.hidden = hasPosts;
    els.timeline.hidden = !hasPosts;
    els.count.textContent = posts.length + ' 条';

    while (els.timeline.firstChild) {
      els.timeline.removeChild(els.timeline.firstChild);
    }

    if (hasPosts) {
      var fragment = document.createDocumentFragment();
      posts.forEach(function (post) {
        fragment.appendChild(createPostNode(post));
      });
      els.timeline.appendChild(fragment);
    }

    justPublishedId = null;
  }

  function syncComposer() {
    var value = els.input.value;
    var total = countChars(value);
    var remaining = MAX_LEN - total;

    if (remaining < 0) {
      els.counter.textContent = '已超出 ' + Math.abs(remaining) + ' 字';
    } else {
      els.counter.textContent = '还可输入 ' + remaining + ' 字';
    }

    els.counter.classList.toggle('is-danger', remaining < 0);
    els.counter.classList.toggle('is-warning', remaining >= 0 && remaining <= 40);

    els.submit.disabled = value.trim().length === 0 || remaining < 0;

    autoGrow();
  }

  function autoGrow() {
    els.input.style.height = 'auto';
    els.input.style.height = Math.min(els.input.scrollHeight, 320) + 'px';
  }

  function showToast(message, type) {
    window.clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.toggle('is-error', type === 'error');
    els.toast.classList.add('is-visible');

    toastTimer = window.setTimeout(function () {
      els.toast.classList.remove('is-visible');
    }, 2200);
  }

  function shakeComposer() {
    els.card.classList.remove('is-shake');
    void els.card.offsetWidth;
    els.card.classList.add('is-shake');
    els.input.focus();
  }

  /* ---------------- 交互 ---------------- */

  function handleSubmit(event) {
    if (event) event.preventDefault();

    var content = els.input.value.trim();

    if (!content) {
      shakeComposer();
      return;
    }

    if (countChars(content) > MAX_LEN) {
      showToast('最多只能输入 ' + MAX_LEN + ' 字', 'error');
      return;
    }

    var post = createPost(content);
    var nextPosts = [post].concat(posts);

    if (!savePosts(nextPosts)) {
      showToast('本地存储不可用，内容尚未保存', 'error');
      return;
    }

    posts = nextPosts;
    justPublishedId = post.id;

    els.input.value = '';
    syncComposer();
    render();
    els.input.focus();
    showToast('已发布，仅保存在本机');
  }

  function init() {
    posts = loadPosts().sort(function (a, b) {
      return b.createdAt - a.createdAt;
    });

    els.form.addEventListener('submit', handleSubmit);
    els.input.addEventListener('input', syncComposer);
    els.input.addEventListener('keydown', function (event) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        handleSubmit();
      }
    });
    els.emptyAction.addEventListener('click', function () {
      els.input.focus();
    });
    els.card.addEventListener('animationend', function (event) {
      if (event.animationName === 'shake') els.card.classList.remove('is-shake');
    });

    syncComposer();
    render();

    window.setInterval(function () {
      render();
    }, 60 * 1000);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
