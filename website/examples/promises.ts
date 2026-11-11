// Promises: loading turns into success or error on the same message.
import { buoy } from '../../src/vanilla';
import { $, ICON, view, wait, type Example } from './kit';
import checkoutReact from './code/checkout.react.txt';
import checkoutVanilla from './code/checkout.vanilla.txt';
import exportReact from './code/export.react.txt';
import exportVanilla from './code/export.vanilla.txt';
import saveReact from './code/save.react.txt';
import saveVanilla from './code/save.vanilla.txt';

const message = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback);

const save: Example = {
  id: 'save',
  group: 'Promises',
  title: 'Save a form',
  api: 'buoy.promise()',
  blurb: 'Hand over the promise you already have. The island shows it loading, then turns into the result in place.',
  hint: 'Save it, then clear the name and save again to see the error.',
  notes: [
    ['One message, three states', 'Loading becomes success or error in place. Nothing is added and nothing jumps.'],
    ['Still your promise', 'buoy.promise() returns the promise you passed, so you can await it as usual.'],
    ['Errors can be read', 'An error stays until it is dismissed. A success leaves after two seconds.'],
  ],
  code: { react: saveReact, vanilla: saveVanilla },
  mount(root) {
    // A pretend server: slow, and strict about empty names.
    const saveProfile = async (name: string) => {
      await wait(1400);
      if (!name.trim()) throw new Error('Add a display name first');
    };
    view(
      root,
      `<form class="x-card" novalidate>
        <div class="x-text"><strong>Profile</strong><span>How you appear to your team</span></div>
        <div class="x-field">
          <label for="x-save-name">Display name</label>
          <input class="x-input" id="x-save-name" name="name" value="Ana Okafor" autocomplete="off">
        </div>
        <label class="x-check"><input type="checkbox" name="notify" checked><span>Email me about replies</span></label>
        <button class="x-btn is-wide">Save changes</button>
      </form>`,
    );
    const button = $<HTMLButtonElement>(root, 'button');
    $(root, 'form').addEventListener('submit', (event) => {
      event.preventDefault();
      button.disabled = true;
      button.textContent = 'Saving…';
      buoy
        .promise(saveProfile($<HTMLInputElement>(root, 'input').value), {
          id: 'save',
          loading: 'Saving…',
          success: 'Profile saved',
          error: (error) => message(error, "Couldn't save"),
        })
        .catch(() => {})
        .finally(() => {
          button.disabled = false;
          button.textContent = 'Save changes';
        });
    });
    return () => {};
  },
};

const checkout: Example = {
  id: 'checkout',
  group: 'Promises',
  title: 'Check out',
  api: 'buoy.promise() with retry',
  blurb: 'When the promise fails, the error waits on the island with a Retry button that runs the same work again.',
  hint: 'The first try is declined on purpose. Press Retry on the island.',
  notes: [
    ['Retry on the error', 'Pass retry and the error gets a button that runs it again.'],
    ['It waits for you', 'Errors stay until they are dismissed, so a failed payment is never missed.'],
    ['Your wording', 'error can be a function, so the island shows the reason the server gave.'],
  ],
  code: { react: checkoutReact, vanilla: checkoutVanilla },
  mount(root) {
    let tries = 0;
    let paid = false;
    let busy = false;

    view(
      root,
      `<div class="x-card">
        <div class="x-head">
          <div class="x-text"><strong>Pro plan</strong><span>Billed monthly</span></div>
          <span class="x-price">$12.00</span>
        </div>
        <div class="x-method">${ICON.card}<span>Card ending 4242</span></div>
        <label class="x-check"><input type="checkbox" checked><span>Decline the first try</span></label>
        <button type="button" class="x-btn is-wide" data-do="pay"></button>
        <p class="x-foot" hidden>Thanks, you're all set. <button type="button" class="x-link" data-do="reset">Start over</button></p>
      </div>`,
      (action) => {
        if (action === 'pay') pay();
        if (action === 'reset') {
          tries = 0;
          paid = false;
          draw();
        }
      },
    );
    const decline = $<HTMLInputElement>(root, 'input');
    const button = $<HTMLButtonElement>(root, '[data-do="pay"]');
    const draw = () => {
      button.disabled = busy || paid;
      button.textContent = paid ? 'Paid' : busy ? 'Processing…' : 'Pay $12.00';
      $(root, '.x-foot').hidden = !paid;
    };
    // A pretend payment: declined once, if the box is ticked.
    const charge = async () => {
      tries++;
      await wait(1600);
      if (decline.checked && tries === 1) throw new Error('Card declined');
    };
    function pay() {
      if (busy || paid) return;
      busy = true;
      draw();
      buoy
        .promise(charge(), {
          id: 'checkout',
          loading: 'Processing payment…',
          success: 'Payment received',
          error: (error) => message(error, 'Payment failed'),
          retry: pay,
        })
        .then(
          () => {
            paid = true;
          },
          () => {},
        )
        .finally(() => {
          busy = false;
          draw();
        });
    }
    draw();
    return () => {};
  },
};

