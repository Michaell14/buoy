// Wording: every piece of text the island writes itself is a label, so it can be reworded or translated.
import { buoy } from '../../src/vanilla';
import type { Labels, TaskHandle } from '../../src/vanilla';
import { view, wait, type Example } from './kit';
import { pretendUpload } from './tasks';
import languageReact from './code/language.react.txt';
import languageVanilla from './code/language.vanilla.txt';

type Language = 'en' | 'de' | 'es';

const megabytes = (locale: string) => {
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  return (bytes: number) => number.format(bytes / 1e6);
};
/** "2 aktiv · 1 wartend": the counts that are not zero, each with its word. */
const counted = (pairs: Array<[count: number, word: string]>) =>
  pairs
    .filter(([count]) => count)
    .map(([count, word]) => `${count} ${word}`)
    .join(' · ');

const deMb = megabytes('de');
const de: Partial<Labels> = {
  active: (tasks) => (tasks.length === 1 ? `${tasks[0].label} wird hochgeladen` : `${tasks.length} Dateien werden hochgeladen`),
  doneOne: (task) => `${task.label} hochgeladen`,
  doneMany: (count) => `${count} Uploads abgeschlossen`,
  failures: (count) => (count === 1 ? '1 Upload fehlgeschlagen' : `${count} Uploads fehlgeschlagen`),
  summary: (c) => counted([[c.running, 'aktiv'], [c.queued, 'wartend'], [c.paused, 'pausiert'], [c.failed, 'fehlgeschlagen'], [c.done, 'fertig']]),
  guard: (count) => `Wenn du diesen Tab schließt, ${count === 1 ? 'wird 1 Upload' : `werden ${count} Uploads`} abgebrochen.`,
  amount: (loaded, total) => `${deMb(loaded)} von ${deMb(total)} MB`,
  size: (total) => `${deMb(total)} MB`,
  timeLeft: (seconds) => (seconds < 60 ? `noch ${seconds} s` : `noch ${Math.round(seconds / 60)} min`),
  failedAt: (error, at) => `${error} bei ${at}`,
  details: (name) => `${name}. Details anzeigen`,
  waiting: (count) => `${count} weitere`,
  running: 'Aktiv',
  queued: 'Wartet',
  paused: 'Pausiert',
  failed: 'Fehlgeschlagen',
  done: 'Fertig',
  notStarted: 'Wartet auf den Start',
  finished: 'Abgeschlossen',
  activity: 'Aktivität',
  nothing: 'Noch nichts hier',
  empty: 'Gestartete Aufgaben erscheinen hier.',
  clearDone: 'Fertige entfernen',
  pauseAll: 'Alle pausieren',
  resumeAll: 'Alle fortsetzen',
  showActivity: 'Aktivität anzeigen',
  retry: 'Nochmal',
  view: 'Ansehen',
  open: 'Öffnen',
  cancel: 'Abbrechen',
  pause: 'Pausieren',
  resume: 'Fortsetzen',
  remove: 'Entfernen',
  close: 'Schließen',
  dismiss: 'Schließen',
  loading: 'Lädt…',
  error: 'Etwas ist schiefgelaufen',
  recent: 'Zuletzt',
  ago: (seconds) => (seconds < 60 ? 'Gerade eben' : seconds < 3600 ? `vor ${Math.floor(seconds / 60)} min` : `vor ${Math.floor(seconds / 3600)} h`),
};

const esMb = megabytes('es');
const es: Partial<Labels> = {
  active: (tasks) => (tasks.length === 1 ? `Subiendo ${tasks[0].label}` : `Subiendo ${tasks.length} archivos`),
  doneOne: (task) => `${task.label} subido`,
  doneMany: (count) => `${count} subidas terminadas`,
  failures: (count) => (count === 1 ? '1 subida falló' : `${count} subidas fallaron`),
  summary: (c) => counted([[c.running, 'en curso'], [c.queued, 'en cola'], [c.paused, 'en pausa'], [c.failed, 'con error'], [c.done, 'terminadas']]),
  guard: (count) => `Si cierras esta pestaña ${count === 1 ? 'se detendrá 1 subida' : `se detendrán ${count} subidas`}.`,
  amount: (loaded, total) => `${esMb(loaded)} de ${esMb(total)} MB`,
  size: (total) => `${esMb(total)} MB`,
  timeLeft: (seconds) => (seconds < 60 ? `quedan ${seconds} s` : `quedan ${Math.round(seconds / 60)} min`),
  failedAt: (error, at) => `${error} en ${at}`,
  details: (name) => `${name}. Ver detalles`,
  waiting: (count) => `${count} en espera`,
  running: 'En curso',
  queued: 'En cola',
  paused: 'En pausa',
  failed: 'Error',
  done: 'Listo',
  notStarted: 'Esperando para empezar',
  finished: 'Terminado',
  activity: 'Actividad',
  nothing: 'Aún no hay nada',
  empty: 'Las tareas que inicies aparecerán aquí.',
  clearDone: 'Quitar terminadas',
  pauseAll: 'Pausar todo',
  resumeAll: 'Reanudar todo',
  showActivity: 'Ver actividad',
  retry: 'Reintentar',
  view: 'Ver',
  open: 'Abrir',
  cancel: 'Cancelar',
  pause: 'Pausar',
  resume: 'Reanudar',
  remove: 'Quitar',
  close: 'Cerrar',
  dismiss: 'Descartar',
  loading: 'Cargando…',
  error: 'Algo salió mal',
  recent: 'Recientes',
  ago: (seconds) => (seconds < 60 ? 'Ahora mismo' : seconds < 3600 ? `hace ${Math.floor(seconds / 60)} min` : `hace ${Math.floor(seconds / 3600)} h`),
};

