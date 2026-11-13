(function () {
  'use strict';

  var ENTRIES_KEY = 'mooddiary.entries.v1';
  var SETTINGS_KEY = 'mooddiary.settings.v1';
  var WEATHER_KEY = 'mooddiary.weather.v1';
  var LEGACY_KEY = 'minipost.posts.v1';

  var MAX_LEN = 280;
  var MAX_TAGS = 3;
  var WEATHER_TTL = 30 * 60 * 1000;
  var SVG_NS = 'http://www.w3.org/2000/svg';

  var WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

  var DEFAULT_LOCATION = {
    name: '北京',
    latitude: 39.9042,
    longitude: 116.4074,
    timezone: 'Asia/Shanghai'
  };

  var MOODS = [
    {
      id: 'happy',
      label: '开心',
      color: '#F59E0B',
      path:
        'M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6zM9.2 9.8h.01M14.8 9.8h.01M8.6 14.2c.9 1.3 2.1 2 3.4 2s2.5-.7 3.4-2'
    },
    {
      id: 'calm',
      label: '平静',
      color: '#5B5BF6',
      path:
        'M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6zM8.5 10.4c.5-.5 1.2-.5 1.7 0M13.8 10.4c.5-.5 1.2-.5 1.7 0M9.4 14.8c.7.6 1.6.9 2.6.9s1.9-.3 2.6-.9'
    },
    {
      id: 'excited',
      label: '兴奋',
      color: '#EC4899',
      path:
        'M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6zM8.4 9.4l1.5 1-1.5 1M15.6 9.4l-1.5 1 1.5 1M8.4 14.2c1 1.6 2.3 2.4 3.6 2.4s2.6-.8 3.6-2.4'
    },
    {
      id: 'tired',
      label: '疲惫',
      color: '#8B90A6',
      path:
        'M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6zM8.4 9.6h2.3M13.3 9.6h2.3M9.4 15h5.2'
    },
    {
      id: 'sad',
      label: '低落',
      color: '#3B82F6',
      path:
        'M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6zM9.2 9.8h.01M14.8 9.8h.01M8.6 16.6c.9-1.3 2.1-2 3.4-2s2.5.7 3.4 2'
    },
    {
      id: 'anxious',
      label: '焦虑',
      color: '#8B5CF6',
      path:
        'M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6zM9.2 9.6h.01M14.8 9.6h.01M8.8 15.6c.7-.9 1.4.9 2.1 0s1.4.9 2.1 0 1.4.9 2.1 0'
    }
  ];

  var PRESET_TAGS = ['工作', '学习', '生活', '运动', '美食', '旅行', '音乐', '心情'];

  var WEATHER_TONES = {
    sun: '#F59E0B',
    partly: '#F59E0B',
    cloud: '#8B90A6',
    fog: '#7F8799',
    drizzle: '#3B82F6',
    rain: '#3B82F6',
    snow: '#60A5FA',
    thunder: '#8B5CF6'
  };

  var WEATHER_PATHS = {
    sun:
      'M12 4.4a7.6 7.6 0 1 0 0 15.2 7.6 7.6 0 0 0 0-15.2zM12 1.6v1.4M12 21v1.4M4.2 4.2l1 1M18.8 18.8l1 1M1.6 12H3M21 12h1.4M4.2 19.8l1-1M18.8 5.2l1-1',
    partly:
      'M8.2 8.6a3.9 3.9 0 1 1 4.4 4.2M6.8 18.4h9.6a3.1 3.1 0 0 0 .2-6.2 4.8 4.8 0 0 0-9.2-1.1 3.7 3.7 0 0 0-.6 7.3z',
    cloud:
      'M6.8 18.4h9.6a3.1 3.1 0 0 0 .2-6.2 4.8 4.8 0 0 0-9.2-1.1 3.7 3.7 0 0 0-.6 7.3z',
    fog: 'M5.5 9h10M8 13h10.5M4 17h12.5',
    drizzle:
      'M6.8 16.4h9.6a3.1 3.1 0 0 0 .2-6.2 4.8 4.8 0 0 0-9.2-1.1 3.7 3.7 0 0 0-.6 7.3M9 19.2l-.6 1.8M12.6 19.2l-.6 1.8M16.2 19.2l-.6 1.8',
    rain:
      'M6.8 16.4h9.6a3.1 3.1 0 0 0 .2-6.2 4.8 4.8 0 0 0-9.2-1.1 3.7 3.7 0 0 0-.6 7.3M8.6 19.2l-.8 2.4M12 19.2l-.8 2.4M15.4 19.2l-.8 2.4',
    snow:
      'M6.8 16.4h9.6a3.1 3.1 0 0 0 .2-6.2 4.8 4.8 0 0 0-9.2-1.1 3.7 3.7 0 0 0-.6 7.3M8.8 19.8h.01M12 21h.01M15.2 19.8h.01',
    thunder:
      'M6.8 16.4h9.6a3.1 3.1 0 0 0 .2-6.2 4.8 4.8 0 0 0-9.2-1.1 3.7 3.7 0 0 0-.6 7.3M12.6 18.8l-2 2.8h2.4l-1 2.2'
  };

  var HEART_PATH =
    'M12 20.2s-7.2-4.4-7.2-9.4a4.2 4.2 0 0 1 7.2-2.9 4.2 4.2 0 0 1 7.2 2.9c0 5-7.2 9.4-7.2 9.4z';

  var els = {
    themeToggle: document.getElementById('theme-toggle'),

    greeting: document.getElementById('greeting'),
    day: document.getElementById('hero-day'),
    month: document.getElementById('hero-month'),
    weekday: document.getElementById('hero-weekday'),
    clock: document.getElementById('clock'),

    weatherCard: document.getElementById('weather-card'),
    weatherIcon: document.getElementById('weather-icon'),
    weatherTemp: document.getElementById('weather-temp'),
    weatherDesc: document.getElementById('weather-desc'),
    weatherExtra: document.getElementById('weather-extra'),
    weatherCity: document.getElementById('weather-city-name'),
    weatherHint: document.getElementById('weather-hint'),
    weatherHintText: document.getElementById('weather-hint-text'),
    weatherRetry: document.getElementById('weather-retry'),

    statMonth: document.getElementById('stat-month'),
    statStreak: document.getElementById('stat-streak'),
    statTotal: document.getElementById('stat-total'),
    moodDist: document.getElementById('mood-dist'),

    card: document.getElementById('composer-card'),
    form: document.getElementById('composer'),
    moodPicker: document.getElementById('mood-picker'),
    moodCurrent: document.getElementById('mood-current'),
    tagPicker: document.getElementById('tag-picker'),
    tagInput: document.getElementById('tag-input'),
    tagAdd: document.getElementById('tag-add'),
    input: document.getElementById('composer-input'),
    counter: document.getElementById('char-counter'),
    submit: document.getElementById('submit-btn'),

    timeline: document.getElementById('timeline'),
    count: document.getElementById('post-count'),
    empty: document.getElementById('empty-state'),
    emptyAction: document.getElementById('empty-action'),

    dialog: document.getElementById('city-dialog'),
    cityInput: document.getElementById('city-input'),
    citySearch: document.getElementById('city-search-btn'),
    cityStatus: document.getElementById('city-status'),
    cityResults: document.getElementById('city-results'),
    cityLocate: document.getElementById('city-locate'),
    cityClose: document.getElementById('city-close'),

    toast: document.getElementById('toast')
  };

  var state = {
    entries: [],
    settings: { theme: 'system', location: null },
    selectedMood: 'calm',
    selectedTags: [],
    customTags: [],
    newEntryId: null,
    weather: { loading: false, hasData: false, lastLocation: null, pendingLocation: null },
    clockTimer: 0,
    currentDayKey: '',
    toastTimer: 0,
    searchController: null
  };

  /* ---------------- 基础工具 ---------------- */

  function pad(num) {
    return num < 10 ? '0' + num : String(num);
  }

  function countChars(text) {
    return Array.from(text).length;
  }

  function hexToRgba(hex, alpha) {
    var value = parseInt(hex.slice(1), 16);
    return (
      'rgba(' + ((value >> 16) & 255) + ', ' + ((value >> 8) & 255) + ', ' + (value & 255) + ', ' + alpha + ')'
    );
  }

  function getMood(id) {
    for (var i = 0; i < MOODS.length; i++) {
      if (MOODS[i].id === id) return MOODS[i];
    }
    return MOODS[1];
  }

  function genId() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function dateKey(timestamp) {
    var date = new Date(timestamp);
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function shiftDay(date, delta) {
    var copy = new Date(date);
    copy.setHours(12, 0, 0, 0);
    copy.setDate(copy.getDate() + delta);
    return copy;
  }

  function makeIcon(path, viewBox) {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', viewBox || '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.7');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    var node = document.createElementNS(SVG_NS, 'path');
    node.setAttribute('d', path);
    svg.appendChild(node);
    return svg;
  }

  /* ---------------- 存储层 ---------------- */

  function safeGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (err) {
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (err) {
      return false;
    }
  }

  function loadEntries() {
    var raw = safeGet(ENTRIES_KEY);
    if (!raw) return [];

    try {
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter(function (item) {
          return item && typeof item.content === 'string' && typeof item.createdAt === 'number';
        })
        .map(function (item) {
          var mood = getMood(item.mood);
          var tags = Array.isArray(item.tags)
            ? item.tags.filter(function (tag) {
                return typeof tag === 'string' && tag.trim();
              }).slice(0, MAX_TAGS)
            : [];
          return {
            id: typeof item.id === 'string' && item.id ? item.id : genId(),
            content: item.content,
            mood: mood.id,
            tags: tags,
            likes: typeof item.likes === 'number' && item.likes >= 0 ? Math.floor(item.likes) : 0,
            liked: item.liked === true,
            createdAt: item.createdAt
          };
        });
    } catch (err) {
      return [];
    }
  }

  function saveEntries(list) {
    return safeSet(ENTRIES_KEY, JSON.stringify(list));
  }

  function loadSettings() {
    var base = { theme: 'system', location: null };
    var raw = safeGet(SETTINGS_KEY);
    if (!raw) return base;

    try {
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return base;

      var theme = parsed.theme;
      if (theme !== 'light' && theme !== 'dark') theme = 'system';

      var location = parsed.location;
      if (
        !location ||
        typeof location !== 'object' ||
        typeof location.latitude !== 'number' ||
        typeof location.longitude !== 'number'
      ) {
        location = null;
      } else {
        location = {
          name: typeof location.name === 'string' && location.name ? location.name : '当前位置',
          latitude: location.latitude,
          longitude: location.longitude,
          timezone: typeof location.timezone === 'string' && location.timezone ? location.timezone : 'Asia/Shanghai'
        };
      }

      return { theme: theme, location: location };
    } catch (err) {
      return base;
    }
  }

  function saveSettings() {
    return safeSet(SETTINGS_KEY, JSON.stringify(state.settings));
  }

  function migrateLegacy() {
    var raw = safeGet(LEGACY_KEY);
    if (!raw) return;
    if (safeGet(ENTRIES_KEY)) return;

    try {
      var legacy = JSON.parse(raw);
      if (!Array.isArray(legacy) || !legacy.length) {
        window.localStorage.removeItem(LEGACY_KEY);
        return;
      }

      var migrated = legacy
        .filter(function (item) {
          return item && typeof item.content === 'string' && typeof item.createdAt === 'number';
        })
        .map(function (item) {
          return {
            id: genId(),
            content: item.content,
            mood: 'calm',
            tags: [],
            likes: 0,
            liked: false,
            createdAt: item.createdAt
          };
        });

      if (migrated.length && saveEntries(migrated)) {
        window.localStorage.removeItem(LEGACY_KEY);
      }
    } catch (err) {
      /* 迁移失败时保留旧数据，不影响新版本使用 */
    }
  }

  function loadWeatherCache(location) {
    var raw = safeGet(WEATHER_KEY);
    if (!raw) return null;

    try {
      var cached = JSON.parse(raw);
      if (!cached || !cached.data || typeof cached.fetchedAt !== 'number') return null;
      if (Date.now() - cached.fetchedAt > WEATHER_TTL) return null;
      if (location && cached.locationKey !== locationKey(location)) return null;
      return cached;
    } catch (err) {
      return null;
    }
  }

  function saveWeatherCache(location, data) {
    safeSet(
      WEATHER_KEY,
      JSON.stringify({
        locationKey: locationKey(location),
        location: { name: location.name, latitude: location.latitude, longitude: location.longitude },
        fetchedAt: Date.now(),
        data: data
      })
    );
  }

  function locationKey(location) {
    return Number(location.latitude).toFixed(2) + ',' + Number(location.longitude).toFixed(2);
  }

  /* ---------------- 主题 ---------------- */

  function prefersDark() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function applyTheme() {
    var theme = state.settings.theme;
    var effective = theme === 'dark' || theme === 'light' ? theme : prefersDark() ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', effective);

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', effective === 'dark' ? '#0F1117' : '#F5F6FB');

    if (els.themeToggle) {
      els.themeToggle.setAttribute('aria-pressed', effective === 'dark' ? 'true' : 'false');
      els.themeToggle.setAttribute('aria-label', effective === 'dark' ? '切换到浅色主题' : '切换到深色主题');
    }
  }

  function toggleTheme() {
    var effective = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    state.settings.theme = effective;
    saveSettings();
    applyTheme();
  }

  /* ---------------- 今日概览 ---------------- */

  function greetingFor(hour) {
    if (hour < 5) return '夜深了，早点休息';
    if (hour < 9) return '早上好';
    if (hour < 12) return '上午好';
    if (hour < 14) return '中午好';
    if (hour < 18) return '下午好';
    if (hour < 23) return '晚上好';
    return '夜深了，早点休息';
  }

  function renderToday() {
    var now = new Date();
    state.currentDayKey = dateKey(now.getTime());

    els.greeting.textContent = greetingFor(now.getHours());
    els.day.textContent = String(now.getDate());
    els.month.textContent = now.getFullYear() + ' 年 ' + (now.getMonth() + 1) + ' 月';
    els.weekday.textContent = WEEKDAYS[now.getDay()];
    els.clock.textContent = pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
  }

  function startClock() {
    window.clearInterval(state.clockTimer);
    state.clockTimer = window.setInterval(function () {
      var now = new Date();
      var key = dateKey(now.getTime());

      if (key !== state.currentDayKey) {
        renderToday();
        renderStats();
        renderTimeline();
        return;
      }

      els.clock.textContent = pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
    }, 1000);
  }

  /* ---------------- 打卡统计 ---------------- */

  function computeStats() {
    var now = new Date();
    var monthPrefix = now.getFullYear() + '-' + pad(now.getMonth() + 1);

    var allDays = Object.create(null);
    var monthDays = Object.create(null);
    var moodCounts = {};
    var monthEntries = 0;

    MOODS.forEach(function (mood) {
      moodCounts[mood.id] = 0;
    });

    state.entries.forEach(function (entry) {
      var key = dateKey(entry.createdAt);
      allDays[key] = true;

      if (key.indexOf(monthPrefix) === 0) {
        monthDays[key] = true;
        monthEntries += 1;
        moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
      }
    });

    var cursor = new Date();
    cursor.setHours(12, 0, 0, 0);
    if (!allDays[dateKey(cursor.getTime())]) {
      cursor = shiftDay(cursor, -1);
    }

    var streak = 0;
    while (allDays[dateKey(cursor.getTime())]) {
      streak += 1;
      cursor = shiftDay(cursor, -1);
    }

    return {
      monthDays: Object.keys(monthDays).length,
      streak: streak,
      total: state.entries.length,
      monthEntries: monthEntries,
      moodCounts: moodCounts
    };
  }

  function renderStats() {
    var stats = computeStats();

    els.statMonth.textContent = String(stats.monthDays);
    els.statStreak.textContent = String(stats.streak);
    els.statTotal.textContent = String(stats.total);

    els.moodDist.replaceChildren();

    if (!stats.monthEntries) {
      els.moodDist.classList.add('is-empty');
      els.moodDist.textContent = '还没有记录';
      return;
    }

    els.moodDist.classList.remove('is-empty');

    MOODS.forEach(function (mood) {
      var count = stats.moodCounts[mood.id] || 0;
      if (!count) return;

      var seg = document.createElement('span');
      seg.className = 'mood-seg';
      seg.style.setProperty('--mood-color', mood.color);
      seg.style.flexGrow = String(count);
      seg.title = mood.label + ' · ' + count + ' 条';
      els.moodDist.appendChild(seg);
    });
  }

  /* ---------------- 天气 ---------------- */

  function weatherInfo(code) {
    if (code === 0) return { key: 'sun', text: '晴' };
    if (code === 1) return { key: 'partly', text: '晴间多云' };
    if (code === 2) return { key: 'partly', text: '多云' };
    if (code === 3) return { key: 'cloud', text: '阴' };
    if (code === 45 || code === 48) return { key: 'fog', text: '有雾' };
    if (code >= 51 && code <= 57) return { key: 'drizzle', text: '毛毛雨' };
    if (code >= 61 && code <= 67) return { key: 'rain', text: '下雨' };
    if (code >= 71 && code <= 77) return { key: 'snow', text: '下雪' };
    if (code >= 80 && code <= 82) return { key: 'rain', text: '阵雨' };
    if (code >= 85 && code <= 86) return { key: 'snow', text: '阵雪' };
    if (code >= 95) return { key: 'thunder', text: '雷雨' };
    return { key: 'cloud', text: '多云' };
  }

  function renderWeather(data, location) {
    var info = weatherInfo(data.code);
    var tone = WEATHER_TONES[info.key] || '#5B5BF6';

    els.weatherIcon.replaceChildren(makeIcon(WEATHER_PATHS[info.key]));
    els.weatherCard.style.setProperty('--weather-tone', tone);
    els.weatherCard.classList.remove('is-loading');

    els.weatherTemp.textContent = Math.round(data.temperature) + '°';
    els.weatherDesc.textContent = info.text;
    els.weatherExtra.textContent =
      '体感 ' + Math.round(data.apparent) + '° · 湿度 ' + Math.round(data.humidity) + '%';
    els.weatherCity.textContent = location.name || '当前位置';

    els.weatherHint.hidden = true;
    state.weather.hasData = true;
  }

  function showWeatherHint(message) {
    els.weatherCard.classList.remove('is-loading');
    els.weatherHint.hidden = false;
    els.weatherHintText.textContent = message || '天气暂不可用';

    if (!els.weatherTemp.textContent || els.weatherTemp.textContent === '--°') {
      els.weatherDesc.textContent = '暂时无法获取';
      els.weatherCity.textContent = '点击可更换城市';
    }
  }

  function setWeatherPending(location) {
    els.weatherCard.classList.add('is-loading');
    els.weatherCard.style.setProperty('--weather-tone', WEATHER_TONES.cloud);
    els.weatherIcon.replaceChildren(makeIcon(WEATHER_PATHS.cloud));
    els.weatherTemp.textContent = '--°';
    els.weatherDesc.textContent = '正在获取天气';
    els.weatherExtra.textContent = '体感 --° · 湿度 --%';
    els.weatherCity.textContent = location && location.name ? location.name : '定位中…';
    els.weatherHint.hidden = true;
  }

  function fetchWeather(location) {
    if (!location) return;

    if (state.weather.loading) {
      state.weather.pendingLocation = location;
      if (!state.weather.hasData) setWeatherPending(location);
      return;
    }

    state.weather.loading = true;
    state.weather.lastLocation = location;
    els.weatherCard.classList.add('is-loading');

    if (!state.weather.hasData) setWeatherPending(location);

    var controller = new AbortController();
    var timer = window.setTimeout(function () {
      controller.abort();
    }, 7000);

    var url =
      'https://api.open-meteo.com/v1/forecast?latitude=' +
      Number(location.latitude).toFixed(4) +
      '&longitude=' +
      Number(location.longitude).toFixed(4) +
      '&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code' +
      '&timezone=' +
      encodeURIComponent(location.timezone || 'Asia/Shanghai');

    fetch(url, { signal: controller.signal })
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(function (json) {
        var current = json && json.current;
        if (!current || typeof current.temperature_2m !== 'number') {
          throw new Error('bad payload');
        }

        var data = {
          temperature: current.temperature_2m,
          apparent: typeof current.apparent_temperature === 'number' ? current.apparent_temperature : current.temperature_2m,
          humidity: typeof current.relative_humidity_2m === 'number' ? current.relative_humidity_2m : 0,
          code: typeof current.weather_code === 'number' ? current.weather_code : 3
        };

        saveWeatherCache(location, data);
        renderWeather(data, location);
      })
      .catch(function () {
        if (state.weather.hasData) {
          els.weatherCard.classList.remove('is-loading');
        } else {
          showWeatherHint('天气暂不可用');
        }
      })
      .then(function () {
        window.clearTimeout(timer);
        state.weather.loading = false;
        els.weatherCard.classList.remove('is-loading');

        var pending = state.weather.pendingLocation;
        state.weather.pendingLocation = null;
        if (pending) fetchWeather(pending);
      });
  }

  function useDefaultLocation() {
    fetchWeather(DEFAULT_LOCATION);
  }

  function initWeather() {
    if (state.settings.location) {
      var cached = loadWeatherCache(state.settings.location);
      if (cached) {
        renderWeather(cached.data, state.settings.location);
      }
      fetchWeather(state.settings.location);
      return;
    }

    setWeatherPending();

    if (!navigator.geolocation) {
      useDefaultLocation();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      function (position) {
        fetchWeather({
          name: '当前位置',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timezone: 'Asia/Shanghai'
        });
      },
      function () {
        useDefaultLocation();
      },
      { timeout: 8000, maximumAge: 10 * 60 * 1000 }
    );
  }

  /* ---------------- 城市搜索 ---------------- */

  function openCityDialog() {
    setCityStatus('输入城市名搜索，或使用当前位置。', false);
    els.cityResults.replaceChildren();

    if (typeof els.dialog.showModal === 'function') {
      if (!els.dialog.open) els.dialog.showModal();
    } else {
      els.dialog.setAttribute('open', 'open');
    }

    window.setTimeout(function () {
      els.cityInput.focus();
    }, 60);
  }

  function closeCityDialog() {
    if (typeof els.dialog.close === 'function' && els.dialog.open) {
      els.dialog.close();
    } else {
      els.dialog.removeAttribute('open');
    }
  }

  function setCityStatus(message, isError) {
    els.cityStatus.textContent = message;
    els.cityStatus.classList.toggle('is-error', Boolean(isError));
  }

  function searchCity() {
    var keyword = els.cityInput.value.trim();
    if (!keyword) {
      setCityStatus('请先输入城市名称。', true);
      return;
    }

    if (state.searchController) state.searchController.abort();
    state.searchController = new AbortController();

    setCityStatus('正在搜索…', false);
    els.cityResults.replaceChildren();

    var url =
      'https://geocoding-api.open-meteo.com/v1/search?name=' +
      encodeURIComponent(keyword) +
      '&count=5&language=zh&format=json';

    fetch(url, { signal: state.searchController.signal })
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(function (json) {
        var results = (json && json.results) || [];
        if (!results.length) {
          setCityStatus('没有找到这个城市，换个名称试试。', true);
          return;
        }

        setCityStatus('选择要显示天气的城市：', false);
        renderCityResults(results);
      })
      .catch(function (err) {
        if (err && err.name === 'AbortError') return;
        setCityStatus('搜索失败，请检查网络后重试。', true);
      });
  }

  function renderCityResults(results) {
    var fragment = document.createDocumentFragment();

    results.forEach(function (item) {
      var li = document.createElement('li');
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'city-result';

      var name = document.createElement('strong');
      name.textContent = item.name;

      var meta = document.createElement('span');
      var region = [item.admin1, item.country].filter(Boolean).join(' · ');
      meta.textContent = region || '';

      button.appendChild(name);
      button.appendChild(meta);

      button.addEventListener('click', function () {
        var location = {
          name: item.name,
          latitude: item.latitude,
          longitude: item.longitude,
          timezone: item.timezone || 'Asia/Shanghai'
        };

        state.settings.location = location;
        saveSettings();
        closeCityDialog();
        fetchWeather(location);
      });

      li.appendChild(button);
      fragment.appendChild(li);
    });

    els.cityResults.replaceChildren(fragment);
  }

  function locateFromDialog() {
    if (!navigator.geolocation) {
      setCityStatus('当前浏览器不支持定位，请直接搜索城市。', true);
      return;
    }

    setCityStatus('正在定位…', false);

    navigator.geolocation.getCurrentPosition(
      function (position) {
        var location = {
          name: '当前位置',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timezone: 'Asia/Shanghai'
        };

        state.settings.location = location;
        saveSettings();
        closeCityDialog();
        fetchWeather(location);
      },
      function () {
        setCityStatus('定位失败或已拒绝授权，请手动搜索城市。', true);
      },
      { timeout: 8000, maximumAge: 10 * 60 * 1000 }
    );
  }

  /* ---------------- 发布区 ---------------- */

  function renderMoodPicker() {
    var fragment = document.createDocumentFragment();

    MOODS.forEach(function (mood) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'mood-chip';
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-checked', mood.id === state.selectedMood ? 'true' : 'false');
      button.setAttribute('aria-label', '心情：' + mood.label);
      button.dataset.mood = mood.id;
      button.style.setProperty('--mood-color', mood.color);
      button.style.setProperty('--mood-tint', hexToRgba(mood.color, 0.14));
      button.style.setProperty('--mood-ring', hexToRgba(mood.color, 0.3));

      button.appendChild(makeIcon(mood.path));

      var label = document.createElement('span');
      label.textContent = mood.label;
      button.appendChild(label);

      button.addEventListener('click', function () {
        setMood(mood.id);
      });

      fragment.appendChild(button);
    });

    els.moodPicker.replaceChildren(fragment);
  }

  function setMood(id) {
    state.selectedMood = getMood(id).id;

    var chips = els.moodPicker.querySelectorAll('.mood-chip');
    for (var i = 0; i < chips.length; i++) {
      chips[i].setAttribute('aria-checked', chips[i].dataset.mood === state.selectedMood ? 'true' : 'false');
    }

    els.moodCurrent.textContent = getMood(state.selectedMood).label;
  }

  function buildTagChip(tag) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'tag-chip';
    button.textContent = '#' + tag;
    var active = state.selectedTags.indexOf(tag) !== -1;
    button.setAttribute('aria-pressed', active ? 'true' : 'false');

    button.addEventListener('click', function () {
      toggleTag(tag, button);
    });

    return button;
  }

  function renderTagPicker() {
    var fragment = document.createDocumentFragment();
    var all = PRESET_TAGS.concat(state.customTags);

    all.forEach(function (tag) {
      fragment.appendChild(buildTagChip(tag));
    });

    els.tagPicker.replaceChildren(fragment);
  }

  function toggleTag(tag, button) {
    var index = state.selectedTags.indexOf(tag);

    if (index !== -1) {
      state.selectedTags.splice(index, 1);
      button.setAttribute('aria-pressed', 'false');
      return;
    }

    if (state.selectedTags.length >= MAX_TAGS) {
      showToast('最多选择 ' + MAX_TAGS + ' 个主题', 'error');
      return;
    }

    state.selectedTags.push(tag);
    button.setAttribute('aria-pressed', 'true');
  }

  function addCustomTag() {
    var value = els.tagInput.value.trim();

    if (!value) {
      els.tagInput.focus();
      return;
    }

    if (countChars(value) > 8) {
      showToast('自定义主题最多 8 个字', 'error');
      return;
    }

    var exists = PRESET_TAGS.indexOf(value) !== -1 || state.customTags.indexOf(value) !== -1;

    if (exists) {
      showToast('这个主题已经存在了');
      els.tagInput.value = '';
      return;
    }

    if (state.selectedTags.length >= MAX_TAGS) {
      showToast('最多选择 ' + MAX_TAGS + ' 个主题', 'error');
      return;
    }

    state.customTags.push(value);
    state.selectedTags.push(value);
    els.tagInput.value = '';
    renderTagPicker();
    els.tagInput.focus();
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
    window.clearTimeout(state.toastTimer);
    els.toast.textContent = message;
    els.toast.classList.toggle('is-error', type === 'error');
    els.toast.classList.add('is-visible');

    state.toastTimer = window.setTimeout(function () {
      els.toast.classList.remove('is-visible');
    }, 2200);
  }

  function shakeComposer() {
    els.card.classList.remove('is-shake');
    void els.card.offsetWidth;
    els.card.classList.add('is-shake');
    els.input.focus();
  }

  /* ---------------- 时间线 ---------------- */

  function dayLabel(key) {
    var todayKey = dateKey(Date.now());
    if (key === todayKey) return '今天';
    if (key === dateKey(shiftDay(new Date(), -1).getTime())) return '昨天';

    var parts = key.split('-');
    return Number(parts[1]) + ' 月 ' + Number(parts[2]) + ' 日';
  }

  function createEntryNode(entry) {
    var mood = getMood(entry.mood);

    var article = document.createElement('article');
    article.className = 'entry';
    article.dataset.id = entry.id;
    article.style.setProperty('--mood-color', mood.color);
    article.style.setProperty('--mood-tint', hexToRgba(mood.color, 0.14));
    article.style.setProperty('--mood-ring', hexToRgba(mood.color, 0.28));

    if (entry.id === state.newEntryId) {
      article.classList.add('entry--new');
    }

    var moodBadge = document.createElement('span');
    moodBadge.className = 'entry-mood';
    moodBadge.setAttribute('aria-hidden', 'true');
    moodBadge.appendChild(makeIcon(mood.path));

    var body = document.createElement('div');
    body.className = 'entry-body';

    var meta = document.createElement('div');
    meta.className = 'entry-meta';

    var moodName = document.createElement('span');
    moodName.className = 'entry-mood-name';
    moodName.textContent = mood.label;

    var time = document.createElement('time');
    time.className = 'entry-time';
    var created = new Date(entry.createdAt);
    time.dateTime = created.toISOString();
    time.textContent = pad(created.getHours()) + ':' + pad(created.getMinutes());
    time.title =
      created.getFullYear() + '-' + pad(created.getMonth() + 1) + '-' + pad(created.getDate()) +
      ' ' + pad(created.getHours()) + ':' + pad(created.getMinutes());

    meta.appendChild(moodName);
    meta.appendChild(time);

    var content = document.createElement('p');
    content.className = 'entry-content';
    content.textContent = entry.content;

    var foot = document.createElement('div');
    foot.className = 'entry-foot';

    var tags = document.createElement('div');
    tags.className = 'entry-tags';

    entry.tags.forEach(function (tag) {
      var chip = document.createElement('span');
      chip.className = 'entry-tag';
      chip.textContent = '#' + tag;
      tags.appendChild(chip);
    });

    var likeBtn = document.createElement('button');
    likeBtn.type = 'button';
    likeBtn.className = 'like-btn';
    likeBtn.dataset.action = 'like';
    likeBtn.setAttribute('aria-pressed', entry.liked ? 'true' : 'false');
    likeBtn.setAttribute('aria-label', (entry.liked ? '取消点赞' : '点赞') + '，当前 ' + entry.likes + ' 个赞');
    likeBtn.appendChild(makeIcon(HEART_PATH));

    var likeCount = document.createElement('span');
    likeCount.textContent = String(entry.likes);
    likeBtn.appendChild(likeCount);

    foot.appendChild(tags);
    foot.appendChild(likeBtn);

    body.appendChild(meta);
    body.appendChild(content);
    body.appendChild(foot);

    article.appendChild(moodBadge);
    article.appendChild(body);

    return article;
  }

  function renderTimeline() {
    var hasEntries = state.entries.length > 0;

    els.empty.hidden = hasEntries;
    els.timeline.hidden = !hasEntries;
    els.count.textContent = '共 ' + state.entries.length + ' 条';
    els.timeline.replaceChildren();

    if (!hasEntries) {
      state.newEntryId = null;
      return;
    }

    var groups = [];
    state.entries.forEach(function (entry) {
      var key = dateKey(entry.createdAt);
      var last = groups[groups.length - 1];
      if (!last || last.key !== key) {
        last = { key: key, items: [] };
        groups.push(last);
      }
      last.items.push(entry);
    });

    var fragment = document.createDocumentFragment();

    groups.forEach(function (group) {
      var section = document.createElement('section');
      section.className = 'day-group';

      var head = document.createElement('div');
      head.className = 'day-head';

      var label = document.createElement('span');
      label.className = 'day-label';
      label.textContent = dayLabel(group.key);

      var date = document.createElement('span');
      date.className = 'day-date';
      var weekday = WEEKDAYS[new Date(group.items[0].createdAt).getDay()];
      date.textContent = weekday + ' · ' + group.items.length + ' 条';

      head.appendChild(label);
      head.appendChild(date);

      var list = document.createElement('div');
      list.className = 'day-entries';

      group.items.forEach(function (entry) {
        list.appendChild(createEntryNode(entry));
      });

      section.appendChild(head);
      section.appendChild(list);
      fragment.appendChild(section);
    });

    els.timeline.appendChild(fragment);
    state.newEntryId = null;
  }

  function toggleLike(entryId, button) {
    var entry = null;
    state.entries.forEach(function (item) {
      if (item.id === entryId) entry = item;
    });
    if (!entry) return;

    var previousLiked = entry.liked;
    var previousLikes = entry.likes;

    entry.liked = !entry.liked;
    entry.likes = Math.max(0, entry.likes + (entry.liked ? 1 : -1));

    if (!saveEntries(state.entries)) {
      entry.liked = previousLiked;
      entry.likes = previousLikes;
      showToast('本地存储不可用，点赞未保存', 'error');
      return;
    }

    button.setAttribute('aria-pressed', entry.liked ? 'true' : 'false');
    button.setAttribute('aria-label', (entry.liked ? '取消点赞' : '点赞') + '，当前 ' + entry.likes + ' 个赞');
    button.lastChild.textContent = String(entry.likes);

    button.classList.remove('is-bumping');
    void button.offsetWidth;
    button.classList.add('is-bumping');
  }

  /* ---------------- 提交 ---------------- */

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

    var entry = {
      id: genId(),
      content: content,
      mood: state.selectedMood,
      tags: state.selectedTags.slice(),
      likes: 0,
      liked: false,
      createdAt: Date.now()
    };

    var nextEntries = [entry].concat(state.entries);

    if (!saveEntries(nextEntries)) {
      showToast('本地存储不可用，内容尚未保存', 'error');
      return;
    }

    state.entries = nextEntries;
    state.newEntryId = entry.id;
    state.selectedTags = [];
    state.customTags = [];

    els.input.value = '';
    renderTagPicker();
    syncComposer();
    renderTimeline();
    renderStats();
    els.input.focus();
    showToast('已记录，仅保存在本机');
  }

  /* ---------------- 事件绑定与初始化 ---------------- */

  function bindEvents() {
    els.themeToggle.addEventListener('click', toggleTheme);

    els.weatherCard.addEventListener('click', openCityDialog);
    els.weatherRetry.addEventListener('click', function () {
      fetchWeather(state.weather.lastLocation || state.settings.location || DEFAULT_LOCATION);
    });

    els.citySearch.addEventListener('click', searchCity);
    els.cityInput.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        searchCity();
      }
    });
    els.cityLocate.addEventListener('click', locateFromDialog);
    els.cityClose.addEventListener('click', closeCityDialog);

    els.form.addEventListener('submit', handleSubmit);
    els.input.addEventListener('input', syncComposer);
    els.input.addEventListener('keydown', function (event) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        handleSubmit();
      }
    });

    els.tagAdd.addEventListener('click', addCustomTag);
    els.tagInput.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        addCustomTag();
      }
    });

    els.emptyAction.addEventListener('click', function () {
      els.input.focus();
    });

    els.card.addEventListener('animationend', function (event) {
      if (event.animationName === 'shake') els.card.classList.remove('is-shake');
    });

    els.timeline.addEventListener('click', function (event) {
      var target = event.target;
      var button = target && target.closest ? target.closest('.like-btn') : null;
      if (!button) return;

      var article = button.closest('.entry');
      if (!article) return;

      toggleLike(article.dataset.id, button);
    });

    if (window.matchMedia) {
      var media = window.matchMedia('(prefers-color-scheme: dark)');
      var handler = function () {
        if (state.settings.theme === 'system') applyTheme();
      };
      if (typeof media.addEventListener === 'function') {
        media.addEventListener('change', handler);
      } else if (typeof media.addListener === 'function') {
        media.addListener(handler);
      }
    }
  }

  function init() {
    migrateLegacy();

    state.entries = loadEntries().sort(function (a, b) {
      return b.createdAt - a.createdAt;
    });
    state.settings = loadSettings();

    applyTheme();
    renderMoodPicker();
    renderTagPicker();
    setMood('calm');
    syncComposer();
    renderToday();
    renderTimeline();
    renderStats();
    bindEvents();
    startClock();
    initWeather();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