const exportReport: Example = {
  id: 'export',
  group: 'Promises',
  title: 'Export a report',
  api: 'buoy.promise() with a result',
  blurb: 'A result can be more than a line. Here the success opens into a card with the file and two things to do with it.',
  hint: 'Export the report, then use the buttons on the card.',
  notes: [
    ['A result with more to say', 'success and error can each return a whole message: a description, an icon and buttons.'],
    ['Buttons buy time', 'A plain success leaves after two seconds. One with buttons stays for six, and longer while hovered.'],
    ['Still one message', 'The card opens from the same pill that was loading. Nothing is added and nothing jumps.'],
  ],
  code: { react: exportReact, vanilla: exportVanilla },
  mount(root) {
    let busy = false;
    view(
      root,
      `<div class="x-card">
        <div class="x-head">
          <span class="x-tile">${ICON.file}</span>
          <div class="x-text"><strong>Q3 report</strong><span>18 pages · updated today</span></div>
        </div>
        <div class="x-field">
          <label for="x-export-format">Format</label>
          <select class="x-input" id="x-export-format"><option value="pdf">PDF</option><option value="csv">CSV</option></select>
        </div>
        <label class="x-check"><input type="checkbox"><span>Make this export fail</span></label>
        <button type="button" class="x-btn is-wide" data-do="export">Export</button>
      </div>`,
      () => run(),
    );
    const button = $<HTMLButtonElement>(root, 'button');
    const fails = $<HTMLInputElement>(root, 'input');
    // A pretend export: it takes a moment, then hands back the file.
    const build = async (format: string) => {
      await wait(1800);
      if (fails.checked) throw new Error('The report is still being prepared. Try again in a minute.');
      return format === 'csv' ? { name: 'Q3-report.csv', size: '86 KB' } : { name: 'Q3-report.pdf', size: '4.2 MB' };
    };
    function run() {
      if (busy) return;
      busy = true;
      button.disabled = true;
      button.textContent = 'Exporting…';
      buoy
        .promise(build($<HTMLSelectElement>(root, 'select').value), {
          id: 'export',
          loading: 'Exporting…',
          success: (file) => ({
            title: 'Export ready',
            description: `${file.name} · ${file.size}`,
            icon: 'file',
            expanded: true,
            actions: [
              { label: 'Open', primary: true, onClick: () => buoy(`Opened ${file.name}`, { icon: 'open' }) },
              { label: 'Show in folder', onClick: () => buoy(`Showing ${file.name} in Downloads`, { icon: 'folder' }) },
            ],
          }),
          error: (error) => ({ title: "Couldn't export", description: message(error, 'Something went wrong.') }),
          retry: run,
        })
        .catch(() => {})
        .finally(() => {
          busy = false;
          button.disabled = false;
          button.textContent = 'Export';
        });
    }
    return () => {};
  },
};

export const PROMISES = [save, checkout, exportReport];
