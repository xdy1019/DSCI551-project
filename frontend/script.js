const BASE_URL = "http://127.0.0.1:8000";

const DATE_RANGE_PAGE_SIZE = 20;
let dateRangeData = [];
let dateRangeCurrentPage = 1;

function showToast(message, isError = false) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.remove("hidden");
    toast.style.background = isError ? "#dc2626" : "#111827";

    setTimeout(() => {
        toast.classList.add("hidden");
    }, 3000);
}

function clearTableBody(tableId) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    tbody.innerHTML = "";
    return tbody;
}

function renderEmptyRow(tbody, colSpan, message = "No results found.") {
    tbody.innerHTML = `<tr><td colspan="${colSpan}" class="empty-state">${message}</td></tr>`;
}

function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
        let detail = `Request failed with status ${response.status}`;
        try {
            const err = await response.json();
            if (err.detail) {
                detail =
                    typeof err.detail === "string"
                        ? err.detail
                        : JSON.stringify(err.detail);
            }
        } catch (_) { }
        throw new Error(detail);
    }
    return response.json();
}

function showExplain(boxId, textId, explainText) {
    const box = document.getElementById(boxId);
    const text = document.getElementById(textId);

    text.textContent = explainText;
    box.classList.remove("hidden");
}

async function loadStats() {
    try {
        const data = await fetchJson(`${BASE_URL}/transactions/stats`);
        const tbody = clearTableBody("statsTable");

        if (!data.length) {
            renderEmptyRow(tbody, 2);
            return;
        }

        tbody.innerHTML = data
            .map(
                (row) => `
        <tr>
          <td>${escapeHtml(row.stock)}</td>
          <td>${escapeHtml(row.total_transactions)}</td>
        </tr>
      `
            )
            .join("");

        const explainData = await fetchJson(`${BASE_URL}/transactions/stats/explain`);
        showExplain("statsExplainBox", "statsExplainText", explainData.explain);
    } catch (error) {
        showToast(error.message, true);
    }
}

async function loadUserTrades(userId) {
    try {
        const data = await fetchJson(
            `${BASE_URL}/transactions/${encodeURIComponent(userId)}`
        );
        const tbody = clearTableBody("userTradesTable");

        if (!data.length) {
            renderEmptyRow(tbody, 7);
            return;
        }

        tbody.innerHTML = data
            .map(
                (row) => `
        <tr>
          <td>${escapeHtml(row.id)}</td>
          <td>${escapeHtml(row.user_id)}</td>
          <td>${escapeHtml(row.stock)}</td>
          <td>${escapeHtml(row.price)}</td>
          <td>${escapeHtml(row.quantity)}</td>
          <td>${escapeHtml(row.side)}</td>
          <td>${escapeHtml(row.timestamp)}</td>
        </tr>
      `
            )
            .join("");

        const explainData = await fetchJson(
            `${BASE_URL}/transactions/recent/explain?user_id=${encodeURIComponent(userId)}`
        );
        showExplain("userTradesExplainBox", "userTradesExplainText", explainData.explain);
    } catch (error) {
        showToast(error.message, true);
    }
}

function renderDateRangePage(page) {
    const tbody = clearTableBody("dateRangeTable");

    if (!dateRangeData.length) {
        renderEmptyRow(tbody, 7);

        document.getElementById("datePageInfo").textContent = "Page 0 of 0";

        const recordInfo = document.getElementById("dateRecordInfo");
        recordInfo.classList.add("hidden");

        document.getElementById("datePrevBtn").disabled = true;
        document.getElementById("dateNextBtn").disabled = true;

        return;
    }

    const totalPages = Math.ceil(dateRangeData.length / DATE_RANGE_PAGE_SIZE);
    dateRangeCurrentPage = Math.max(1, Math.min(page, totalPages));

    const startIndex = (dateRangeCurrentPage - 1) * DATE_RANGE_PAGE_SIZE;
    const endIndex = startIndex + DATE_RANGE_PAGE_SIZE;
    const pageRows = dateRangeData.slice(startIndex, endIndex);

    const showingStart = startIndex + 1;
    const showingEnd = Math.min(endIndex, dateRangeData.length);

    const recordInfo = document.getElementById("dateRecordInfo");
    recordInfo.textContent =
        `Showing ${showingStart}-${showingEnd} of ${dateRangeData.length} records`;
    recordInfo.classList.remove("hidden");

    tbody.innerHTML = pageRows
        .map(
            (row) => `
      <tr>
        <td>${escapeHtml(row.id)}</td>
        <td>${escapeHtml(row.user_id)}</td>
        <td>${escapeHtml(row.stock)}</td>
        <td>${escapeHtml(row.price)}</td>
        <td>${escapeHtml(row.quantity)}</td>
        <td>${escapeHtml(row.side)}</td>
        <td>${escapeHtml(row.timestamp)}</td>
      </tr>
    `
        )
        .join("");

    document.getElementById(
        "datePageInfo"
    ).textContent = `Page ${dateRangeCurrentPage} of ${totalPages}`;

    document.getElementById("datePrevBtn").disabled = dateRangeCurrentPage === 1;
    document.getElementById("dateNextBtn").disabled =
        dateRangeCurrentPage === totalPages;
}

async function loadDateRangeTrades(start, end) {
    try {
        const url = `${BASE_URL}/transactions/by-date?start=${encodeURIComponent(
            start
        )}&end=${encodeURIComponent(end)}`;
        const data = await fetchJson(url);

        dateRangeData = data;
        dateRangeCurrentPage = 1;
        renderDateRangePage(1);

        const explainUrl = `${BASE_URL}/transactions/by-date/explain?start=${encodeURIComponent(
            start
        )}&end=${encodeURIComponent(end)}`;

        const explainData = await fetchJson(explainUrl);
        showExplain("dateRangeExplainBox", "dateRangeExplainText", explainData.explain);
    } catch (error) {
        showToast(error.message, true);
    }
}

