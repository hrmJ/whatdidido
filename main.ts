import { Notification } from "https://deno.land/x/deno_notify@1.4.3/ts/mod.ts";
const homeDir = Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE") ?? "./";
const conf = {
  logFilepath: `${homeDir}/notes/dailylog.md`,
  intervalInMinutes: 0.01,
  locale: "fi-FI",
};

const cache: Record<string, boolean> = {};

async function entryFileHasTodaysHeader(today: string) {
  if (cache[today]) return true;
  const decoder = new TextDecoder();
  const entryFile = await Deno.readFile(conf.logFilepath);
  const data = decoder.decode(entryFile);
  const hasHeader = data.includes(today);
  cache[today] = hasHeader;
  return hasHeader;
}

async function addEntry(
  text: string | null,
  previousEntry: Temporal.PlainTime,
) {
  if (!text) return;
  const { locale } = conf;
  const encoder = new TextEncoder();
  const startTime = previousEntry.toLocaleString(locale);
  const endTime = previousEntry
    .add({ minutes: conf.intervalInMinutes * 100 })
    .toLocaleString(locale);
  const data = encoder.encode(`\n\n${startTime} - ${endTime}:   ${text}`);
  await Deno.writeFile(conf.logFilepath, data, { append: true, create: true });
}

function notify() {
  const notif = new Notification();
  notif.title("What have you been doing? 🧐");
  notif.show();
}

async function addTodaysHeader(today: string) {
  if (await entryFileHasTodaysHeader(today)) return;
  const encoder = new TextEncoder();
  const data = encoder.encode(`\n\n## ${today}`);
  await Deno.writeFile(conf.logFilepath, data, { append: true, create: true });
  cache[today] = true;
}

async function askForEntry(previousEntry: Temporal.PlainTime) {
  const now = Temporal.Now;
  const today = now.plainDate("iso8601").toLocaleString(conf.locale);
  await addTodaysHeader(today);
  notify();
  const text = prompt("📝");
  addEntry(text, previousEntry);
}

function setupTimer() {
  let previousEntry = Temporal.Now.plainTimeISO();
  return {
    reset: () => {
      previousEntry = Temporal.Now.plainTimeISO();
    },
    previousEntry,
  };
}

if (import.meta.main) {
  const timer = setupTimer();
  setInterval(
    () => {
      askForEntry(timer.previousEntry);
      notify();
      timer.reset();
    },
    conf.intervalInMinutes * 60 * 1000,
  );
}
