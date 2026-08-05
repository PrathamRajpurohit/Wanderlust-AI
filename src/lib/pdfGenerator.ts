import { IDay } from "./agent/types";

function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCost(cost: number, currency = "INR"): string {
  const symbols: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };
  const symbol = symbols[currency] || currency;
  return `${symbol}${cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

// 1. Shared clean CSS stylesheet
const printStyles = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  body, .pdf-container {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    color: #1e293b;
    background: #fff;
    line-height: 1.5;
  }
  
  /* Header section styling */
  .header {
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 24px;
    margin-bottom: 32px;
  }
  .header-brand {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.1em;
    color: #0ea5e9;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .header-title {
    font-size: 28px;
    font-weight: 800;
    color: #0f172a;
    margin-bottom: 8px;
  }
  .header-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
    font-size: 14px;
    color: #64748b;
    font-weight: 500;
  }
  .meta-item strong {
    color: #1e293b;
  }
  
  /* Day-by-Day timeline styling */
  .day-container {
    margin-bottom: 32px;
    page-break-inside: avoid;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    overflow: hidden;
  }
  .day-header {
    background: #f8fafc;
    padding: 16px 24px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .day-title-box {
    display: flex;
    flex-direction: column;
  }
  .day-badge {
    font-size: 11px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .day-theme {
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
    margin-top: 2px;
  }
  .day-meta-right {
    text-align: right;
  }
  .day-date {
    font-size: 13px;
    font-weight: 600;
    color: #0f172a;
  }
  .day-weather {
    font-size: 12px;
    color: #64748b;
    margin-top: 2px;
  }
  
  /* Content section */
  .day-body {
    padding: 24px;
  }
  .section {
    margin-bottom: 20px;
  }
  .section:last-child {
    margin-bottom: 0;
  }
  .section-title {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #64748b;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 4px;
  }
  .item {
    margin-bottom: 8px;
    font-size: 14px;
  }
  .item:last-child {
    margin-bottom: 0;
  }
  .item-header {
    display: flex;
    justify-content: space-between;
    font-weight: 600;
    color: #1e293b;
  }
  .item-details {
    font-size: 12px;
    color: #64748b;
    margin-top: 2px;
  }
  
  /* Cost badges */
  .day-footer {
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    padding: 12px 24px;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    font-size: 13px;
    font-weight: 600;
  }
  .day-estimate-label {
    color: #64748b;
    margin-right: 8px;
  }
  .day-estimate-value {
    color: #0f172a;
    font-size: 15px;
    font-weight: 700;
  }
  
  /* Footer brand */
  .footer {
    margin-top: 48px;
    text-align: center;
    font-size: 11px;
    color: #94a3b8;
    border-top: 1px solid #e2e8f0;
    padding-top: 16px;
  }
  
  /* Print optimizations */
  @media print {
    body {
      padding: 0;
    }
    .day-container {
      page-break-inside: avoid;
    }
  }
`;

// 2. Shared HTML body content generator
function generateItineraryBodyHTML(
  destination: string,
  formattedStart: string,
  formattedEnd: string,
  formattedTotal: string,
  currency: string,
  itinerary: IDay[]
): string {
  return `
    <div class="header">
      <div class="header-brand">Wanderlust AI Itinerary</div>
      <h1 class="header-title">${destination}</h1>
      <div class="header-meta">
        <div class="meta-item">Dates: <strong>${formattedStart} — ${formattedEnd}</strong></div>
        <div class="meta-item">Total Cost: <strong>${formattedTotal}</strong></div>
      </div>
    </div>

    <div class="itinerary-list">
      ${itinerary
        .map(
          (day) => `
        <div class="day-container">
          <div class="day-header">
            <div class="day-title-box">
              <div class="day-badge">Day ${day.day}</div>
              <div class="day-theme">${day.theme}</div>
            </div>
            <div class="day-meta-right">
              <div class="day-date">${day.date}</div>
              ${
                day.weather
                  ? `<div class="day-weather">🌤️ ${day.weather.condition} (${day.weather.temperature})</div>`
                  : ""
              }
            </div>
          </div>
          
          <div class="day-body">
            ${
              day.hotel
                ? `
              <div class="section">
                <div class="section-title">🏨 Hotel</div>
                <div class="item">
                  <div class="item-header">
                    <span>${day.hotel.name}</span>
                    <span>${formatCost(day.hotel.pricePerNight, currency)}/night</span>
                  </div>
                  <div class="item-details">Rating: ⭐ ${day.hotel.rating}</div>
                </div>
              </div>
            `
                : ""
            }

            ${
              day.flights && day.flights.length > 0
                ? `
              <div class="section">
                <div class="section-title">✈️ Flights</div>
                ${day.flights
                  .map(
                    (flight) => `
                  <div class="item">
                    <div class="item-header">
                      <span>${flight.from} → ${flight.to}</span>
                      <span>${formatCost(flight.estimatedCost, currency)}</span>
                    </div>
                    <div class="item-details">${flight.airline}</div>
                  </div>
                `
                  )
                  .join("")}
              </div>
            `
                : ""
            }

            ${
              day.restaurants && day.restaurants.length > 0
                ? `
              <div class="section">
                <div class="section-title">🍽️ Restaurants</div>
                ${day.restaurants
                  .map(
                    (r) => `
                  <div class="item">
                    <div class="item-header">
                      <span>${r.name}</span>
                      <span>Est: ${formatCost(r.avgCost, currency)}</span>
                    </div>
                    <div class="item-details">Cuisine: ${r.cuisine}</div>
                  </div>
                `
                  )
                  .join("")}
              </div>
            `
                : ""
            }

            ${
              day.attractions && day.attractions.length > 0
                ? `
              <div class="section">
                <div class="section-title">🎪 Attractions</div>
                ${day.attractions
                  .map(
                    (a) => `
                  <div class="item">
                    <div class="item-header">
                      <span>${a.name}</span>
                      <span>Entry: ${formatCost(a.entryFee, currency)}</span>
                    </div>
                    <div class="item-details">Duration: ${a.duration}</div>
                  </div>
                `
                  )
                  .join("")}
              </div>
            `
                : ""
            }
          </div>

          <div class="day-footer">
            <span class="day-estimate-label">Daily Estimate:</span>
            <span class="day-estimate-value">${formatCost(day.dailyEstimate, currency)}</span>
          </div>
        </div>
      `
        )
        .join("")}
    </div>

    <div class="footer">
      Generated using Wanderlust AI — Your Travel Companion.
    </div>
  `;
}

