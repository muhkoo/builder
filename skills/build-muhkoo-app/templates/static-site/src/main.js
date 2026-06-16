/**
 * Static-site entry. The only dynamic behavior in the baseline is the optional
 * email-capture form, wired to a Muhkoo serverless function (functions/subscribe.js).
 *
 * Set `VITE_SUBSCRIBE_URL` in `.env.local` to the deployed function URL
 * (e.g. https://subscribe--<slug>.fns.muhkoo.dev). When it's unset the form
 * stays hidden, so the site works with or without the function.
 */
const SUBSCRIBE_URL = import.meta.env.VITE_SUBSCRIBE_URL;

const form = document.getElementById("signup");
const emailInput = document.getElementById("signup-email");
const status = document.getElementById("signup-status");

if (form && SUBSCRIBE_URL) {
  form.hidden = false;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = emailInput.value.trim();
    if (!email) return;

    setStatus("Submitting…", "");
    form.querySelector("button").disabled = true;

    try {
      const res = await fetch(SUBSCRIBE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus(data.message || "You're on the list. Thanks!", "ok");
        form.reset();
      } else {
        setStatus(data.error || "Something went wrong. Try again.", "err");
      }
    } catch {
      setStatus("Network error. Try again.", "err");
    } finally {
      form.querySelector("button").disabled = false;
    }
  });
}

function setStatus(message, kind) {
  if (!status) return;
  status.textContent = message;
  status.dataset.kind = kind;
}
