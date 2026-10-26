$(function () {
  const HOLIDAYS = {
    // 2025
    "2025-01-01": "신정", "2025-01-27": "임시공휴일", "2025-01-28": "설날 연휴",
    "2025-01-29": "설날", "2025-01-30": "설날 연휴", "2025-03-01": "삼일절",
    "2025-03-03": "대체공휴일", "2025-05-05": "어린이날·부처님오신날",
    "2025-05-06": "대체공휴일", "2025-06-03": "대통령선거일", "2025-06-06": "현충일",
    "2025-08-15": "광복절", "2025-10-03": "개천절", "2025-10-05": "추석 연휴",
    "2025-10-06": "추석", "2025-10-07": "추석 연휴", "2025-10-08": "대체공휴일",
    "2025-10-09": "한글날", "2025-12-25": "성탄절",
    // 2026
    "2026-01-01": "신정", "2026-02-16": "설날 연휴", "2026-02-17": "설날",
    "2026-02-18": "설날 연휴", "2026-03-01": "삼일절", "2026-03-02": "대체공휴일",
    "2026-05-01": "근로자의 날", "2026-05-05": "어린이날", "2026-05-24": "부처님오신날",
    "2026-05-25": "대체공휴일", "2026-06-03": "지방선거일", "2026-06-06": "현충일",
    "2026-08-15": "광복절", "2026-08-17": "대체공휴일", "2026-09-24": "추석 연휴",
    "2026-09-25": "추석", "2026-09-26": "추석 연휴", "2026-09-28": "대체공휴일",
    "2026-10-03": "개천절", "2026-10-05": "대체공휴일", "2026-10-09": "한글날",
    "2026-12-25": "성탄절",
    // 2027
    "2027-01-01": "신정", "2027-02-06": "설날 연휴", "2027-02-07": "설날",
    "2027-02-08": "설날 연휴", "2027-02-09": "대체공휴일", "2027-03-01": "삼일절",
    "2027-05-05": "어린이날", "2027-05-13": "부처님오신날", "2027-06-06": "현충일",
    "2027-08-15": "광복절", "2027-08-16": "대체공휴일", "2027-09-14": "추석 연휴",
    "2027-09-15": "추석", "2027-09-16": "추석 연휴", "2027-10-03": "개천절",
    "2027-10-04": "대체공휴일", "2027-10-09": "한글날", "2027-10-11": "대체공휴일",
    "2027-12-25": "성탄절", "2027-12-27": "대체공휴일"
  };
  const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
  const STORAGE_KEY = "dailyPlanEvents";
  const LOCK_KEY = "dailyPlanLock";
  const KDF_ITER = 250000;
  const CRYPTO_OK = Boolean(window.crypto && window.crypto.subtle);
  const CRYPTO_MSG =
    "이 환경에서는 암호화 기능을 사용할 수 없습니다. 파일을 직접 열거나(file://), localhost 또는 https 주소로 접속해 주세요.";
  const COLORS = [
    { key: "coral", label: "코랄" },
    { key: "pink", label: "분홍" },
    { key: "purple", label: "보라" },
    { key: "navy", label: "네이비" },
    { key: "sky", label: "하늘" },
    { key: "teal", label: "틸" },
    { key: "green", label: "초록" },
    { key: "gold", label: "골드" },
    { key: "brown", label: "갈색" },
    { key: "gray", label: "회색" },
  ];
  let viewDate = new Date();
  let lockMeta = loadLockMeta();
  let cryptoKey = null;
  let pendingUnlock = null;
  let events = loadEvents();
  let dayKey = null;

  WEEKDAYS.forEach(function (day, index) {
    const cls = index === 0 ? " sun" : index === 6 ? " sat" : "";
    $("#weekdayRow").append($("<div>", { class: "weekday" + cls, text: day }));
  });

  buildColorPicker();
  buildTimePicker();
  renderCalendar();
  renderUpcoming();
  renderLockMenu();

  $("#menuBtn").on("click", function () {
    openDrawer();
  });

  $("#closeMenu, #drawer").on("click", function (e) {
    if (e.target === this) {
      closeDrawer();
    }
  });

  $("#todayBtn").on("click", goToday);

  $("#prevMonth").on("click", function () {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
    renderCalendar();
  });

  $("#nextMonth").on("click", function () {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    renderCalendar();
  });

  $(document).on("click", ".day-cell", function (e) {
    if ($(e.target).closest(".event-chip").length) {
      return;
    }
    openEventModal({ date: $(this).data("date") });
  });

  $(document).on("change", ".done-toggle", function () {
    const item = findEvent($(this).data("id"));
    if (!item) {
      return;
    }
    item.done = this.checked;
    saveEvents();
    renderCalendar();
    renderUpcoming();
    if ($("#listModal").hasClass("open")) {
      renderAllEvents();
    }
    if ($("#dayModal").hasClass("open")) {
      renderDayModal();
    }
  });

  $("#closeDay, #dayModal").on("click", function (e) {
    if (e.target === this) {
      closeDayModal();
    }
  });

  $("#dayAddEvent").on("click", function () {
    openEventModal({ date: dayKey });
  });

  $("#dayAddDiary").on("click", function () {
    openEventModal({ date: dayKey, type: "diary" });
  });

  $(document).on("click", ".more-count", function (e) {
    e.stopPropagation();
    openDayModal($(this).data("date"));
  });

  $(document).on("click", ".event-chip, .upcoming-item, .all-event, .diary-mark, .diary-card", function (e) {
    e.stopPropagation();
    if ($(e.target).is(".done-toggle")) {
      return;
    }
    const event = findEvent($(this).data("id"));
    if (event) {
      openEventModal(event);
    }
  });

  $(".menu-item").on("click", function () {
    const action = $(this).data("action");
    closeDrawer();
    if (action === "today") {
      goToday();
    } else if (action === "add") {
      openEventModal({ date: formatDate(new Date()) });
    } else if (action === "diary") {
      openEventModal({ date: formatDate(new Date()), type: "diary" });
    } else if (action === "list") {
      renderAllEvents();
      $("#listModal").addClass("open").attr("aria-hidden", "false");
    } else if (action === "diaryBook") {
      requireUnlock(openBook);
    } else if (action === "lock") {
      openLockFromMenu();
    } else if (action === "export") {
      exportBackup();
    } else if (action === "import") {
      $("#importFile").val("").trigger("click");
    }
  });

  $("#closeList, #listModal").on("click", function (e) {
    if (e.target === this) {
      $("#listModal").removeClass("open").attr("aria-hidden", "true");
    }
  });

  $("#cancelEvent, #eventModal").on("click", function (e) {
    if (e.target === this) {
      closeEventModal();
    }
  });

  $("#deleteEvent").on("click", function () {
    const id = $("#eventId").val();
    if (!id) {
      closeEventModal();
      return;
    }
    events = events.filter(function (item) {
      return item.id !== id;
    });
    saveEvents();
    renderCalendar();
    renderUpcoming();
    closeEventModal();
  });

  let lastMaxLanes = getLaneConfig().maxLanes;
  $(window).on("resize", function () {
    const current = getLaneConfig().maxLanes;
    if (current !== lastMaxLanes) {
      lastMaxLanes = current;
      renderCalendar();
    }
  });

  $("#eventDate").on("change", function () {
    syncEndDateMin();
    const date = $("#eventDate").val();
    if (currentType() === "diary" && !$("#eventId").val() && findDiaryByDate(date)) {
      openEventModal({ date: date, type: "diary" });
    }
  });

  $("#eventForm").on("submit", async function (e) {
    e.preventDefault();
    const type = currentType();
    const isDiary = type === "diary";
    const startDate = $("#eventDate").val();
    const endDate = isDiary ? "" : $("#eventEndDate").val();
    if (!isDiary && endDate && endDate < startDate) {
      alert("종료일은 시작일보다 빠를 수 없습니다.");
      return;
    }
    const memo = $("#eventMemo").val().trim();
    if (isDiary && !memo) {
      alert("일기 내용을 입력해 주세요.");
      return;
    }
    const currentId = $("#eventId").val();
    if (isDiary) {
      const other = findDiaryByDate(startDate);
      if (other && other.id !== currentId) {
        alert("이 날짜에는 이미 일기가 있습니다. 날짜를 바꾸거나 기존 일기를 수정해 주세요.");
        return;
      }
    }
    const payload = {
      id: currentId || String(Date.now()),
      type: type,
      date: startDate,
      endDate: endDate && endDate !== startDate ? endDate : "",
      title: $("#eventTitle").val().trim() || (isDiary ? "일기" : ""),
      time: isDiary ? "" : getTimeValue(),
      memo: memo,
      color: isDiary ? "gray" : $('input[name="eventColor"]:checked').val() || "coral",
      done: isDiary ? false : $("#eventDone").prop("checked"),
    };

    if (isDiary && lockMeta) {
      if (!cryptoKey) {
        alert("일기가 잠겨 있습니다. 먼저 잠금을 풀어 주세요.");
        return;
      }
      try {
        payload.enc = await encryptJson(cryptoKey, { title: payload.title, memo: payload.memo });
      } catch (error) {
        alert("일기를 암호화하지 못했습니다.");
        return;
      }
    }

    const index = events.findIndex(function (item) {
      return item.id === payload.id;
    });
    if (index >= 0) {
      events[index] = payload;
    } else {
      events.push(payload);
    }

    saveEvents();
    renderCalendar();
    renderUpcoming();
    closeEventModal();
  });

  // ---------- 일기 보기 (책 형태, 읽기 전용) ----------
  const FULL_WEEKDAYS = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
  const BOOK_FONT_KEY = "dailyPlanBookFont";
  let bookEntries = [];
  let bookIndex = 0;
  let bookPer = 2;

  $("#closeBook").on("click", closeBook);
  $("#bookModal").on("click", function (e) {
    if (e.target === this) {
      closeBook();
    }
  });
  $("#bookPrev").on("click", function () {
    turnBook(-1);
  });
  $("#bookNext").on("click", function () {
    turnBook(1);
  });
  $(".book-fonts button").on("click", function () {
    setBookFont($(this).data("font"));
  });
  $("#bookJump").on("change", function () {
    const value = $(this).val();
    if (!value || !bookEntries.length) {
      return;
    }
    let target = bookEntries.findIndex(function (entry) {
      return entry.date >= value;
    });
    const exact = target >= 0 && bookEntries[target].date === value;
    if (target < 0) {
      target = bookEntries.length - 1;
    }
    bookIndex = target;
    renderBook(null);
    if (!exact) {
      toast("그 날짜의 일기는 없어서 가까운 일기로 이동했습니다.");
    }
  });

  $(document).on("keydown", function (e) {
    if (!$("#bookModal").hasClass("open") || $(e.target).is("input, textarea, select")) {
      return;
    }
    if (e.key === "ArrowRight") {
      turnBook(1);
    } else if (e.key === "ArrowLeft") {
      turnBook(-1);
    } else if (e.key === "Escape") {
      closeBook();
    }
  });

  let swipeStartX = null;
  $("#bookPages")
    .on("touchstart", function (e) {
      swipeStartX = e.originalEvent.touches[0].clientX;
    })
    .on("touchend", function (e) {
      if (swipeStartX === null) {
        return;
      }
      const dx = e.originalEvent.changedTouches[0].clientX - swipeStartX;
      swipeStartX = null;
      if (Math.abs(dx) > 50) {
        turnBook(dx < 0 ? 1 : -1);
      }
    });

  $(window).on("resize", function () {
    if ($("#bookModal").hasClass("open") && bookPerView() !== bookPer) {
      renderBook(null);
    }
  });

  function bookPerView() {
    return window.matchMedia("(max-width: 720px)").matches ? 1 : 2;
  }

  function loadBookFont() {
    try {
      return localStorage.getItem(BOOK_FONT_KEY) === "serif" ? "serif" : "hand";
    } catch (error) {
      return "hand";
    }
  }

  function setBookFont(font) {
    const value = font === "serif" ? "serif" : "hand";
    $("#bookModal").attr("data-font", value);
    $(".book-fonts button").removeClass("active").filter('[data-font="' + value + '"]').addClass("active");
    try {
      localStorage.setItem(BOOK_FONT_KEY, value);
    } catch (error) {
      // 저장 실패는 무시 (이번 화면에만 적용)
    }
  }

  function openBook() {
    bookEntries = events.filter(isDiaryItem).sort(function (a, b) {
      return a.date.localeCompare(b.date);
    });
    bookIndex = Math.max(0, bookEntries.length - 1);
    $("#bookJump").val("");
    setBookFont(loadBookFont());
    renderBook(null);
    $("#bookModal").addClass("open").attr("aria-hidden", "false");
  }

  function closeBook() {
    $("#bookModal").removeClass("open").attr("aria-hidden", "true");
    bookEntries = [];
    $("#bookPages").empty();
  }

  function turnBook(direction) {
    const next = bookIndex + direction * bookPer;
    if (next < 0 || next >= bookEntries.length) {
      return;
    }
    bookIndex = next;
    renderBook(direction > 0 ? "next" : "prev");
  }

  function renderBook(direction) {
    bookPer = bookPerView();
    const total = bookEntries.length;
    bookIndex = Math.max(0, Math.min(bookIndex, Math.max(0, total - 1)));
    bookIndex = Math.floor(bookIndex / bookPer) * bookPer;

    const $pages = $("#bookPages").empty().toggleClass("single", bookPer === 1);
    if (!total) {
      $pages.append(
        $("<article>", { class: "book-page empty-page" }).append(
          $("<p>", { class: "empty-note", text: "아직 쓴 일기가 없어요." }),
          $("<p>", { class: "empty-note sub", text: "달력에서 날짜를 눌러 첫 일기를 써 보세요." })
        )
      );
      if (bookPer === 2) {
        $pages.append($("<article>", { class: "book-page blank" }));
      }
      $("#bookIndicator").text("");
      $("#bookPrev, #bookNext").prop("disabled", true);
      return;
    }

    for (let i = 0; i < bookPer; i += 1) {
      const entry = bookEntries[bookIndex + i];
      const $page = entry
        ? buildBookPage(entry, bookIndex + i + 1)
        : $("<article>", { class: "book-page blank" });
      if (direction === "next" && i === bookPer - 1) {
        $page.addClass("turn-next");
      } else if (direction === "prev" && i === 0) {
        $page.addClass("turn-prev");
      }
      $pages.append($page);
    }

    const last = Math.min(bookIndex + bookPer, total);
    $("#bookIndicator").text(
      (bookPer === 2 && last > bookIndex + 1 ? bookIndex + 1 + " – " + last : String(bookIndex + 1)) +
        " / " + total + "쪽"
    );
    $("#bookPrev").prop("disabled", bookIndex === 0);
    $("#bookNext").prop("disabled", bookIndex + bookPer >= total);
  }

  function buildBookPage(entry, number) {
    const parts = entry.date.split("-");
    const date = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    const holiday = HOLIDAYS[entry.date];
    const $head = $("<header>", { class: "page-head" })
      .append($("<div>", { class: "page-year", text: parts[0] + "년" }))
      .append($("<div>", { class: "page-date", text: +parts[1] + "월 " + +parts[2] + "일" }))
      .append($("<div>", { class: "page-weekday", text: FULL_WEEKDAYS[date.getDay()] }));
    if (holiday) {
      $head.find(".page-weekday").append($("<span>", { class: "page-holiday", text: " · " + holiday }));
    }

    const $page = $("<article>", { class: "book-page" }).append($head);
    if (!entry.locked && entry.title && entry.title !== "일기") {
      $page.append($("<h3>", { class: "page-title", text: entry.title }));
    }
    $page.append(
      $("<div>", { class: "page-body" }).text(
        entry.locked ? "이 일기는 열 수 없습니다. 백업 파일에서 복원해 주세요." : entry.memo
      )
    );
    $page.append($("<footer>", { class: "page-num", text: String(number) }));
    return $page;
  }

  // ---------- 일기 잠금 / 백업 ----------
  $(document).on("change", 'input[name="eventType"]', function () {
    if (currentType() === "diary" && isLocked()) {
      $('input[name="eventType"][value="event"]').prop("checked", true);
      applyTypeUI("event");
      requireUnlock(function () {
        $('input[name="eventType"][value="diary"]').prop("checked", true);
        handleTypeChange();
      });
      return;
    }
    handleTypeChange();
  });

  $("#closeLock, [data-lock-close]").on("click", closeLockModal);
  $("#lockModal").on("click", function (e) {
    if (e.target === this) {
      closeLockModal();
    }
  });
  $("[data-lock-back]").on("click", function () {
    showLockSection("manage");
  });
  $("#lockNowBtn").on("click", lockNow);
  $("#lockChangeBtn").on("click", function () {
    showLockSection("change");
  });
  $("#lockDisableBtn").on("click", function () {
    showLockSection("disable");
  });

  $("#lockSetupForm").on("submit", async function (e) {
    e.preventDefault();
    const form = this;
    const pw = $("#lockNewPw").val();
    if (!CRYPTO_OK) {
      return showLockError("setup", CRYPTO_MSG);
    }
    if (pw.length < 6) {
      return showLockError("setup", "비밀번호는 6자 이상으로 입력해 주세요.");
    }
    if (pw !== $("#lockNewPw2").val()) {
      return showLockError("setup", "비밀번호 확인이 일치하지 않습니다.");
    }
    setLockBusy(form, true);
    try {
      const made = await createLockMeta(pw);
      const diaries = events.filter(isDiaryItem);
      for (const item of diaries) {
        item.enc = await encryptJson(made.key, { title: item.title, memo: item.memo });
      }
      writeAtomic([
        [LOCK_KEY, JSON.stringify(made.meta)],
        [STORAGE_KEY, JSON.stringify(serializeEvents(made.meta))],
      ]);
      lockMeta = made.meta;
      cryptoKey = made.key;
      closeLockModal();
      renderAll();
      toast("일기 잠금을 켰습니다. 일기 " + diaries.length + "개를 암호화했습니다.");
    } catch (error) {
      showLockError("setup", "잠금을 설정하지 못했습니다. 저장 공간을 확인해 주세요.");
    } finally {
      setLockBusy(form, false);
    }
  });

  $("#lockUnlockForm").on("submit", async function (e) {
    e.preventDefault();
    const form = this;
    if (!CRYPTO_OK) {
      return showLockError("unlock", CRYPTO_MSG);
    }
    setLockBusy(form, true);
    try {
      const key = await verifyPassword($("#lockUnlockPw").val(), lockMeta);
      if (!key) {
        return showLockError("unlock", "비밀번호가 맞지 않습니다.");
      }
      cryptoKey = key;
      const failed = await decryptAllDiaries(key);
      const callback = pendingUnlock && pendingUnlock.done;
      closeLockModal();
      renderAll();
      if (failed) {
        toast("일기 " + failed + "개는 열지 못했습니다. 백업 파일에서 복원해 보세요.");
      }
      if (callback) {
        callback();
      }
    } finally {
      setLockBusy(form, false);
    }
  });

  $("#lockChangeForm").on("submit", async function (e) {
    e.preventDefault();
    const form = this;
    const next = $("#lockChgPw").val();
    if (next.length < 6) {
      return showLockError("change", "새 비밀번호는 6자 이상으로 입력해 주세요.");
    }
    if (next !== $("#lockChgPw2").val()) {
      return showLockError("change", "새 비밀번호 확인이 일치하지 않습니다.");
    }
    setLockBusy(form, true);
    try {
      if (!(await verifyPassword($("#lockCurPw").val(), lockMeta))) {
        return showLockError("change", "현재 비밀번호가 맞지 않습니다.");
      }
      if (events.some(isUnreadableDiary)) {
        return showLockError("change", "열지 못한 일기가 있어 변경할 수 없습니다.");
      }
      const made = await createLockMeta(next);
      for (const item of events.filter(isDiaryItem)) {
        item.enc = await encryptJson(made.key, { title: item.title, memo: item.memo });
      }
      writeAtomic([
        [LOCK_KEY, JSON.stringify(made.meta)],
        [STORAGE_KEY, JSON.stringify(serializeEvents(made.meta))],
      ]);
      lockMeta = made.meta;
      cryptoKey = made.key;
      closeLockModal();
      renderAll();
      toast("비밀번호를 변경했습니다.");
    } catch (error) {
      showLockError("change", "비밀번호를 변경하지 못했습니다.");
    } finally {
      setLockBusy(form, false);
    }
  });

  $("#lockDisableForm").on("submit", async function (e) {
    e.preventDefault();
    const form = this;
    setLockBusy(form, true);
    try {
      if (!(await verifyPassword($("#lockOffPw").val(), lockMeta))) {
        return showLockError("disable", "현재 비밀번호가 맞지 않습니다.");
      }
      if (events.some(isUnreadableDiary)) {
        return showLockError("disable", "열지 못한 일기가 있어 해제할 수 없습니다.");
      }
      events.forEach(function (item) {
        delete item.enc;
      });
      writeAtomic([
        [LOCK_KEY, null],
        [STORAGE_KEY, JSON.stringify(serializeEvents(null))],
      ]);
      lockMeta = null;
      cryptoKey = null;
      closeLockModal();
      renderAll();
      toast("일기 잠금을 껐습니다.");
    } catch (error) {
      showLockError("disable", "잠금을 끄지 못했습니다.");
    } finally {
      setLockBusy(form, false);
    }
  });

  $("#importFile").on("change", function () {
    const file = this.files && this.files[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = function () {
      importBackup(String(reader.result));
    };
    reader.onerror = function () {
      alert("파일을 읽지 못했습니다.");
    };
    reader.readAsText(file);
  });

  function handleTypeChange() {
    applyTypeUI(currentType());
    const date = $("#eventDate").val();
    if (currentType() === "diary" && !$("#eventId").val() && findDiaryByDate(date)) {
      openEventModal({ date: date, type: "diary" });
    }
  }

  function isLocked() {
    return Boolean(lockMeta) && !cryptoKey;
  }

  function isDiaryItem(item) {
    return item.type === "diary";
  }

  function isUnreadableDiary(item) {
    return item.type === "diary" && item.locked;
  }

  function requireUnlock(done) {
    if (!isLocked()) {
      if (done) {
        done();
      }
      return;
    }
    pendingUnlock = { done: done || null };
    showLockSection("unlock");
  }

  function openLockFromMenu() {
    if (!CRYPTO_OK) {
      alert(CRYPTO_MSG);
      return;
    }
    if (!lockMeta) {
      showLockSection("setup");
    } else if (cryptoKey) {
      showLockSection("manage");
    } else {
      requireUnlock(openLockFromMenu);
    }
  }

  function showLockSection(name) {
    const titles = {
      setup: "일기 잠금 설정",
      unlock: "잠긴 일기",
      manage: "일기 잠금",
      change: "비밀번호 변경",
      disable: "잠금 사용 안 함",
    };
    $(".lock-section").prop("hidden", true);
    $(".lock-error").prop("hidden", true).text("");
    $("#lockModal input[type=password]").val("");
    $("#lockAck").prop("checked", false);
    $('.lock-section[data-section="' + name + '"]').prop("hidden", false);
    $("#lockTitle").text(titles[name]);
    if (name === "manage") {
      const count = events.filter(isDiaryItem).length;
      $("#lockStatus").text(
        "일기 잠금이 켜져 있고 지금은 열려 있습니다. 일기 " + count + "개가 암호화되어 저장됩니다."
      );
    }
    $("#lockModal").addClass("open").attr("aria-hidden", "false");
    setTimeout(function () {
      $('.lock-section[data-section="' + name + '"] input[type=password]').first().trigger("focus");
    }, 0);
  }

  function closeLockModal() {
    $("#lockModal").removeClass("open").attr("aria-hidden", "true");
    $("#lockModal input[type=password]").val("");
    pendingUnlock = null;
  }

  function showLockError(name, message) {
    $('.lock-section[data-section="' + name + '"] .lock-error').text(message).prop("hidden", false);
  }

  function setLockBusy(form, busy) {
    $(form).find("button[type=submit]").prop("disabled", busy);
  }

  function lockNow() {
    cryptoKey = null;
    events = loadEvents();
    closeLockModal();
    renderAll();
    toast("일기를 잠갔습니다.");
  }

  function renderLockMenu() {
    $('.menu-item[data-action="lock"]').text(
      lockMeta ? (cryptoKey ? "일기 잠금 · 열림" : "일기 잠금 · 잠김") : "일기 잠금 설정"
    );
  }

  function renderAll() {
    renderCalendar();
    renderUpcoming();
    if ($("#listModal").hasClass("open")) {
      renderAllEvents();
    }
    if ($("#dayModal").hasClass("open")) {
      renderDayModal();
    }
    renderLockMenu();
  }

  function toast(message) {
    const $t = $("#toast");
    $t.text(message).prop("hidden", false);
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () {
      $t.prop("hidden", true);
    }, 3500);
  }

  // ----- 암호화 (Web Crypto: PBKDF2 → AES-GCM) -----
  function bytesToB64(bytes) {
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(bin);
  }

  function b64ToBytes(text) {
    const bin = atob(text);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) {
      out[i] = bin.charCodeAt(i);
    }
    return out;
  }

  async function deriveKey(password, salt, iterations) {
    const base = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: salt, iterations: iterations, hash: "SHA-256" },
      base,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async function encryptJson(key, value) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      new TextEncoder().encode(JSON.stringify(value))
    );
    return { iv: bytesToB64(iv), data: bytesToB64(new Uint8Array(data)) };
  }

  async function decryptJson(key, box) {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: b64ToBytes(box.iv) },
      key,
      b64ToBytes(box.data)
    );
    return JSON.parse(new TextDecoder().decode(plain));
  }

  async function createLockMeta(password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveKey(password, salt, KDF_ITER);
    const verifier = await encryptJson(key, { ok: "daily-plan" });
    return {
      key: key,
      meta: { v: 1, kdf: "PBKDF2-SHA256", iter: KDF_ITER, salt: bytesToB64(salt), verifier: verifier },
    };
  }

  async function verifyPassword(password, meta) {
    try {
      const key = await deriveKey(password, b64ToBytes(meta.salt), meta.iter);
      const check = await decryptJson(key, meta.verifier);
      return check && check.ok === "daily-plan" ? key : null;
    } catch (error) {
      return null;
    }
  }

  async function decryptAllDiaries(key) {
    let failed = 0;
    for (const item of events) {
      if (item.type === "diary" && item.locked) {
        try {
          const body = await decryptJson(key, item.enc);
          item.title = body.title || "일기";
          item.memo = body.memo || "";
          item.locked = false;
        } catch (error) {
          failed += 1;
        }
      }
    }
    return failed;
  }

  function writeAtomic(pairs) {
    const previous = pairs.map(function (pair) {
      return localStorage.getItem(pair[0]);
    });
    try {
      pairs.forEach(function (pair) {
        if (pair[1] === null) {
          localStorage.removeItem(pair[0]);
        } else {
          localStorage.setItem(pair[0], pair[1]);
        }
      });
    } catch (error) {
      pairs.forEach(function (pair, index) {
        if (previous[index] === null) {
          localStorage.removeItem(pair[0]);
        } else {
          localStorage.setItem(pair[0], previous[index]);
        }
      });
      throw error;
    }
  }

  // ----- 백업 -----
  function exportBackup() {
    const data = {
      app: "daily-plan",
      version: 2,
      exportedAt: new Date().toISOString(),
      lock: lockMeta,
      events: serializeEvents(lockMeta),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "daily-plan-backup-" + formatDate(new Date()).replace(/-/g, "") + ".json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
    toast(
      lockMeta
        ? "백업 파일을 내려받았습니다. 일기는 암호화된 상태이며, 복원할 때 같은 비밀번호가 필요합니다."
        : "백업 파일을 내려받았습니다."
    );
  }

  function sanitizeEvent(raw) {
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!raw || typeof raw !== "object" || typeof raw.date !== "string" || !dateRe.test(raw.date)) {
      return null;
    }
    const id = raw.id === undefined || raw.id === null ? "" : String(raw.id);
    if (!id) {
      return null;
    }
    const isDiary = raw.type === "diary";
    const text = function (value, max) {
      return typeof value === "string" ? value.slice(0, max) : "";
    };
    const item = {
      id: id,
      type: isDiary ? "diary" : "event",
      date: raw.date,
      endDate:
        !isDiary && typeof raw.endDate === "string" && dateRe.test(raw.endDate) && raw.endDate > raw.date
          ? raw.endDate
          : "",
      title: text(raw.title, 100),
      time: typeof raw.time === "string" && /^\d{2}:\d{2}$/.test(raw.time) ? raw.time : "",
      memo: text(raw.memo, 20000),
      color: COLORS.some(function (c) {
        return c.key === raw.color;
      })
        ? raw.color
        : "coral",
      done: !isDiary && Boolean(raw.done),
    };
    if (isDiary) {
      item.color = "gray";
      if (raw.enc && typeof raw.enc.iv === "string" && typeof raw.enc.data === "string") {
        item.enc = { iv: raw.enc.iv, data: raw.enc.data };
        item.title = "";
        item.memo = "";
      }
    }
    return item;
  }

  function importBackup(text) {
    const invalid = "올바른 백업 파일이 아닙니다.";
    let data;
    try {
      data = JSON.parse(text);
    } catch (error) {
      alert(invalid);
      return;
    }
    const rawList = Array.isArray(data) ? data : data && data.events;
    if (!Array.isArray(rawList)) {
      alert(invalid);
      return;
    }

    let lock = Array.isArray(data) ? null : data.lock || null;
    if (lock) {
      const ok =
        typeof lock.salt === "string" &&
        lock.verifier &&
        typeof lock.verifier.iv === "string" &&
        typeof lock.verifier.data === "string" &&
        Number(lock.iter) >= 1000 &&
        Number(lock.iter) <= 5000000;
      if (!ok) {
        alert(invalid);
        return;
      }
      lock = {
        v: 1,
        kdf: "PBKDF2-SHA256",
        iter: Number(lock.iter),
        salt: lock.salt,
        verifier: { iv: lock.verifier.iv, data: lock.verifier.data },
      };
    }

    const seen = {};
    const list = [];
    rawList.forEach(function (raw) {
      const item = sanitizeEvent(raw);
      if (item && !seen[item.id]) {
        seen[item.id] = true;
        list.push(item);
      }
    });
    if (rawList.length && !list.length) {
      alert(invalid);
      return;
    }
    if (!lock && list.some(function (item) { return item.enc; })) {
      alert("암호화된 일기가 있지만 잠금 정보가 없어 가져올 수 없습니다.");
      return;
    }

    const diaryCount = list.filter(isDiaryItem).length;
    const ok = confirm(
      "현재 저장된 일정과 일기를 모두 지우고, 백업 파일의 내용(일정 " +
        (list.length - diaryCount) + "개, 일기 " + diaryCount + "개)으로 바꿉니다.\n" +
        (lock ? "일기는 백업을 만들 때의 비밀번호로 열 수 있습니다.\n" : "") +
        "계속할까요?"
    );
    if (!ok) {
      return;
    }

    try {
      writeAtomic([
        [LOCK_KEY, lock ? JSON.stringify(lock) : null],
        [STORAGE_KEY, JSON.stringify(list)],
      ]);
    } catch (error) {
      alert("가져오기에 실패했습니다. 브라우저 저장 공간을 확인해 주세요.");
      return;
    }
    lockMeta = lock;
    cryptoKey = null;
    events = loadEvents();
    renderAll();
    toast("백업을 가져왔습니다.");
  }

  function serializeEvent(item, meta) {
    if (item.type === "diary" && meta && item.enc) {
      return { id: item.id, type: "diary", date: item.date, enc: item.enc };
    }
    const copy = Object.assign({}, item);
    delete copy.locked;
    delete copy.enc;
    return copy;
  }

  function serializeEvents(meta) {
    return events.map(function (item) {
      return serializeEvent(item, meta);
    });
  }

  function loadLockMeta() {
    try {
      const meta = JSON.parse(localStorage.getItem(LOCK_KEY));
      return meta && meta.salt && meta.verifier && meta.iter ? meta : null;
    } catch (error) {
      return null;
    }
  }

  function goToday() {
    viewDate = new Date();
    renderCalendar();
  }

  function openDrawer() {
    renderUpcoming();
    $("#drawer").addClass("open").attr("aria-hidden", "false");
  }

  function closeDrawer() {
    $("#drawer").removeClass("open").attr("aria-hidden", "true");
  }

  function openEventModal(event) {
    event = event || {};
    if (event.type === "diary" && isLocked()) {
      const target = event;
      requireUnlock(function () {
        openEventModal((target.id && findEvent(target.id)) || target);
      });
      return;
    }
    let loadedDiary = false;
    if (!event.id && event.type === "diary") {
      const existing = findDiaryByDate(event.date || formatDate(new Date()));
      if (existing) {
        event = existing;
        loadedDiary = true;
      }
    }
    if (event.type === "diary" && event.locked) {
      alert("이 일기는 암호화되어 있어 열 수 없습니다. 백업 파일에서 복원해 주세요.");
      return;
    }
    const isEdit = Boolean(event.id);
    const type = event.type === "diary" ? "diary" : "event";
    $("#eventId").val(event.id || "");
    $('input[name="eventType"][value="' + type + '"]').prop("checked", true);
    $("#typeToggle").prop("hidden", isEdit);
    $("#diaryNotice").prop("hidden", !loadedDiary);
    applyTypeUI(type);
    $("#eventDate").val(event.date || formatDate(new Date()));
    $("#eventEndDate").val(event.endDate || "");
    syncEndDateMin();
    $("#eventTitle").val(event.title || "");
    setTimeFields(event.time || "");
    $("#eventMemo").val(event.memo || "");
    setColor(event.color || "coral");
    $("#eventDone").prop("checked", Boolean(event.done));
    $("#deleteEvent").toggle(isEdit);
    $("#listModal").removeClass("open").attr("aria-hidden", "true");
    $("#eventModal").addClass("open").attr("aria-hidden", "false");
  }

  function currentType() {
    return $('input[name="eventType"]:checked').val() || "event";
  }

  function applyTypeUI(type) {
    const isDiary = type === "diary";
    const isEdit = Boolean($("#eventId").val());
    $("#eventForm").toggleClass("diary-mode", isDiary);
    $(".type-option").removeClass("selected");
    $('input[name="eventType"]:checked').closest(".type-option").addClass("selected");
    $("#modalTitle").text(
      isDiary ? (isEdit ? "일기 수정" : "일기 쓰기") : isEdit ? "일정 수정" : "일정 추가"
    );
    $("#dateLabel").text(isDiary ? "날짜" : "시작일");
    $("#titleLabel").text(isDiary ? "제목 (선택)" : "제목");
    $("#eventTitle")
      .prop("required", !isDiary)
      .attr("placeholder", isDiary ? "비워 두면 '일기'로 저장됩니다" : "예: 팀 미팅");
    $("#memoLabel").text(isDiary ? "일기" : "메모");
    $("#eventMemo")
      .attr("rows", isDiary ? 9 : 3)
      .attr("placeholder", isDiary ? "오늘 하루를 간단히 정리해 보세요" : "간단한 메모");
  }

  function closeEventModal() {
    $("#eventModal").removeClass("open").attr("aria-hidden", "true");
    $("#eventForm")[0].reset();
    $("#eventId").val("");
    if ($("#dayModal").hasClass("open")) {
      renderDayModal();
    }
  }

  function openDayModal(key) {
    dayKey = key;
    renderDayModal();
    $("#dayModal").addClass("open").attr("aria-hidden", "false");
  }

  function closeDayModal() {
    $("#dayModal").removeClass("open").attr("aria-hidden", "true");
    dayKey = null;
  }

  function renderDayModal() {
    if (!dayKey) {
      return;
    }
    const parts = dayKey.split("-");
    const date = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    const holiday = HOLIDAYS[dayKey];
    $("#dayTitle").text(
      parts[0] + "년 " + +parts[1] + "월 " + +parts[2] + "일 (" + WEEKDAYS[date.getDay()] + ")" +
        (holiday ? " · " + holiday : "")
    );

    const diary = findDiaryByDate(dayKey);
    const dayEvents = events.filter(function (item) {
      return item.type !== "diary" && item.date <= dayKey && dayKey <= eventEnd(item);
    });
    // 하루 일정: 시간 있는 것(시간순) → 시간 없는 것, 그 아래에 기간 일정
    const singles = dayEvents
      .filter(function (item) {
        return eventEnd(item) === item.date;
      })
      .sort(function (a, b) {
        if (!a.time !== !b.time) {
          return a.time ? -1 : 1;
        }
        return (a.time || "").localeCompare(b.time || "");
      });
    const ranges = dayEvents
      .filter(function (item) {
        return eventEnd(item) > item.date;
      })
      .sort(function (a, b) {
        return a.date.localeCompare(b.date);
      });

    const $body = $("#dayBody").empty();
    if (diary) {
      $body.append(
        $("<div>", { class: "diary-card", "data-id": diary.id, role: "button", tabindex: 0 })
          .append(
            $("<div>", { class: "diary-card-head" })
              .append($("<span>", { class: "diary-icon" + (diary.locked ? " locked" : "") }))
              .append($("<strong>", { text: diary.locked ? "잠긴 일기" : diary.title || "일기" }))
          )
          .append(
            $("<p>", { class: "diary-text" }).text(
              diary.locked ? "비밀번호를 입력하면 볼 수 있습니다. 눌러서 여세요." : diary.memo
            )
          )
      );
    }

    $body.append($("<h4>", { text: "일정 " + singles.length + "개" }));
    if (!singles.length) {
      $body.append($("<p>", { class: "empty", text: "이 날짜에는 하루 일정이 없습니다." }));
    }
    singles.forEach(function (item) {
      $body.append(
        buildListRow(
          "all-event",
          item,
          escapeHtml((item.time ? item.time + " · " : "") + item.title)
        )
      );
    });

    if (ranges.length) {
      $body.append($("<h4>", { text: "기간 일정 " + ranges.length + "개" }));
      ranges.forEach(function (item) {
        $body.append(
          buildListRow(
            "all-event",
            item,
            escapeHtml(item.title + "  (" + item.date + " ~ " + eventEnd(item) + ")")
          )
        );
      });
    }

    $("#dayAddDiary").text(diary ? (diary.locked ? "일기 열기" : "일기 수정") : "일기 쓰기");
  }

  function findDiaryByDate(key) {
    return events.find(function (item) {
      return item.type === "diary" && item.date === key;
    });
  }

  function diaryPreview(item) {
    if (item.locked) {
      return "(잠김)";
    }
    const text = (item.memo || "").replace(/\s+/g, " ");
    const head = item.title && item.title !== "일기" ? item.title + " — " : "";
    return head + (text.length > 40 ? text.slice(0, 40) + "…" : text);
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function buildTimePicker() {
    const $hour = $("#timeHour");
    const $minute = $("#timeMinute");
    for (let h = 1; h <= 12; h += 1) {
      $hour.append($("<option>", { value: String(h), text: h + "시" }));
    }
    for (let m = 0; m < 60; m += 5) {
      $minute.append($("<option>", { value: pad2(m), text: pad2(m) + "분" }));
    }

    $("#timeAmpm").on("change", function () {
      const ampm = $(this).val();
      if (!ampm) {
        $hour.prop("disabled", true);
        $minute.prop("disabled", true);
        return;
      }
      if ($hour.prop("disabled")) {
        $hour.val(ampm === "am" ? "9" : "2");
        $minute.val("00");
      }
      $hour.prop("disabled", false);
      $minute.prop("disabled", false);
    });
  }

  function setTimeFields(time) {
    const $ampm = $("#timeAmpm");
    const $hour = $("#timeHour");
    const $minute = $("#timeMinute");
    $minute.find("option[data-custom]").remove();

    if (!time) {
      $ampm.val("");
      $hour.val("9").prop("disabled", true);
      $minute.val("00").prop("disabled", true);
      return;
    }

    const parts = time.split(":");
    const h24 = parseInt(parts[0], 10);
    const min = parts[1];

    // 5분 단위가 아닌 기존 값도 그대로 보존
    if ($minute.find('option[value="' + min + '"]').length === 0) {
      const $custom = $("<option>", { value: min, text: min + "분", "data-custom": "1" });
      const $next = $minute.find("option").filter(function () {
        return parseInt(this.value, 10) > parseInt(min, 10);
      }).first();
      if ($next.length) {
        $custom.insertBefore($next);
      } else {
        $minute.append($custom);
      }
    }

    $ampm.val(h24 >= 12 ? "pm" : "am");
    $hour.val(String(h24 % 12 || 12)).prop("disabled", false);
    $minute.val(min).prop("disabled", false);
  }

  function getTimeValue() {
    const ampm = $("#timeAmpm").val();
    if (!ampm) {
      return "";
    }
    let hour = parseInt($("#timeHour").val(), 10) % 12;
    if (ampm === "pm") {
      hour += 12;
    }
    return pad2(hour) + ":" + $("#timeMinute").val();
  }

  function buildColorPicker() {
    const $picker = $("#colorPicker");
    COLORS.forEach(function (color) {
      $picker.append(
        $("<label>", { class: "color-option" })
          .append($("<input>", { type: "radio", name: "eventColor", value: color.key }))
          .append($("<span>", { class: "swatch " + color.key }))
          .append($("<span>", { class: "color-name", text: color.label }))
      );
    });
    $picker.on("change", 'input[name="eventColor"]', function () {
      markSelectedColor();
    });
  }

  function setColor(key) {
    const valid = COLORS.some(function (color) {
      return color.key === key;
    });
    $('input[name="eventColor"][value="' + (valid ? key : "coral") + '"]').prop("checked", true);
    markSelectedColor();
  }

  function markSelectedColor() {
    $(".color-option").removeClass("selected");
    $('input[name="eventColor"]:checked').closest(".color-option").addClass("selected");
  }

  function getLaneConfig() {
    return window.matchMedia("(max-width: 720px)").matches
      ? { maxLanes: 2, laneHeight: 20 }
      : { maxLanes: 3, laneHeight: 22 };
  }

  function renderCalendar() {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    $("#monthLabel").text(year + "년 " + (month + 1) + "월");

    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();
    const todayKey = formatDate(new Date());
    const days = [];

    for (let i = startWeekday - 1; i >= 0; i -= 1) {
      days.push({ date: new Date(year, month - 1, prevDays - i), other: true });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      days.push({ date: new Date(year, month, day), other: false });
    }

    let nextDay = 1;
    while (days.length % 7 !== 0) {
      days.push({ date: new Date(year, month + 1, nextDay), other: true });
      nextDay += 1;
    }

    const config = getLaneConfig();
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(buildWeek(days.slice(i, i + 7), todayKey, config));
    }

    $("#calendarGrid").empty().append(weeks);
  }

  function compareEvents(a, b) {
    const aLen = daysBetween(a.date, eventEnd(a));
    const bLen = daysBetween(b.date, eventEnd(b));
    const aMulti = aLen > 0 ? 0 : 1;
    const bMulti = bLen > 0 ? 0 : 1;
    if (aMulti !== bMulti) {
      return aMulti - bMulti;
    }
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    if (aLen !== bLen) {
      return bLen - aLen;
    }
    return (a.time || "").localeCompare(b.time || "");
  }

  function daysBetween(startKey, endKey) {
    const s = startKey.split("-");
    const e = endKey.split("-");
    const start = Date.UTC(+s[0], +s[1] - 1, +s[2]);
    const end = Date.UTC(+e[0], +e[1] - 1, +e[2]);
    return Math.round((end - start) / 86400000);
  }

  function buildWeek(week, todayKey, config) {
    const keys = week.map(function (d) {
      return formatDate(d.date);
    });
    const weekStart = keys[0];
    const weekEnd = keys[6];

    const segments = events
      .filter(function (item) {
        return item.type !== "diary" && item.date <= weekEnd && eventEnd(item) >= weekStart;
      })
      .sort(compareEvents)
      .map(function (item) {
        const end = eventEnd(item);
        return {
          item: item,
          c1: item.date <= weekStart ? 0 : keys.indexOf(item.date),
          c2: end >= weekEnd ? 6 : keys.indexOf(end),
          cutLeft: item.date < weekStart,
          cutRight: end > weekEnd,
        };
      });

    // 겹치지 않는 가장 위쪽 줄(lane)에 막대를 배치
    const lanes = [];
    const more = [0, 0, 0, 0, 0, 0, 0];
    segments.forEach(function (seg) {
      let lane = 0;
      while (true) {
        lanes[lane] = lanes[lane] || [false, false, false, false, false, false, false];
        let free = true;
        for (let c = seg.c1; c <= seg.c2; c += 1) {
          if (lanes[lane][c]) {
            free = false;
            break;
          }
        }
        if (free) {
          break;
        }
        lane += 1;
      }
      for (let c = seg.c1; c <= seg.c2; c += 1) {
        lanes[lane][c] = true;
      }
      seg.lane = lane;
      if (lane >= config.maxLanes) {
        for (let c = seg.c1; c <= seg.c2; c += 1) {
          more[c] += 1;
        }
      }
    });

    const visibleLanes = Math.min(config.maxLanes, lanes.length);
    const diaries = keys.map(function (key) {
      return findDiaryByDate(key);
    });
    const hasFooter =
      diaries.some(Boolean) ||
      more.some(function (count) {
        return count > 0;
      });
    const rows =
      "28px " +
      (visibleLanes > 0 ? "repeat(" + visibleLanes + ", " + config.laneHeight + "px) " : "") +
      (hasFooter ? "minmax(24px, auto)" : "auto");
    const $week = $("<div>", { class: "week" }).css("grid-template-rows", rows);

    week.forEach(function (d, index) {
      const key = keys[index];
      const dow = d.date.getDay();
      const holidayName = HOLIDAYS[key];
      const $cell = $("<button>", {
        type: "button",
        class:
          "day-cell" +
          (d.other ? " other" : "") +
          (key === todayKey ? " today" : "") +
          (dow === 0 ? " sun" : "") +
          (dow === 6 ? " sat" : "") +
          (index === 6 ? " last-col" : "") +
          (holidayName ? " holiday" : ""),
        "data-date": key,
      }).css("grid-column", String(index + 1));

      $cell.append($("<span>", { class: "day-num", text: d.date.getDate() }));
      if (holidayName) {
        $cell.append($("<span>", { class: "holiday-name", text: holidayName }));
      }
      $week.append($cell);
    });

    segments.forEach(function (seg) {
      if (seg.lane >= config.maxLanes) {
        return;
      }
      const item = seg.item;
      $week.append(
        $("<span>", {
          class:
            "event-chip " +
            item.color +
            (seg.cutLeft ? " cut-left" : "") +
            (seg.cutRight ? " cut-right" : "") +
            (item.done ? " done" : ""),
          text:
            (item.done ? "✓ " : "") +
            (item.time && !seg.cutLeft ? item.time + " " : "") +
            item.title,
          title: item.title,
          "data-id": item.id,
        }).css({
          "grid-row": String(seg.lane + 2),
          "grid-column": seg.c1 + 1 + " / span " + (seg.c2 - seg.c1 + 1),
        })
      );
    });

    week.forEach(function (d, index) {
      const diary = diaries[index];
      if (diary) {
        $week.append(
          $("<button>", {
            type: "button",
            class: "diary-mark" + (diary.locked ? " locked" : ""),
            "data-id": diary.id,
            title: diary.locked ? "잠긴 일기" : "일기: " + diaryPreview(diary),
            "aria-label": "일기 보기",
          }).css({
            "grid-row": String(visibleLanes + 2),
            "grid-column": String(index + 1),
          })
        );
      }
    });

    more.forEach(function (count, index) {
      if (count > 0) {
        $week.append(
          $("<button>", {
            type: "button",
            class: "more-count",
            text: "+" + count,
            title: "이 날의 일정 모두 보기",
            "data-date": keys[index],
          }).css({
            "grid-row": String(visibleLanes + 2),
            "grid-column": String(index + 1),
          })
        );
      }
    });

    return $week;
  }

  function renderUpcoming() {
    const todayKey = formatDate(new Date());
    const upcoming = events
      .filter(function (item) {
        return item.type !== "diary" && eventEnd(item) >= todayKey && !item.done;
      })
      .sort(function (a, b) {
        return (a.date + (a.time || "")).localeCompare(b.date + (b.time || ""));
      })
      .slice(0, 4);

    const $list = $("#upcomingList").empty().append("<h3>다가오는 일정</h3>");
    if (!upcoming.length) {
      $list.append($("<p>", { class: "empty", text: "등록된 일정이 없습니다." }));
      return;
    }

    upcoming.forEach(function (item) {
      $list.append(
        buildListRow(
          "upcoming-item",
          item,
          "<strong>" + escapeHtml(item.title) + "</strong><br>" + formatRange(item) + (item.time ? " " + item.time : "")
        )
      );
    });
  }

  function renderAllEvents() {
    const grouped = {};
    events
      .filter(function (item) {
        return item.type !== "diary";
      })
      .sort(function (a, b) {
        return (a.date + (a.time || "")).localeCompare(b.date + (b.time || ""));
      })
      .forEach(function (item) {
        grouped[item.date] = grouped[item.date] || [];
        grouped[item.date].push(item);
      });

    const $wrap = $("#allEvents").empty();
    const dates = Object.keys(grouped);
    if (!dates.length) {
      $wrap.append($("<p>", { class: "empty", text: "등록된 일정이 없습니다." }));
      return;
    }

    dates.forEach(function (date) {
      $wrap.append($("<h4>", { text: date }));
      grouped[date].forEach(function (item) {
        $wrap.append(
          buildListRow(
            "all-event",
            item,
            escapeHtml(
              (item.time ? item.time + " · " : "") +
                item.title +
                (eventEnd(item) > item.date ? "  (~ " + eventEnd(item) + ")" : "")
            )
          )
        );
      });
    });
  }

  function buildListRow(className, item, html) {
    const isDiary = item.type === "diary";
    const $row = $("<div>", {
      class: className + (item.done ? " done" : "") + (isDiary ? " diary-row" : ""),
      "data-id": item.id,
      role: "button",
      tabindex: 0,
    });
    if (isDiary) {
      $row.append($("<span>", { class: "diary-icon" + (item.locked ? " locked" : "") }));
    } else {
      $row
        .append(
          $("<input>", {
            type: "checkbox",
            class: "done-toggle",
            "data-id": item.id,
            "aria-label": "완료 처리",
          }).prop("checked", Boolean(item.done))
        )
        .append($("<span>", { class: "swatch " + item.color }));
    }
    return $row.append($("<span>", { class: "row-text", html: html }));
  }

  function eventEnd(item) {
    return item.endDate && item.endDate > item.date ? item.endDate : item.date;
  }

  function formatRange(item) {
    return eventEnd(item) > item.date ? item.date + " ~ " + eventEnd(item) : item.date;
  }

  function syncEndDateMin() {
    const start = $("#eventDate").val();
    $("#eventEndDate").attr("min", start || "");
    if (start && $("#eventEndDate").val() && $("#eventEndDate").val() < start) {
      $("#eventEndDate").val("");
    }
  }

  function findEvent(id) {
    return events.find(function (item) {
      return item.id === String(id);
    });
  }

  function loadEvents() {
    let list;
    try {
      list = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (error) {
      return [];
    }
    if (!Array.isArray(list)) {
      return [];
    }
    return list.map(function (item) {
      if (item && item.type === "diary" && item.enc) {
        return {
          id: String(item.id),
          type: "diary",
          date: item.date,
          endDate: "",
          title: "",
          time: "",
          memo: "",
          color: "gray",
          done: false,
          enc: item.enc,
          locked: true,
        };
      }
      return item;
    });
  }

  function saveEvents() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeEvents(lockMeta)));
      return true;
    } catch (error) {
      alert("저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.");
      return false;
    }
  }

  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  function escapeHtml(text) {
    return $("<div>").text(text).html();
  }
});