// English only rewords the task lines for uploads. Everything else is the island's default.
const en: Partial<Labels> = {
  noun: 'upload',
  active: (tasks) => (tasks.length === 1 ? `Uploading ${tasks[0].label}` : `Uploading ${tasks.length} files`),
  doneOne: (task) => `Uploaded ${task.label}`,
  doneMany: (count) => `${count} uploads finished`,
};

const LANGUAGES: Record<Language, { name: string; labels: Partial<Labels>; dropped: string }> = {
  en: { name: 'English', labels: en, dropped: 'Connection dropped' },
  de: { name: 'Deutsch', labels: de, dropped: 'Verbindung unterbrochen' },
  es: { name: 'Español', labels: es, dropped: 'Se perdió la conexión' },
};

const language: Example = {
  id: 'language',
  group: 'Wording',
  title: 'Speak another language',
  api: 'labels',
  blurb: 'Every word the island writes itself is a label: its buttons, its states, the tray, and what screen readers hear. Pass your own and it speaks your language.',
  hint: 'Pick a language, start the upload, then open the tray. One file fails on purpose.',
  notes: [
    ['Every word is a label', 'Anything the island writes can be replaced, down to the names a screen reader hears on its buttons.'],
    ['Sentences are functions', 'Plurals and word order differ by language, so counts and names come in as arguments.'],
    ['Back to the defaults', 'Labels you leave out stay as they are, and labels: null puts every one back.'],
  ],
  code: { react: languageReact, vanilla: languageVanilla },
  mount(root) {
    const handles: TaskHandle[] = [];
    let current: Language = 'en';

    const speak = (next: Language) => {
      current = next;
      // Start from the defaults, so a label one language leaves out does not keep another's text.
      buoy.configure({ labels: null });
      buoy.configure({ labels: LANGUAGES[next].labels });
      root.querySelectorAll('[data-language]').forEach((button) => button.setAttribute('aria-pressed', String(button.getAttribute('data-language') === next)));
    };

    view(
      root,
      `<div class="x-card">
        <div class="x-text"><strong>Language</strong><span>This card stays in English. The island follows.</span></div>
        <div class="seg" role="group" aria-label="Language">
          ${(Object.keys(LANGUAGES) as Language[]).map((key) => `<button type="button" data-do="language" data-language="${key}" lang="${key}">${LANGUAGES[key].name}</button>`).join('')}
        </div>
        <div class="x-row">
          <button type="button" class="x-btn is-grow" data-do="upload">Upload three files</button>
          <button type="button" class="x-btn is-quiet" data-do="fail">Fail a save</button>
        </div>
      </div>`,
      (action, target) => {
        if (action === 'language') speak(target.dataset.language as Language);
        if (action === 'upload') {
          const upload = pretendUpload(18e6);
          handles.push(
            buoy.track(pretendUpload(24e6), { label: 'beach-sunset.heic', total: 24e6, icon: 'image' }),
            // The second file loses its connection halfway through its first try.
            buoy.track(
              async (task) => {
                if (task.attempt > 1) return upload(task);
                task.progress(0, 18e6);
                for (let sent = 0; sent < 9e6; sent += 1.5e6) {
                  await wait(250);
                  await task.checkpoint();
                  if (task.signal.aborted) return;
                  task.progress(sent, 18e6);
                }
                throw new Error(LANGUAGES[current].dropped);
              },
              { label: 'holiday-video.mov', total: 18e6 },
            ),
            buoy.track(pretendUpload(1.2e6), { label: 'itinerary.pdf', total: 1.2e6 }),
          );
        }
        // With no text of its own, a promise uses the island's: loading, then the error and Retry.
        if (action === 'fail') buoy.promise(wait(900).then(() => Promise.reject()), { id: 'language', retry: () => {} }).catch(() => {});
      },
    );
    speak('en');
    return () => {
      for (const handle of handles) handle.remove();
    };
  },
};

export const WORDING = [language];
