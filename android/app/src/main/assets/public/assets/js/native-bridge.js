/* Jembatan Android (Capacitor) untuk Tahfidz 28-30.
   - Web Speech API TIDAK tersedia di WebView Android, jadi dibuat pengganti `SpeechRecognition`
     yang memakai mesin suara Android lewat plugin @capacitor-community/speech-recognition.
   - Menyinkronkan warna ikon status bar / navigation bar, dan tombol Kembali perangkat.
   Di browser biasa file ini tidak melakukan apa-apa. */
(function () {
  'use strict';
  var C = window.Capacitor;
  var native = !!(C && typeof C.isNativePlatform === 'function' && C.isNativePlatform());
  var NB = window.NativeBridge = { native: native, syncBars: function () {}, exit: function () {} };
  if (!native) return;

  document.documentElement.classList.add('is-native');
  var P = C.Plugins || {};
  var noop = function () {};
  var SRP = P.SpeechRecognition;

  /* ---------- status bar & navigation bar ---------- */
  NB.syncBars = function (screen, dark) {
    var SB = P.SystemBars; if (!SB || !SB.setStyle) return;
    // Status bar berada di atas hero hijau tua (beranda/hasil) atau bilah kaca (kuis).
    var status = (screen === 'quiz' && !dark) ? 'LIGHT' : 'DARK';       // DARK = ikon terang
    var nav = dark ? 'DARK' : 'LIGHT';                                  // latar halaman terang -> ikon gelap
    try { SB.setStyle({ style: status, bar: 'StatusBar' }).catch(noop); } catch (e) {}
    try { SB.setStyle({ style: nav, bar: 'NavigationBar' }).catch(noop); } catch (e) {}
  };

  /* ---------- tombol Kembali & keluar ---------- */
  NB.exit = function () { try { P.App && P.App.exitApp(); } catch (e) {} };
  try {
    if (P.App && P.App.addListener) {
      P.App.addListener('backButton', function () {
        var root = document.querySelector('#app');
        var d = root && window.Alpine && Alpine.$data(root);
        if (d && d.onNativeBack) d.onNativeBack(); else NB.exit();
      });
    }
  } catch (e) {}

  /* ---------- pengganti SpeechRecognition ---------- */
  if (!SRP) return;
  var FINAL_WAIT_MS = 1500;   // menunggu hasil akhir setelah mesin berhenti
  var MAX_RESTARTS = 25;      // mode "continuous": mesin Android berhenti sendiri saat jeda -> dimulai lagi

  function permission() {
    return SRP.checkPermissions().then(function (r) {
      if (r && r.speechRecognition === 'granted') return 'granted';
      return SRP.requestPermissions().then(function (r2) { return (r2 && r2.speechRecognition) || 'denied'; });
    });
  }
  function mkResult(alts, isFinal) {
    var res = alts.map(function (t) { return { transcript: String(t), confidence: 0.9 }; });
    res.isFinal = !!isFinal;
    return res;
  }

  function NativeSpeechRecognition() {
    this.lang = 'ar-SA'; this.continuous = true; this.interimResults = true; this.maxAlternatives = 1;
    this.onstart = this.onresult = this.onerror = this.onend = null;
    this._s = null;
  }
  var P_ = NativeSpeechRecognition.prototype;

  function cleanup(s) {
    clearTimeout(s.tFinal);
    (s.handles || []).forEach(function (hp) { Promise.resolve(hp).then(function (h) { try { h && h.remove(); } catch (e) {} }, noop); });
    s.handles = [];
  }
  function emitResult(self, s) {
    if (!self.onresult) return;
    var list = s.finals.map(function (f) { return mkResult(f, true); });
    if (s.cur) list.push(mkResult(s.cur, false));
    try { self.onresult({ resultIndex: 0, results: list }); } catch (e) { console.error(e); }
  }
  function finish(self, s) {
    if (s.ended) return; s.ended = true; s.active = false; cleanup(s);
    try { SRP.stop().catch(noop); } catch (e) {}
    if (self.onend) { try { self.onend({}); } catch (e) { console.error(e); } }
  }
  function fail(self, s, code) {
    if (s.ended) return; s.ended = true; s.active = false; cleanup(s);
    if (self.onerror) { try { self.onerror({ error: code }); } catch (e) { console.error(e); } }
    if (self.onend) { try { self.onend({}); } catch (e) { console.error(e); } }
  }
  function endSegment(self, s) {          // satu "kalimat" dari mesin Android selesai
    if (s.ended) return;
    clearTimeout(s.tFinal); s.waitFinal = false;
    if (s.cur) { s.finals.push(s.cur); s.cur = null; emitResult(self, s); }
    if (s.stopping || self.continuous === false || s.restarts >= MAX_RESTARTS) return finish(self, s);
    s.restarts++; begin(self, s, false);
  }
  function begin(self, s, first) {
    if (!s.active) return;
    var opts = { language: self.lang, maxResults: Math.max(1, self.maxAlternatives || 1), partialResults: true, popup: false };
    SRP.start(opts).then(function () {
      if (!s.active) return;
      if (first && self.onstart) { try { self.onstart({}); } catch (e) { console.error(e); } }
    }, function (err) {
      var m = String((err && (err.message || err)) || '').toLowerCase();
      fail(self, s, /permission/.test(m) ? 'not-allowed' : (/unavailable|not.available/.test(m) ? 'service-not-allowed' : 'audio-capture'));
    });
  }

  P_.start = function () {
    var self = this;
    if (this._s && this._s.active) throw new Error('already started');
    var s = this._s = { active: true, ended: false, stopping: false, waitFinal: false, finals: [], cur: null, restarts: 0, handles: [], tFinal: 0 };
    permission().then(function (st) {
      if (!s.active) return;
      if (st !== 'granted') return fail(self, s, 'not-allowed');
      return SRP.available().then(function (a) {
        if (!s.active) return;
        if (!a || !a.available) return fail(self, s, 'service-not-allowed');
        s.handles.push(SRP.addListener('partialResults', function (ev) {
          if (!s.active || s.ended) return;
          var m = (ev && ev.matches) || []; if (!m.length) return;
          s.cur = m.slice(0, Math.max(1, self.maxAlternatives || 1));
          if (s.waitFinal) return endSegment(self, s);       // hasil akhir setelah berhenti
          emitResult(self, s);
        }));
        s.handles.push(SRP.addListener('listeningState', function (ev) {
          if (!s.active || s.ended || !ev || ev.status !== 'stopped' || s.stopping) return;
          s.waitFinal = true; clearTimeout(s.tFinal);        // akhir ucapan -> tunggu hasil akhir lalu mulai lagi
          s.tFinal = setTimeout(function () { endSegment(self, s); }, FINAL_WAIT_MS);
        }));
        begin(self, s, true);
      });
    }).catch(function () { fail(self, s, 'audio-capture'); });
  };
  P_.stop = function () {
    var s = this._s, self = this; if (!s || !s.active || s.ended) return;
    s.stopping = true; s.waitFinal = true;
    try { SRP.stop().catch(noop); } catch (e) {}
    clearTimeout(s.tFinal);
    s.tFinal = setTimeout(function () { endSegment(self, s); }, s.cur ? 700 : 400);
  };
  P_.abort = function () {
    var s = this._s; if (!s || s.ended) return;
    s.ended = true; s.active = false; cleanup(s);
    try { SRP.stop().catch(noop); } catch (e) {}
  };

  window.SpeechRecognition = NativeSpeechRecognition;
  window.webkitSpeechRecognition = NativeSpeechRecognition;
})();
