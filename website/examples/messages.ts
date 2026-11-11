// Messages: one line that says what just happened, with a button or a card when there is more to do.
import { buoy } from '../../src/vanilla';
import { $, BAG, ICON, esc, view, type Example } from './kit';
import archiveReact from './code/archive.react.txt';
import archiveVanilla from './code/archive.vanilla.txt';
import cartReact from './code/cart.react.txt';
import cartVanilla from './code/cart.vanilla.txt';
import inviteReact from './code/invite.react.txt';
import inviteVanilla from './code/invite.vanilla.txt';
import shareReact from './code/share.react.txt';
import shareVanilla from './code/share.vanilla.txt';

const share: Example = {
  id: 'share',
  group: 'Messages',
  title: 'Share a link',
  api: 'buoy()',
  blurb: 'The smallest use there is. A button does its job, one short message says so, and it leaves on its own.',
  hint: 'Press Copy link a few times. The message restarts in place instead of queueing.',
  notes: [
    ['One line', 'A title and an icon are enough. The message leaves after three seconds.'],
    ['An id keeps it single', 'Calls that share an id update the same message, so quick presses never pile up.'],
    ['Tap to dismiss', 'A message with nothing to open closes on a tap, a swipe or Esc.'],
  ],
  code: { react: shareReact, vanilla: shareVanilla },
  mount(root) {
    const url = 'https://example.com/s/8fk2x';
    view(
      root,
      `<div class="x-card">
        <div class="x-head">
          <span class="x-tile">${ICON.file}</span>
          <div class="x-text"><strong>Q3-report.pdf</strong><span>Anyone with the link can view</span></div>
        </div>
        <div class="x-field">
          <label for="x-share-link">Share link</label>
          <div class="x-row">
            <input class="x-input is-mono" id="x-share-link" readonly value="${url}">
            <button type="button" class="x-btn" data-do="copy">Copy link</button>
          </div>
        </div>
      </div>`,
      async () => {
        try {
          await navigator.clipboard.writeText(url);
          buoy('Link copied', { id: 'share', icon: 'link' });
        } catch {
          $<HTMLInputElement>(root, 'input').select();
          buoy.warn("Couldn't copy here", { id: 'share', description: 'The link is selected, so you can copy it yourself.' });
        }
      },
    );
    return () => {};
  },
};

const cart: Example = {
  id: 'cart',
  group: 'Messages',
  title: 'Add to cart',
  api: 'buoy() with an action',
  blurb: 'A message can carry one button. Here it opens the same message into a card with the cart and two ways on.',
  hint: 'Add the tote, then press View on the island.',
  notes: [
    ['A button on the pill', 'One action sits beside the title. A message with a button stays for six seconds.'],
    ['Opens into a card', 'A description or a pair of actions opens the same shape into a card.'],
    ['Your own icon', 'Pass any trusted SVG string where a built-in icon name would go.'],
  ],
  code: { react: cartReact, vanilla: cartVanilla },
  mount(root) {
    const item = { name: 'Canvas tote', price: 32 };
    const money = (amount: number) => `$${amount.toFixed(2)}`;
    let quantity = 1;
    let count = 0;

    const draw = () => {
      $(root, '.x-qty').textContent = String(quantity);
      $<HTMLButtonElement>(root, '[data-do="less"]').disabled = quantity === 1;
      $(root, '.x-foot').textContent = count ? `${count} in your cart · ${money(count * item.price)}` : 'Your cart is empty';
    };
    const showCart = () =>
      buoy(`${count} in your cart`, {
        id: 'cart',
        description: `${item.name} · ${money(count * item.price)}`,
        icon: BAG,
        tone: 'accent',
        expanded: true,
        actions: [
          {
            label: 'Check out',
            primary: true,
            onClick: () => {
              count = 0;
              draw();
              buoy.success('Order placed', { id: 'cart' });
            },
          },
          { label: 'Keep shopping' },
        ],
      });

    view(
      root,
      `<div class="x-card">
        <div class="x-head">
          <span class="x-swatch" aria-hidden="true">${BAG}</span>
          <div class="x-text"><strong>${item.name}</strong><span>Sand · One size</span></div>
          <span class="x-price">${money(item.price)}</span>
        </div>
        <div class="x-row">
          <div class="x-stepper" role="group" aria-label="Quantity">
            <button type="button" class="x-icon" data-do="less" aria-label="One fewer">${ICON.minus}</button>
            <output class="x-qty" aria-live="polite">1</output>
            <button type="button" class="x-icon" data-do="more" aria-label="One more">${ICON.plus}</button>
          </div>
          <button type="button" class="x-btn is-grow" data-do="add">Add to cart</button>
        </div>
        <p class="x-foot"></p>
      </div>`,
      (action) => {
        if (action === 'less') quantity = Math.max(1, quantity - 1);
        if (action === 'more') quantity = Math.min(9, quantity + 1);
        if (action === 'add') {
          count += quantity;
          buoy(quantity === 1 ? 'Added to cart' : `Added ${quantity} to cart`, {
            id: 'cart',
            icon: BAG,
            action: { label: 'View', onClick: showCart },
          });
        }
        draw();
      },
    );
    draw();
    return () => {};
  },
};

