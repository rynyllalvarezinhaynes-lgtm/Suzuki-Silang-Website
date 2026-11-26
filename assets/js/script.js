(function () {
  "use strict";
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Header, progress bar, parallax, floating bar ---------- */
  var header = $("#header");
  var progress = $("#progress");
  var floatBar = $("#floatBar");
  var parallaxEls = $$("[data-parallax]");
  var ticking = false;

  function onScroll() {
    var y = window.scrollY;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    header.classList.toggle("scrolled", y > 30);
    progress.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
    floatBar.classList.toggle("show", y > window.innerHeight * 0.7);
    if (y < window.innerHeight * 1.2) {
      parallaxEls.forEach(function (el) {
        var speed = parseFloat(el.getAttribute("data-parallax"));
        el.style.transform = "translate3d(0," + (y * speed) + "px,0)";
      });
    }
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  /* ---------- Hero background video ---------- */
  var hero = $("#hero");
  var video = $("#heroVideo");
  var videoToggle = $("#videoToggle");
  var userPaused = false;

  function syncToggle() {
    var playing = !video.paused;
    videoToggle.innerHTML = playing ? "&#10074;&#10074;" : "&#9654;";
    videoToggle.setAttribute("aria-label", playing ? "Pause background video" : "Play background video");
  }
  function videoReady() {
    if (hero.classList.contains("has-video")) return;
    hero.classList.add("has-video");
    videoToggle.hidden = false;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      userPaused = true;
      video.pause();
    }
    syncToggle();
  }
  if (video) {
    video.addEventListener("loadeddata", videoReady);
    video.addEventListener("play", syncToggle);
    video.addEventListener("pause", syncToggle);
    if (video.readyState >= 2) videoReady();
    videoToggle.addEventListener("click", function () {
      if (video.paused) { userPaused = false; video.play(); }
      else { userPaused = true; video.pause(); }
    });
    // Save battery: pause when the hero is scrolled out of view
    new IntersectionObserver(function (entries) {
      if (!hero.classList.contains("has-video") || userPaused) return;
      if (entries[0].isIntersecting) {
        var p = video.play();
        if (p && p.catch) p.catch(function () {});
      } else {
        video.pause();
      }
    }, { threshold: 0.1 }).observe(hero);
  }

  /* ---------- Mobile menu ---------- */
  var burger = $("#burger");
  var nav = $("#nav");
  burger.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    burger.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", open);
  });
  $$("#nav a").forEach(function (a) {
    a.addEventListener("click", function () {
      nav.classList.remove("open");
      burger.classList.remove("open");
      burger.setAttribute("aria-expanded", "false");
    });
  });

  /* ---------- Scroll reveal ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
  $$(".reveal").forEach(function (el) { io.observe(el); });

  /* ---------- Featured Suzuki carousel ---------- */
  var featuredModels = [
    {
      name: "S-Presso AGS",
      description: "The S-Presso keeps things compact for the city. Choose the 5AGS Auto Gear Shift or 5-speed manual.",
      image: "assets/images/hero/s-presso-photo.png",
      alt: "Red Suzuki S-Presso AGS",
      caption: "Suzuki S-Presso AGS · “Kick Start Your Life”"
    },
    {
      name: "Jimny AllGrip Pro",
      description: "The three-door Jimny pairs a compact shape with AllGrip Pro four-wheel drive.",
      image: "assets/images/models/jimny-owner.png",
      alt: "Suzuki Jimny AllGrip Pro",
      caption: "Suzuki Jimny AllGrip Pro"
    },
    {
      name: "Jimny 5-Door AllGrip Pro",
      description: "Keep the Jimny’s AllGrip Pro capability and add easier access to the second row.",
      image: "assets/images/models/jimny-5-door-owner.png",
      alt: "Suzuki Jimny 5-Door AllGrip Pro",
      caption: "Suzuki Jimny 5-Door AllGrip Pro"
    },
    {
      name: "Fronx Hybrid",
      description: "A distinctive crossover with Suzuki’s 12V hybrid system available in selected grades.",
      image: "assets/images/models/fronx-owner.png",
      alt: "Suzuki Fronx Hybrid",
      caption: "Suzuki Fronx Hybrid"
    },
    {
      name: "XL7 Hybrid Black Edition",
      description: "Seven seats, hybrid assistance and Black Edition styling for everyday trips.",
      image: "assets/images/models/xl7-owner.png",
      alt: "Suzuki XL7 Hybrid Black Edition",
      caption: "Suzuki XL7 Hybrid Black Edition"
    },
    {
      name: "Dzire Hybrid",
      description: "A hybrid sedan with everyday comfort and a 378-litre luggage compartment.",
      image: "assets/images/models/dzire-owner.png",
      alt: "Suzuki Dzire Hybrid",
      caption: "Suzuki Dzire Hybrid"
    },
    {
      name: "Ertiga Hybrid",
      description: "Three rows and seating for seven make the Ertiga ready for family trips and daily errands.",
      image: "assets/images/models/ertiga-owner.png",
      alt: "Suzuki Ertiga Hybrid",
      caption: "Suzuki Ertiga Hybrid"
    },
    {
      name: "APV",
      description: "A practical, spacious MPV that adapts to family and business use.",
      image: "assets/images/models/apv-owner.png",
      alt: "Suzuki APV",
      caption: "Suzuki APV"
    },
    {
      name: "Carry",
      description: "A compact commercial vehicle available in different body configurations to suit the job.",
      image: "assets/images/models/carry-owner.png",
      alt: "Suzuki Carry",
      caption: "Suzuki Carry"
    }
  ];
  var showcaseCopy = $("#showcaseCopy");
  var showcaseEyebrow = $("#showcaseEyebrow");
  var showcaseTitle = $("#showcaseTitle");
  var showcaseDescription = $("#showcaseDescription");
  var showcaseImage = $("#showcaseImage");
  var showcaseCaption = $("#showcaseCaption");
  var showcaseCount = $("#showcaseCount");
  var showcaseIndex = 0;

  function showFeaturedModel(index, direction) {
    showcaseIndex = (index + featuredModels.length) % featuredModels.length;
    var model = featuredModels[showcaseIndex];
    showcaseEyebrow.textContent = "Featured Suzuki · " + String(showcaseIndex + 1).padStart(2, "0") + " / " + String(featuredModels.length).padStart(2, "0");
    showcaseTitle.textContent = model.name;
    showcaseDescription.textContent = model.description;
    showcaseCount.textContent = String(showcaseIndex + 1).padStart(2, "0") + " / " + String(featuredModels.length).padStart(2, "0");
    showcaseImage.src = model.image;
    showcaseImage.alt = model.alt;
    showcaseImage.classList.toggle("brochure-fit", showcaseIndex !== 0);
    showcaseCaption.textContent = model.caption;

    showcaseCopy.classList.remove("slide-next", "slide-prev");
    showcaseImage.classList.remove("slide-next", "slide-prev");
    if (direction) {
      void showcaseCopy.offsetWidth;
      showcaseCopy.classList.add(direction);
      showcaseImage.classList.add(direction);
    }
  }

  $("#showcasePrev").addEventListener("click", function () {
    showFeaturedModel(showcaseIndex - 1, "slide-prev");
  });
  $("#showcaseNext").addEventListener("click", function () {
    showFeaturedModel(showcaseIndex + 1, "slide-next");
  });

  /* ---------- Count-up stats ---------- */
  function countUp(el) {
    var target = parseFloat(el.dataset.count);
    var dec = parseInt(el.dataset.decimals || "0", 10);
    var suffix = el.dataset.suffix || "";
    var dur = 1600;
    var start = null;
    function step(t) {
      if (!start) start = t;
      var p = Math.min((t - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 4);
      el.textContent = (target * eased).toFixed(dec) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var countIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { countUp(e.target); countIO.unobserve(e.target); }
    });
  }, { threshold: 0.6 });
  $$("[data-count]").forEach(function (el) { countIO.observe(el); });

  /* ---------- Model filters ---------- */
  var models = $$(".model");
  $$(".chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      $$(".chip").forEach(function (c) { c.classList.remove("active"); });
      chip.classList.add("active");
      var f = chip.dataset.filter;
      models.forEach(function (m) {
        var show = f === "all" || m.dataset.type === f;
        m.classList.toggle("hide", !show);
        if (show) {
          m.classList.remove("in");
          void m.offsetWidth;
          requestAnimationFrame(function () { m.classList.add("in"); });
        }
      });
    });
  });

  // 3D tilt on model cards
  models.forEach(function (card) {
    card.addEventListener("mousemove", function (e) {
      if (!card.classList.contains("in")) return;
      var r = card.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transition = "transform 0.1s";
      card.style.transform = "perspective(700px) rotateY(" + x * 10 + "deg) rotateX(" + -y * 10 + "deg) translateY(-6px)";
    });
    card.addEventListener("mouseleave", function () {
      card.style.transition = "";
      card.style.transform = "";
    });
  });

  /* ---------- FAQ accordion ---------- */
  $$(".acc-item").forEach(function (item) {
    var q = $(".acc-q", item);
    var a = $(".acc-a", item);
    q.addEventListener("click", function () {
      var open = item.classList.contains("open");
      $$(".acc-item.open").forEach(function (o) {
        o.classList.remove("open");
        $(".acc-a", o).style.maxHeight = null;
        $(".acc-q", o).setAttribute("aria-expanded", "false");
      });
      if (!open) {
        item.classList.add("open");
        a.style.maxHeight = a.scrollHeight + "px";
        q.setAttribute("aria-expanded", "true");
      }
    });
  });

  /* ---------- Inquiry form ---------- */
  var inquiryForm = $("#form");
  var inquiryStatus = $("#formOk");
  var inquiryButton = $("button[type='submit']", inquiryForm);
  inquiryForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    inquiryStatus.hidden = true;
    inquiryStatus.classList.remove("form-error");
    inquiryButton.disabled = true;
    inquiryButton.textContent = "Sending...";
    var values = new FormData(inquiryForm);
    try {
      var csrfResponse = await fetch("/api/auth/csrf", { credentials: "same-origin" });
      var csrfPayload = await csrfResponse.json();
      if (!csrfResponse.ok) throw new Error(csrfPayload.error || "Could not start the inquiry form.");
      var response = await fetch("/api/inquiries", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfPayload.csrfToken
        },
        body: JSON.stringify({
          name: values.get("name"),
          phone: values.get("phone"),
          email: values.get("email"),
          modelSlug: values.get("model"),
          intent: values.get("intent"),
          message: values.get("message")
        })
      });
      var result = await response.json();
      if (!response.ok) throw new Error(result.error || "The inquiry could not be sent.");
      inquiryStatus.textContent = "Thanks. Your inquiry was sent to Suzuki Auto Silang.";
      inquiryForm.reset();
    } catch (error) {
      inquiryStatus.textContent = error.message || "The inquiry could not be sent. Please try again.";
      inquiryStatus.classList.add("form-error");
    } finally {
      inquiryStatus.hidden = false;
      inquiryButton.disabled = false;
      inquiryButton.textContent = "Send Inquiry";
    }
  });
})();