function setupDateRangePagination() {
    document.getElementById("datePrevBtn").addEventListener("click", () => {
        if (dateRangeCurrentPage > 1) {
            renderDateRangePage(dateRangeCurrentPage - 1);
        }
    });

    document.getElementById("dateNextBtn").addEventListener("click", () => {
        const totalPages = Math.ceil(dateRangeData.length / DATE_RANGE_PAGE_SIZE);
        if (dateRangeCurrentPage < totalPages) {
            renderDateRangePage(dateRangeCurrentPage + 1);
        }
    });
}

async function loadStockDateTrades(stock, tradeDate) {
    try {
        const url = `${BASE_URL}/transactions/by-stock-date?stock=${encodeURIComponent(
            stock
        )}&trade_date=${encodeURIComponent(tradeDate)}`;
        const data = await fetchJson(url);
        const tbody = clearTableBody("stockDateTable");

        if (!data.length) {
            renderEmptyRow(tbody, 7);
            return;
        }

        tbody.innerHTML = data
            .map(
                (row) => `
        <tr>
          <td>${escapeHtml(row.id)}</td>
          <td>${escapeHtml(row.user_id)}</td>
          <td>${escapeHtml(row.stock)}</td>
          <td>${escapeHtml(row.price)}</td>
          <td>${escapeHtml(row.quantity)}</td>
          <td>${escapeHtml(row.side)}</td>
          <td>${escapeHtml(row.timestamp)}</td>
        </tr>
      `
            )
            .join("");

        const explainUrl = `${BASE_URL}/transactions/by-stock-date/explain?stock=${encodeURIComponent(
            stock
        )}&trade_date=${encodeURIComponent(tradeDate)}`;

        const explainData = await fetchJson(explainUrl);
        showExplain("stockDateExplainBox", "stockDateExplainText", explainData.explain);
    } catch (error) {
        showToast(error.message, true);
    }
}

async function loadHoldings(userId, endDate) {
    try {
        const url = `${BASE_URL}/transactions/holdings?user_id=${encodeURIComponent(
            userId
        )}&end=${encodeURIComponent(endDate)}`;
        const data = await fetchJson(url);
        const tbody = clearTableBody("holdingsTable");

        if (!data.length) {
            renderEmptyRow(tbody, 2);
            return;
        }

        tbody.innerHTML = data
            .map(
                (row) => `
        <tr>
          <td>${escapeHtml(row.stock)}</td>
          <td>${escapeHtml(row.shares_held)}</td>
        </tr>
      `
            )
            .join("");

        const explainUrl = `${BASE_URL}/transactions/holdings/explain?user_id=${encodeURIComponent(
            userId
        )}&end=${encodeURIComponent(endDate)}`;

        const explainData = await fetchJson(explainUrl);
        showExplain("holdingsExplainBox", "holdingsExplainText", explainData.explain);
    } catch (error) {
        showToast(error.message, true);
    }
}

async function insertTransaction(payload) {
    try {
        const data = await fetchJson(`${BASE_URL}/transactions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        const resultBox = document.getElementById("insertResult");
        resultBox.classList.remove("hidden");
        resultBox.textContent = `Inserted successfully:\n${JSON.stringify(
            data,
            null,
            2
        )}`;

        showToast("Transaction inserted successfully.");
    } catch (error) {
        showToast(error.message, true);
    }
}

document.getElementById("loadStatsBtn").addEventListener("click", loadStats);

document
    .getElementById("userTradesForm")
    .addEventListener("submit", (e) => {
        e.preventDefault();
        const userId = document.getElementById("userIdInput").value.trim();
        if (!userId) return;
        loadUserTrades(userId);
    });

document
    .getElementById("dateRangeForm")
    .addEventListener("submit", (e) => {
        e.preventDefault();
        const start = document.getElementById("startDateInput").value;
        const end = document.getElementById("endDateInput").value;
        if (!start || !end) return;
        loadDateRangeTrades(start, end);
    });

document
    .getElementById("stockDateForm")
    .addEventListener("submit", (e) => {
        e.preventDefault();
        const stock = document.getElementById("stockInput").value
            .trim()
            .toUpperCase();
        const tradeDate = document.getElementById("tradeDateInput").value;
        if (!stock || !tradeDate) return;
        loadStockDateTrades(stock, tradeDate);
    });

document
    .getElementById("holdingsForm")
    .addEventListener("submit", (e) => {
        e.preventDefault();
        const userId = document.getElementById("holdingUserIdInput").value.trim();
        const endDate = document.getElementById("holdingDateInput").value;
        if (!userId || !endDate) return;
        loadHoldings(userId, endDate);
    });

document
    .getElementById("insertTradeForm")
    .addEventListener("submit", (e) => {
        e.preventDefault();

        const payload = {
            user_id: Number(document.getElementById("newUserId").value),
            stock: document.getElementById("newStock").value.trim().toUpperCase(),
            price: Number(document.getElementById("newPrice").value),
            quantity: Number(document.getElementById("newQuantity").value),
            side: document.getElementById("newSide").value,
            timestamp: document.getElementById("newTimestamp").value,
        };

        insertTransaction(payload);
    });

window.addEventListener("DOMContentLoaded", () => {
    setupDateRangePagination();
});