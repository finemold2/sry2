/* =====================================================================
   sry 소개 페이지 — 인터랙션
   외부 의존성 없음. 자기완결형.
   ===================================================================== */
(function () {
  'use strict';
  var doc = document;
  var root = doc.documentElement;
  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 앱 링크 설정 ----------
     index.html 의 window.SRY_APP_URL 한 줄만 바꾸면 모든 '시작하기'가 갱신됩니다. */
  var appUrl = (window.SRY_APP_URL || './app/');
  var appReady = window.SRY_APP_READY === true;

  // "곧 출시" 토스트 (앱 미배포 상태에서 시작 버튼 클릭 시)
  function showComingSoon() {
    var t = doc.getElementById('sryToast');
    if (!t) {
      t = doc.createElement('div');
      t.id = 'sryToast';
      t.className = 'toast';
      t.setAttribute('role', 'status');
      t.setAttribute('aria-live', 'polite');
      doc.body.appendChild(t);
    }
    t.textContent = '곧 출시됩니다 🚀 앱을 준비 중이에요.';
    void t.offsetWidth; // 리플로우로 트랜지션 보장
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove('show'); }, 3600);
  }

  /* 앱(PWA)의 서비스 워커가 이전 배포를 프리캐시해 두면, 새 배포 직후 첫 방문은 옛 번들이 뜬다(스킨 파라미터·자동 새로고침이
     없는 구버전이면 그대로 옛 화면). '시작하기'를 누를 때 같은 origin 의 등록된 워커에 업데이트를 요청하고, 새 워커가
     활성화될 때까지(최대 3초) 기다렸다가 이동해 항상 최신 앱으로 들어가게 한다. 워커가 없거나 이미 최신이면 바로 이동. */
  function refreshAppWorker() {
    return new Promise(function (resolve) {
      var done = false; var finish = function () { if (!done) { done = true; resolve(); } };
      var timer = setTimeout(finish, 3000);
      try {
        if (!('serviceWorker' in navigator)) { clearTimeout(timer); return finish(); }
        navigator.serviceWorker.getRegistrations().then(function (regs) {
          var pending = 0;
          regs.forEach(function (reg) {
            if (!reg.scope || reg.scope.indexOf('/app/') < 0) return;
            pending++;
            var watch = function (sw) {
              if (!sw) return false;
              if (sw.state === 'activated') return false;
              try { sw.postMessage({ type: 'SKIP_WAITING' }); } catch (e) { /* noop */ }
              sw.addEventListener('statechange', function () { if (sw.state === 'activated' || sw.state === 'redundant') { pending--; if (pending <= 0) { clearTimeout(timer); finish(); } } });
              return true;
            };
            reg.update().then(function () {
              if (watch(reg.installing) || watch(reg.waiting)) return;
              reg.addEventListener('updatefound', function () { watch(reg.installing); });
              // 이미 최신: 잠깐(300ms) updatefound 를 기다렸다가 이동
              setTimeout(function () { pending--; if (pending <= 0) { clearTimeout(timer); finish(); } }, 300);
            }).catch(function () { pending--; if (pending <= 0) { clearTimeout(timer); finish(); } });
          });
          if (pending === 0) { clearTimeout(timer); finish(); }
        }).catch(function () { clearTimeout(timer); finish(); });
      } catch (e) { clearTimeout(timer); finish(); }
    });
  }

  Array.prototype.forEach.call(doc.querySelectorAll('[data-app-link]'), function (a) {
    if (appReady) {
      a.setAttribute('href', appUrl); // 배포 완료: 실제 앱으로 연결
      a.addEventListener('click', function (e) {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // 새 탭 열기 등은 기본 동작
        e.preventDefault();
        refreshAppWorker().then(function () { window.location.href = a.getAttribute('href') || appUrl; });
      });
    } else {
      a.setAttribute('href', '#'); // 미배포: 404 대신 안내
      var base = (a.getAttribute('aria-label') || a.textContent || '').replace(/\s+/g, ' ').trim();
      a.setAttribute('aria-label', base + ' — 곧 출시');
      a.addEventListener('click', function (e) { e.preventDefault(); showComingSoon(); });
    }
  });

  /* ---------- 연도 ---------- */
  var yearEl = doc.getElementById('year');
  if (yearEl) {
    var y = new Date().getFullYear();
    if (y && !isNaN(y)) yearEl.textContent = String(y);
  }

  /* ---------- 테마 토글 ---------- */
  var toggle = doc.getElementById('themeToggle');
  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    try { localStorage.setItem('sry-theme', t); } catch (e) {}
    if (toggle) toggle.setAttribute('aria-pressed', String(t === 'dark'));
    var m = doc.getElementById('themeColorMeta');
    if (m) m.setAttribute('content', t === 'dark' ? '#0d0f13' : '#f7f7f8');
  }
  if (toggle) {
    toggle.setAttribute('aria-pressed', String(root.getAttribute('data-theme') === 'dark'));
    toggle.addEventListener('click', function () {
      applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
  }

  /* ---------- 헤더 스크롤 상태 ---------- */
  var header = doc.getElementById('siteHeader');
  function onScroll() {
    if (!header) return;
    header.classList.toggle('scrolled', window.scrollY > 8);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- 스크롤 진행 바: CSS scroll() 미지원 브라우저 폴백 ---------- */
  var progress = doc.getElementById('scrollProgress');
  var supportsScrollTL = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline', 'scroll()'));
  if (progress && !supportsScrollTL && !reduceMotion) {
    var updateProgress = function () {
      var h = doc.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = 'scaleX(' + (h > 0 ? Math.min(window.scrollY / h, 1) : 0) + ')';
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
  }

  /* ---------- 모바일 메뉴 ---------- */
  var menuToggle = doc.getElementById('menuToggle');
  var mobileMenu = doc.getElementById('mobileMenu');
  function menuFocusables() { return mobileMenu ? Array.prototype.slice.call(mobileMenu.querySelectorAll('a[href], button')) : []; }
  function closeMenu(returnFocus) {
    if (!menuToggle || !mobileMenu) return;
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', '메뉴 열기');
    var wasOpen = !mobileMenu.hidden;
    mobileMenu.hidden = true;
    doc.body.style.overflow = '';
    if (wasOpen && returnFocus !== false) menuToggle.focus();
  }
  function openMenu() {
    if (!menuToggle || !mobileMenu) return;
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.setAttribute('aria-label', '메뉴 닫기');
    mobileMenu.hidden = false;
    doc.body.style.overflow = 'hidden'; // 배경 스크롤 잠금
    var f = menuFocusables(); if (f.length) f[0].focus();
  }
  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', function () {
      (menuToggle.getAttribute('aria-expanded') === 'true') ? closeMenu() : openMenu();
    });
    mobileMenu.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeMenu(false); // 링크 클릭은 포커스 복귀 없이 닫기
    });
    doc.addEventListener('keydown', function (e) {
      if (mobileMenu.hidden) return;
      if (e.key === 'Escape') { closeMenu(); return; }
      if (e.key === 'Tab') { // 간단한 포커스 트랩(토글 버튼 포함)
        var f = menuFocusables(); if (!f.length) return;
        var first = f[0], last = f[f.length - 1], active = doc.activeElement;
        if (e.shiftKey && (active === first || active === menuToggle)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
      }
    });
    // 데스크톱 폭으로 커지면 메뉴 정리 (구형 Safari 는 addListener 폴백, 둘 다 없으면 조용히 무시)
    var mq = matchMedia('(min-width: 821px)');
    var onWide = function (m) { if (m.matches) closeMenu(false); };
    if (mq.addEventListener) mq.addEventListener('change', onWide);
    else if (mq.addListener) mq.addListener(onWide);
  }

  /* ---------- 스크롤 리빌 ---------- */
  var reveals = Array.prototype.slice.call(doc.querySelectorAll('.reveal'));
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 브랜드 스토리마크(s…to…ry) 다시 재생 ---------- */
  var storymark = doc.getElementById('storymark');
  if (storymark && !reduceMotion) {
    var replayStory = function () {
      storymark.classList.remove('in');
      void storymark.offsetWidth; // 리플로우로 애니메이션 재시작 보장
      storymark.classList.add('in');
    };
    storymark.addEventListener('click', replayStory);
    storymark.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); replayStory(); }
    });
  }

  /* ---------- 숫자 카운트업 ---------- */
  var counters = Array.prototype.slice.call(doc.querySelectorAll('[data-count]'));
  function formatNum(n) { return n.toLocaleString('en-US'); }
  function animateCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    var suffix = el.getAttribute('data-suffix') || '';
    if (isNaN(target)) return;
    if (reduceMotion) { el.textContent = formatNum(target) + suffix; return; }
    var dur = 1100, start = null;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = formatNum(Math.round(target * eased)) + suffix;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = formatNum(target) + suffix;
    }
    requestAnimationFrame(step);
  }
  if (counters.length) {
    if (!('IntersectionObserver' in window)) {
      counters.forEach(animateCount);
    } else {
      var co = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { animateCount(en.target); co.unobserve(en.target); }
        });
      }, { threshold: 0.5 });
      counters.forEach(function (el) { co.observe(el); });
    }
  }

  /* ---------- 의견 폼 → 메일 앱(mailto). 서버 없이 방문자 기본 메일 클라이언트로 전송 ---------- */
  var fbForm = doc.getElementById('feedbackForm');
  if (fbForm) {
    fbForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var val = function (id) { var el = doc.getElementById(id); return el ? (el.value || '').trim() : ''; };
      var name = val('fb-name'), email = val('fb-email'), msg = val('fb-msg');
      var hint = doc.getElementById('fb-hint');
      if (!msg) { var m = doc.getElementById('fb-msg'); if (m) m.focus(); if (hint) hint.textContent = '의견 내용을 입력해 주세요.'; return; }
      var subject = '[sry] 방문자 의견' + (name ? (' · ' + name) : '');
      var body = msg + '\n\n———\n보낸이: ' + (name || '(익명)') + (email ? ('\n회신: ' + email) : '');
      var url = 'mailto:devfinemold@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      if (hint) hint.textContent = '메일 앱을 여는 중… 창이 열리지 않으면 devfinemold@gmail.com 으로 보내주세요.';
      window.location.href = url;
    });
  }
})();