const invite: Example = {
  id: 'invite',
  group: 'Messages',
  title: 'Invite a teammate',
  api: 'buoy.success() · warn() · info()',
  blurb: 'A form answers in one place. The same message turns from a warning into a success as the input gets fixed.',
  hint: 'Send it empty, then with ana@example.com, then with a new address.',
  notes: [
    ['Typed messages', 'success, info, warn and error each bring their own icon and tint.'],
    ['Same id, new type', 'Each result replaces the last, so a warning turns into a success in place.'],
    ['Read aloud', 'Every message goes through a polite live region, so screen readers hear it too.'],
  ],
  code: { react: inviteReact, vanilla: inviteVanilla },
  mount(root) {
    const members = ['ana@example.com'];
    view(
      root,
      `<form class="x-card" novalidate>
        <div class="x-text"><strong>Invite a teammate</strong><span class="x-members"></span></div>
        <div class="x-field">
          <label for="x-invite-email">Email</label>
          <input class="x-input" id="x-invite-email" name="email" type="email" placeholder="name@company.com" autocomplete="off">
        </div>
        <div class="x-field">
          <label for="x-invite-role">Role</label>
          <select class="x-input" id="x-invite-role" name="role"><option>Can edit</option><option>Can view</option></select>
        </div>
        <button class="x-btn is-wide">Send invite</button>
      </form>`,
    );
    const form = $<HTMLFormElement>(root, 'form');
    const input = $<HTMLInputElement>(root, 'input');
    const draw = () => {
      $(root, '.x-members').textContent = `On the team: ${members.join(', ')}`;
    };
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const email = input.value.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        buoy.warn(email ? "That address doesn't look right" : 'Enter an email address', { id: 'invite' });
        input.focus();
      } else if (members.includes(email)) {
        buoy.info(`${email} is already on the team`, { id: 'invite' });
      } else {
        members.push(email);
        buoy.success(`Invite sent to ${email}`, { id: 'invite' });
        form.reset();
        draw();
      }
    });
    draw();
    return () => {};
  },
};

const THREADS = [
  { id: 'priya', from: 'Priya Nair', initials: 'PN', subject: 'Launch checklist, final pass' },
  { id: 'sam', from: 'Sam Ortiz', initials: 'SO', subject: 'Invoice for October' },
  { id: 'lena', from: 'Lena Fischer', initials: 'LF', subject: 'Re: Beta feedback' },
  { id: 'kofi', from: 'Kofi Mensah', initials: 'KM', subject: 'Photos from the offsite' },
];

const archive: Example = {
  id: 'archive',
  group: 'Messages',
  title: 'Archive with undo',
  api: 'buoy() with an action',
  blurb: 'A row goes at once, and the island offers the way back. Archive a few in a row and one Undo restores them all.',
  hint: 'Archive two in a row, then press Undo. Both come back.',
  notes: [
    ['Undo on the pill', 'An action turns a message into a way back. Pressing it also dismisses the message.'],
    ['One message for a run', 'A shared id folds each new archive into the same message and restarts its six seconds.'],
    ['Know why it left', 'onDismiss is told the reason: the time ran out, a button was pressed, or it was dismissed.'],
  ],
  code: { react: archiveReact, vanilla: archiveVanilla },
  mount(root) {
    let archived: string[] = [];
    // Everything archived while the message is up, so one Undo brings it all back.
    let batch: string[] = [];

    const draw = (focusAt = -1) => {
      const left = THREADS.filter((thread) => !archived.includes(thread.id));
      $(root, '.x-count').textContent = String(left.length);
      $(root, '.x-list').innerHTML = left
        .map(
          (thread, i) =>
            `<li class="x-item"><span class="x-face" data-i="${i % 3}" aria-hidden="true">${thread.initials}</span>` +
            `<div class="x-text"><strong>${esc(thread.from)}</strong><span>${esc(thread.subject)}</span></div>` +
            `<button type="button" class="x-icon" data-do="archive" data-id="${thread.id}" aria-label="Archive conversation with ${esc(thread.from)}">${ICON.box}</button></li>`,
        )
        .join('');
      $(root, '.x-empty').hidden = left.length > 0;
      // Keep the keyboard where it was: on the row that moved up into the archived one's place.
      const buttons = root.querySelectorAll<HTMLElement>('[data-do="archive"]');
      if (focusAt >= 0) (buttons[Math.min(focusAt, buttons.length - 1)] ?? $(root, '[data-do="reset"]')).focus();
    };

    view(
      root,
      `<div class="x-card is-list">
        <div class="x-list-head"><strong>Inbox</strong><span class="x-num x-count"></span></div>
        <ul class="x-list"></ul>
        <p class="x-empty" hidden>Nothing left to read. <button type="button" class="x-link" data-do="reset">Bring them back</button></p>
      </div>`,
      (action, target) => {
        if (action === 'reset') {
          archived = [];
          return draw(0);
        }
        const at = Array.from(root.querySelectorAll('[data-do="archive"]')).indexOf(target);
        const ids = (batch = [...batch, target.dataset.id!]);
        archived = [...archived, target.dataset.id!];
        draw(at);
        buoy(ids.length === 1 ? 'Conversation archived' : `${ids.length} conversations archived`, {
          id: 'archive',
          action: {
            label: 'Undo',
            onClick: () => {
              archived = archived.filter((id) => !ids.includes(id));
              draw();
            },
          },
          onDismiss: () => {
            batch = [];
          },
        });
      },
    );
    draw();
    return () => {};
  },
};

export const MESSAGES = [share, cart, invite, archive];
