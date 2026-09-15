      (function () {
        const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&*+-/<>[]{}01";
        const rand = (a, b) => Math.random() * (b - a) + a;
        const randInt = (a, b) => Math.floor(rand(a, b + 1));

        function splitToSpans(el, textOverride, staggerMax) {
          const text = textOverride || el.textContent;
          el.textContent = "";
          el.setAttribute("aria-label", text);
          const frag = document.createDocumentFragment();
          const chars = [...text];
          const len = Math.max(chars.length - 1, 1);
          chars.forEach((ch, i) => {
            const s = document.createElement("span");
            s.className = "ch";
            s.style.setProperty("--i", i);
            if (staggerMax)
              s.style.setProperty(
                "--d",
                ((i / len) * staggerMax).toFixed(0) + "ms"
              );
            s.textContent = ch === " " ? "\u00A0" : ch;
            frag.appendChild(s);
          });
          el.appendChild(frag);
          return [...el.children];
        }

        /* ---------- assign specimen index for the watermark number ---------- */
        document.querySelectorAll(".plate").forEach((p) => {
          const n = p.querySelector(".plate-num");
          if (n) p.setAttribute("data-index", n.textContent.trim());
        });

        /* ---------- generic observer: adds/removes 'in' class, triggered near viewport center ---------- */
        const stages = document.querySelectorAll(".stage[data-observe]");
        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              const el = entry.target;
              if (entry.isIntersecting) {
                el.classList.add("in");
                el.dispatchEvent(new CustomEvent("specimen:enter"));
              } else {
                el.classList.remove("in");
                el.dispatchEvent(new CustomEvent("specimen:leave"));
              }
            });
          },
          { threshold: 0, rootMargin: "-38% 0px -38% 0px" }
        );
        stages.forEach((s) => io.observe(s));

        /* ---------- active section: nav highlight + progress indicator ---------- */
        const plates = document.querySelectorAll(".plate");
        const progressEl = document.getElementById("progress");
        const navLinks = document.querySelectorAll(".sidebar a");
        const sectionObserver = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              const plate = entry.target;
              const num = plate.dataset.index;
              const name = plate.querySelector("h4")
                ? plate.querySelector("h4").textContent
                : "";
              if (progressEl)
                progressEl.innerHTML = `<span class="num">${num}</span> / 29 — ${name}`;
              navLinks.forEach((a) => {
                a.classList.toggle(
                  "active",
                  a.getAttribute("href") === "#" + plate.id
                );
              });
            });
          },
          { threshold: 0, rootMargin: "-45% 0px -45% 0px" }
        );
        plates.forEach((p) => sectionObserver.observe(p));

        /* ---------- 01 scramble ---------- */
        document.querySelectorAll('[data-anim="scramble"]').forEach((stage) => {
          const el = stage.querySelector(".demo");
          const target = el.dataset.text;
          let timer = null;
          function run() {
            clearInterval(timer);
            let revealed = 0;
            let frame = 0;
            timer = setInterval(() => {
              frame++;
              let out = "";
              for (let i = 0; i < target.length; i++) {
                if (target[i] === " ") {
                  out += " ";
                  continue;
                }
                if (i < revealed) out += target[i];
                else out += CHARS[randInt(0, CHARS.length - 1)];
              }
              el.textContent = out;
              if (frame % 3 === 0) revealed++;
              if (revealed > target.length) {
                clearInterval(timer);
                el.textContent = target;
              }
            }, 40);
          }
          stage.addEventListener("specimen:enter", run);
        });

        /* ---------- 02 typewriter ---------- */
        document
          .querySelectorAll('[data-anim="typewriter"]')
          .forEach((stage) => {
            const el = stage.querySelector(".demo");
            const target = el.dataset.text;
            el.style.borderRight = "2px solid var(--brass)";
            el.style.paddingRight = "4px";
            let timer;
            function run() {
              clearInterval(timer);
              let i = 0;
              el.textContent = "";
              timer = setInterval(() => {
                el.textContent = target.slice(0, i + 1);
                i++;
                if (i >= target.length) clearInterval(timer);
              }, 65);
            }
            stage.addEventListener("specimen:enter", run);
          });

        /* ---------- 03 split-flap ---------- */
        document
          .querySelectorAll('[data-anim="splitflap"]')
          .forEach((stage) => {
            const el = stage.querySelector(".demo");
            const target = el.dataset.text;
            function run() {
              const spans = splitToSpans(el, target);
              spans.forEach((s, i) => {
                const finalChar = target[i];
                if (finalChar === " ") return;
                let count = 0;
                const total = randInt(8, 16);
                s.style.borderBottom = "1px solid var(--line-strong)";
                const t = setInterval(() => {
                  count++;
                  if (count >= total) {
                    s.textContent = finalChar;
                    clearInterval(t);
                  } else s.textContent = CHARS[randInt(0, CHARS.length - 1)];
                }, 45 + i * 4);
              });
            }
            stage.addEventListener("specimen:enter", run);
          });

        /* ---------- 04, 05, 09, 29 : simple split + CSS-driven, capped total stagger ---------- */
        ["stagger", "blur", "flip", "gravity"].forEach((name) => {
          document
            .querySelectorAll(`[data-anim="${name}"] .demo`)
            .forEach((el) => {
              splitToSpans(el, null, 420);
            });
        });

        /* ---------- 07 ink : nothing extra needed, CSS driven ---------- */
        /* ---------- 08 curtain : nothing extra needed, CSS driven ---------- */

        /* ---------- 15 kinetic rotator ---------- */
        (function () {
          const el = document.querySelector(".rotator-word");
          if (!el) return;
          const words = ["SPEED", "CLARITY", "CRAFT", "RHYTHM"];
          let idx = 0;
          el.style.display = "inline-block";
          el.style.transition =
            "transform .5s cubic-bezier(.5,0,.2,1), opacity .5s ease";
          function show() {
            el.textContent = words[idx];
            el.style.opacity = 0;
            el.style.transform = "translateY(18px)";
            requestAnimationFrame(() => {
              el.style.opacity = 1;
              el.style.transform = "translateY(0)";
            });
          }
          show();
          setInterval(() => {
            el.style.opacity = 0;
            el.style.transform = "translateY(-18px)";
            setTimeout(() => {
              idx = (idx + 1) % words.length;
              show();
            }, 400);
          }, 2200);
        })();

        /* ---------- 16 magnetic pull ---------- */
        document.querySelectorAll('[data-anim="magnet"]').forEach((stage) => {
          const el = stage.querySelector(".demo");
          const spans = splitToSpans(el);
          stage.addEventListener("mousemove", (e) => {
            const rect = stage.getBoundingClientRect();
            const mx = e.clientX - rect.left,
              my = e.clientY - rect.top;
            spans.forEach((s) => {
              const r = s.getBoundingClientRect();
              const cx = r.left - rect.left + r.width / 2;
              const cy = r.top - rect.top + r.height / 2;
              const dx = mx - cx,
                dy = my - cy;
              const dist = Math.max(30, Math.sqrt(dx * dx + dy * dy));
              const pull = Math.min(1, 90 / dist);
              s.style.transform = `translate(${dx * pull * 0.35}px, ${
                dy * pull * 0.35
              }px)`;
            });
          });
          stage.addEventListener("mouseleave", () =>
            spans.forEach((s) => (s.style.transform = ""))
          );
        });

        /* ---------- 17 scroll scrub ---------- */
        document.querySelectorAll('[data-anim="scrub"]').forEach((stage) => {
          function update() {
            const r = stage.getBoundingClientRect();
            const vh = window.innerHeight;
            let progress = 1 - (r.top + r.height / 2) / (vh + r.height / 2);
            progress = Math.max(0, Math.min(1, progress));
            stage.style.setProperty("--p", (progress * 100).toFixed(1) + "%");
          }
          window.addEventListener("scroll", update, { passive: true });
          update();
        });

        /* ---------- 18 hover scatter ---------- */
        document.querySelectorAll('[data-anim="scatter"]').forEach((stage) => {
          const el = stage.querySelector(".demo");
          const spans = splitToSpans(el);
          stage.addEventListener("mouseenter", () => {
            spans.forEach((s) => {
              s.style.transform = `translate(${rand(-40, 40)}px, ${rand(
                -30,
                30
              )}px) rotate(${rand(-40, 40)}deg)`;
            });
          });
          stage.addEventListener("mouseleave", () =>
            spans.forEach((s) => (s.style.transform = ""))
          );
        });

        /* ---------- 19 weight morph ---------- */
        document.querySelectorAll('[data-anim="pressure"]').forEach((stage) => {
          const el = stage.querySelector(".demo");
          const spans = splitToSpans(el);
          stage.addEventListener("mousemove", (e) => {
            const rect = stage.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            spans.forEach((s) => {
              const r = s.getBoundingClientRect();
              const cx = r.left - rect.left + r.width / 2;
              const dist = Math.abs(mx - cx);
              const wght = Math.max(300, 900 - dist * 6);
              s.style.fontVariationSettings = `"wght" ${wght}`;
            });
          });
          stage.addEventListener("mouseleave", () =>
            spans.forEach((s) => (s.style.fontVariationSettings = '"wght" 400'))
          );
        });

        /* ---------- 20 cursor distort ---------- */
        document.querySelectorAll('[data-anim="distort"]').forEach((stage) => {
          const el = stage.querySelector(".demo");
          const spans = splitToSpans(el);
          stage.addEventListener("mousemove", (e) => {
            const rect = stage.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            spans.forEach((s) => {
              const r = s.getBoundingClientRect();
              const cx = r.left - rect.left + r.width / 2;
              const dist = mx - cx;
              const proximity = Math.max(0, 1 - Math.abs(dist) / 120);
              const skew = (dist > 0 ? -1 : 1) * proximity * 18;
              const scale = 1 + proximity * 0.4;
              s.style.transform = `skewX(${skew}deg) scale(${scale})`;
            });
          });
          stage.addEventListener("mouseleave", () =>
            spans.forEach((s) => (s.style.transform = ""))
          );
        });

        /* ---------- 21 shatter (hover, CSS driven vars) ---------- */
        document
          .querySelectorAll('[data-anim="shatter"] .demo')
          .forEach((el) => {
            const spans = splitToSpans(el);
            spans.forEach((s) => {
              s.style.setProperty("--tx", rand(-120, 120).toFixed(0) + "px");
              s.style.setProperty("--ty", rand(-90, 90).toFixed(0) + "px");
              s.style.setProperty("--tr", rand(-90, 90).toFixed(0) + "deg");
            });
          });

        /* ---------- 24 terminal cycle ---------- */
        (function () {
          const el = document.querySelector(".terminal-text");
          if (!el) return;
          const words = [
            "npm run build",
            'git commit -m "ship it"',
            "deploy --prod",
          ];
          let wi = 0;
          el.style.borderRight = "2px solid var(--brass)";
          el.style.paddingRight = "4px";
          function typeWord(word, cb) {
            let i = 0;
            const t = setInterval(() => {
              el.textContent = word.slice(0, i + 1);
              i++;
              if (i > word.length) {
                clearInterval(t);
                cb();
              }
            }, 60);
          }
          function deleteWord(cb) {
            let text = el.textContent;
            const t = setInterval(() => {
              text = text.slice(0, -1);
              el.textContent = text;
              if (text.length === 0) {
                clearInterval(t);
                cb();
              }
            }, 35);
          }
          function loop() {
            typeWord(words[wi], () => {
              setTimeout(() => {
                deleteWord(() => {
                  wi = (wi + 1) % words.length;
                  setTimeout(loop, 300);
                });
              }, 1100);
            });
          }
          loop();
        })();

        /* ---------- 26 matrix formation ---------- */
        document.querySelectorAll('[data-anim="matrix"]').forEach((stage) => {
          const canvas = stage.querySelector("canvas");
          const ctx = canvas.getContext("2d");
          const word = "TYPE";
          const fontSize = 22;
          const cols = Math.floor(canvas.width / fontSize);
          let drops,
            locked,
            running = false,
            raf;

          function reset() {
            drops = new Array(cols).fill(0).map(() => -randInt(0, 20));
            locked = new Array(cols).fill(null);
            // decide which columns will host the target letters, centered
            const startCol = Math.floor(cols / 2 - (word.length * 1.1) / 2);
            for (let i = 0; i < word.length; i++) {
              const c = startCol + i * 2;
              if (c >= 0 && c < cols)
                locked[c] = { char: word[i], row: 4, done: false };
            }
          }
          function draw() {
            ctx.fillStyle = "rgba(16,17,20,0.35)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.font = fontSize + "px monospace";
            let allDone = true;
            for (let c = 0; c < cols; c++) {
              const x = c * fontSize;
              const target = locked[c];
              if (target && drops[c] >= target.row) {
                ctx.fillStyle = "#C7A03D";
                ctx.fillText(target.char, x, target.row * fontSize);
                target.done = true;
              } else {
                allDone = false;
                const ch = CHARS[randInt(0, CHARS.length - 1)];
                ctx.fillStyle = "rgba(233,229,220,0.55)";
                ctx.fillText(ch, x, drops[c] * fontSize);
                drops[c]++;
                if (drops[c] * fontSize > canvas.height) drops[c] = 0;
              }
            }
            if (!allDone) {
              raf = requestAnimationFrame(draw);
            } else {
              running = false;
            }
          }
          function run() {
            if (running) return;
            running = true;
            reset();
            ctx.fillStyle = "#101114";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            cancelAnimationFrame(raf);
            draw();
          }
          stage.addEventListener("specimen:enter", run);
        });

        /* ---------- 27 word morph ---------- */
        document.querySelectorAll(".morph-wrap").forEach((wrap) => {
          setInterval(() => wrap.classList.toggle("swap"), 2200);
        });

        /* ---------- 28 chromatic scroll ---------- */
        document.querySelectorAll('[data-anim="chroma"]').forEach((stage) => {
          const el = stage.querySelector(".demo");
          function update() {
            const r = stage.getBoundingClientRect();
            const vh = window.innerHeight;
            const center = vh / 2;
            const stageCenter = r.top + r.height / 2;
            const offset = Math.max(
              -1,
              Math.min(1, (stageCenter - center) / (vh / 2))
            );
            const mag = Math.abs(offset) * 8;
            el.style.textShadow = `${offset * mag}px 0 rgba(255,59,107,.7), ${
              -offset * mag
            }px 0 rgba(59,214,255,.7)`;
          }
          window.addEventListener("scroll", update, { passive: true });
          update();
        });
      })();