// The strftime formatter behind the footer's "Page last modified" line
// (template.mjs's renderFooterLegal; PLAN-4.md §6.4).

const STRFTIME_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const STRFTIME_DAYS_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const STRFTIME_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const STRFTIME_MONTHS_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Implements the tokens the project's last_edit_time_format actually
// uses (`%b %e %Y at %I:%M %p`), plus the common companions Liquid's
// `date` filter supports. Throws on unknown tokens so a future format
// change surfaces immediately.
export function formatDate(input, format) {
  const d = parseDate(input);
  if (!d) return "";
  const pad2 = (n) => String(n).padStart(2, "0");
  return format.replace(/%(.)/g, (_, t) => {
    switch (t) {
      case "a":
        return STRFTIME_DAYS_ABBR[d.getDay()];
      case "A":
        return STRFTIME_DAYS[d.getDay()];
      case "b":
        return STRFTIME_MONTHS_ABBR[d.getMonth()];
      case "B":
        return STRFTIME_MONTHS[d.getMonth()];
      case "d":
        return pad2(d.getDate());
      case "e":
        return String(d.getDate()).padStart(2, " ");
      case "H":
        return pad2(d.getHours());
      case "I":
        return pad2(((d.getHours() + 11) % 12) + 1);
      case "j": {
        // Calendar days, counted in UTC so a DST change cannot shorten one.
        const day = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
        const n = (day - Date.UTC(d.getFullYear(), 0, 1)) / 86400000 + 1;
        return String(n).padStart(3, "0");
      }
      case "m":
        return pad2(d.getMonth() + 1);
      case "M":
        return pad2(d.getMinutes());
      case "p":
        return d.getHours() < 12 ? "AM" : "PM";
      case "S":
        return pad2(d.getSeconds());
      case "y":
        return pad2(d.getFullYear() % 100);
      case "Y":
        return String(d.getFullYear());
      case "%":
        return "%";
      default:
        throw new Error(`Unsupported strftime token: %${t}`);
    }
  });
}

function parseDate(input) {
  if (input instanceof Date) return input;
  if (typeof input === "string") {
    const d = new Date(input);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  return null;
}