export function exportToPDF(
  destination: string,
  startDate: string | Date,
  endDate: string | Date,
  totalCost: number | null,
  currency: string,
  itinerary: IDay[]
) {
  if (typeof window === "undefined") return;

  const formattedStart = formatDate(startDate);
  const formattedEnd = formatDate(endDate);
  const formattedTotal = totalCost != null ? formatCost(totalCost, currency) : "N/A";

  const bodyContent = generateItineraryBodyHTML(
    destination,
    formattedStart,
    formattedEnd,
    formattedTotal,
    currency,
    itinerary
  );

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Itinerary - ${destination}</title>
        <meta charset="utf-8">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          ${printStyles}
          body {
            padding: 40px;
          }
          @media print {
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        ${bodyContent}
      </body>
    </html>
  `;

  // Create high-fidelity printing iframe
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(htmlContent);
    doc.close();

    // Small delay to ensure styles and web fonts are fully loaded
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      // Remove the iframe after a short delay so the print job fires first
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 500);
  }
}

export async function downloadPDF(
  destination: string,
  startDate: string | Date,
  endDate: string | Date,
  totalCost: number | null,
  currency: string,
  itinerary: IDay[]
) {
  if (typeof window === "undefined") return;

  const formattedStart = formatDate(startDate);
  const formattedEnd = formatDate(endDate);
  const formattedTotal = totalCost != null ? formatCost(totalCost, currency) : "N/A";

  const bodyContent = generateItineraryBodyHTML(
    destination,
    formattedStart,
    formattedEnd,
    formattedTotal,
    currency,
    itinerary
  );

  try {
    // Dynamically load html2pdf.js on the client side
    const html2pdf = (await import("html2pdf.js")).default;

    // Create an invisible wrapper positioned inside the visible viewport so browser computes dimensions correctly
    const wrapper = document.createElement("div");
    wrapper.style.position = "fixed";
    wrapper.style.left = "0";
    wrapper.style.top = "0";
    wrapper.style.zIndex = "-9999";
    wrapper.style.width = "750px"; // fits A4 width nicely
    wrapper.style.background = "#ffffff";
    document.body.appendChild(wrapper);

    // Create a temporary container inside the wrapper.
    // Since this element has no fixed positioning/z-index, html2canvas will clone and render it correctly.
    const container = document.createElement("div");
    container.className = "pdf-container";
    container.innerHTML = `
      <style>
        ${printStyles}
        .pdf-container {
          padding: 30px;
          background: #ffffff;
        }
      </style>
      ${bodyContent}
    `;
    wrapper.appendChild(container);

    // Wait for the browser to perform layout and style evaluation
    await new Promise((resolve) => setTimeout(resolve, 250));
    console.log("PDF Container rendering height:", container.offsetHeight);

    const opt = {
      margin: 10,
      filename: `itinerary-${destination.toLowerCase().replace(/[^a-z0-9]/g, "-")}.pdf`,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
      pagebreak: { mode: ["avoid-all", "css"] }
    };

    // Run the direct download
    await html2pdf().from(container).set(opt).save();
    document.body.removeChild(wrapper);
  } catch (error) {
    console.error("Direct PDF download failed:", error);
    // Fallback: trigger standard printing dialog if direct download crashes
    exportToPDF(destination, startDate, endDate, totalCost, currency, itinerary);
  }
}
