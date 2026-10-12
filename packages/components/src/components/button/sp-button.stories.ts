import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, fn, userEvent } from 'storybook/test';
import { iconNode } from '../../../.storybook/icons.js';
import './define.js';
import type { SpButton } from './sp-button.js';
import type { ButtonSize, ButtonType, ButtonVariant } from './sp-button.js';

type Args = {
  label: string;
  variant: ButtonVariant;
  size: ButtonSize;
  type: ButtonType;
  startIcon?: string;
  endIcon?: string;
  disabled: boolean;
  loading: boolean;
  onClick: (event: Event) => void;
};

const variants: ButtonVariant[] = ['primary', 'secondary', 'danger', 'ghost', 'dashed', 'danger-subtle', 'warning'];
const row = 'display:flex;gap:12px;flex-wrap:wrap;align-items:center';

// Icons come from the licensed Central Icons set (round, outlined, radius 2, stroke 1.5, the Figma
// icon spec) via the Icons panel; without the package installed a plain plus stands in.
const ADD = 'IconPlusSmall';
const NEXT = 'IconArrowRight';

const meta: Meta<Args> = {
  title: 'Components/Button',
  component: 'sp-button',
  args: { label: 'Button', variant: 'primary', size: 'base', type: 'button', startIcon: undefined, endIcon: undefined, disabled: false, loading: false, onClick: fn() },
  argTypes: {
    variant: { control: 'select', options: variants },
    size: { control: 'inline-radio', options: ['sm', 'base'] },
    type: { control: 'inline-radio', options: ['button', 'submit', 'reset'] },
    startIcon: { name: 'Left icon', control: 'text', description: 'Icon in the `start` slot. Pick one in the Icons panel, or type a name such as IconPlusSmall.' },
    endIcon: { name: 'Right icon', control: 'text', description: 'Icon in the `end` slot. Pick one in the Icons panel.' },
    onClick: { table: { disable: true } },
  },
  render: ({ label, variant, size, type, startIcon, endIcon, disabled, loading, onClick }) => html`
    <sp-button variant=${variant} size=${size} type=${type} ?disabled=${disabled} ?loading=${loading} @click=${onClick}>
      ${iconNode(startIcon, 'start')}${label}${iconNode(endIcon, 'end')}
    </sp-button>
  `,
  parameters: {
    design: { type: 'figma', url: 'https://www.figma.com/design/PhcMPmdpkpgxH3N83SvpBY/Spartan-DS?node-id=21-27' },
    iconPicker: { targets: [{ arg: 'startIcon', label: 'Left icon' }, { arg: 'endIcon', label: 'Right icon' }] },
    docs: {
      description: {
        component:
          'Action button built from the Spartan DS Button set ([Figma](https://www.figma.com/design/PhcMPmdpkpgxH3N83SvpBY/Spartan-DS?node-id=21-27)). Sizes: `sm` is Small, `base` is Base. Heights, padding, type, and icons come from the generated Component and Density variables, so the Density toolbar changes them. The corner radius, Secondary fill and border, and state colors come from the Style toolbar (Atlas, Selene, Helios, Ares), so there is no `shape` property: Helios is the pill. Layout follows the Direction toolbar and any nested `dir`.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<Args>;

export const Playground: Story = {
  // Interaction test: a real click reaches the onClick arg, then focusing the host (delegatesFocus) and pressing Enter activates it.
  play: async ({ canvasElement, args }) => {
    const host = canvasElement.querySelector('sp-button')!;
    await userEvent.click(host);
    await expect(args.onClick).toHaveBeenCalledTimes(1);
    host.focus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onClick).toHaveBeenCalledTimes(2);
  },
};

export const Variants: Story = {
  render: ({ size }) => html`<div style=${row}>${variants.map(v => html`<sp-button variant=${v} size=${size}>${v}</sp-button>`)}</div>`,
};

export const Sizes: Story = {
  render: ({ variant }) => html`
    <div style=${row}>
      <sp-button variant=${variant} size="sm">Small</sp-button>
      <sp-button variant=${variant} size="base">Base</sp-button>
    </div>
  `,
};

const styleNames = ['Atlas', 'Selene', 'Helios', 'Ares'];

// The style collection owns the corner radius and the Secondary treatment, so there is no shape
// property: Helios is the pill. A nested attribute re-resolves every style-bound value in its subtree.
export const Styles: Story = {
  render: ({ size }) => html`
    <div style="display:grid;gap:20px">
      ${styleNames.map(
        name => html`
          <div data-sp-mode-style=${name} style=${row}>
            <span style="width:72px">${name}</span>
            ${variants.map(v => html`<sp-button variant=${v} size=${size}>${v}</sp-button>`)}
          </div>
        `,
      )}
    </div>
  `,
  play: async ({ canvasElement }) => {
    const radius = (name: string) => {
      const host = canvasElement.querySelector(`[data-sp-mode-style="${name}"] sp-button`)!;
      return parseFloat(getComputedStyle(host.shadowRoot!.querySelector('button')!).borderTopLeftRadius);
    };
    await expect(radius('Ares')).toBe(0);
    await expect(radius('Atlas')).toBeGreaterThan(0);
    await expect(radius('Selene')).toBeGreaterThan(radius('Atlas'));
    await expect(radius('Helios')).toBeGreaterThan(radius('Selene'));
  },
};

// Direction is the native `dir` attribute, inherited through the shadow root. Start and end icons
// swap sides with it, and a nested `dir` overrides the document's, whatever the Direction toolbar says.
export const Directions: Story = {
  args: { label: 'Continue' },
  render: ({ variant, size, label }) => html`
    <div style="display:grid;gap:16px">
      ${(['ltr', 'rtl'] as const).map(
        dir => html`
          <div dir=${dir} style=${row}>
            <span style="width:48px">${dir.toUpperCase()}</span>
            <sp-button variant=${variant} size=${size}>${iconNode(ADD, 'start')}${label}${iconNode(NEXT, 'end')}</sp-button>
            <sp-button variant=${variant} size=${size}>${iconNode(ADD, 'start')}${label}</sp-button>
            <sp-button variant=${variant} size=${size} loading>${iconNode(ADD, 'start')}${label}${iconNode(NEXT, 'end')}</sp-button>
            <div style="max-width:140px"><sp-button variant=${variant} size=${size}>${iconNode(ADD, 'start')}Export every selected record</sp-button></div>
          </div>
        `,
      )}
    </div>
  `,
  play: async ({ canvasElement }) => {
    const ltr = canvasElement.querySelector<SpButton>('[dir=ltr] sp-button')!;
    const rtl = canvasElement.querySelector<SpButton>('[dir=rtl] sp-button')!;
    await Promise.all([ltr.updateComplete, rtl.updateComplete]);
    await new Promise(resolve => requestAnimationFrame(resolve));
    const box = (host: SpButton, selector: string) => (selector === '.label' ? host.shadowRoot!.querySelector(selector)! : host.querySelector(selector)!).getBoundingClientRect();
    // LTR: the start icon is left of the label and the end icon right of it. RTL swaps them.
    await expect(box(ltr, '[slot=start]').right).toBeLessThanOrEqual(box(ltr, '.label').left);
    await expect(box(ltr, '[slot=end]').left).toBeGreaterThanOrEqual(box(ltr, '.label').right);
    await expect(box(rtl, '[slot=start]').left).toBeGreaterThanOrEqual(box(rtl, '.label').right);
    await expect(box(rtl, '[slot=end]').right).toBeLessThanOrEqual(box(rtl, '.label').left);
  },
};

// Pick the icons in the Icons panel. Left and right icons are independent slots.
export const WithIcons: Story = {
  args: { label: 'Add', startIcon: ADD, endIcon: NEXT },
};

export const Disabled: Story = {
  play: async ({ canvasElement, args }) => {
    const host = canvasElement.querySelector('sp-button')!;
    await userEvent.click(host);
    await expect(args.onClick).not.toHaveBeenCalled();
  },
  render: ({ size }) => html`<div style=${row}>${variants.map(v => html`<sp-button variant=${v} size=${size} disabled>${v}</sp-button>`)}</div>`,
};

export const Loading: Story = {
  render: ({ size }) => html`<div style=${row}>${variants.map(v => html`<sp-button variant=${v} size=${size} loading>${v}</sp-button>`)}</div>`,
};

// Density is a separate token collection: a nested attribute re-resolves every
// density-bound value (height, padding, type, icon size) inside its subtree.
export const Density: Story = {
  render: ({ variant }) => html`
    <div style="display:grid;gap:24px">
      ${['Relaxed', 'Compact'].map(
        mode => html`
          <div data-sp-mode-density=${mode} style=${row}>
            <span style="width:72px">${mode}</span>
            <sp-button variant=${variant} size="sm">${iconNode(ADD, 'start')}Small</sp-button>
            <sp-button variant=${variant} size="base">${iconNode(ADD, 'start')}Base</sp-button>
          </div>
        `,
      )}
    </div>
  `,
};

export const LongLabel: Story = {
  args: { label: 'Export every selected record to a spreadsheet' },
  render: ({ label, variant }) => html`<div style="max-width:220px"><sp-button variant=${variant}>${label}</sp-button></div>`,
};

// Product Brand changes action fills. System focus remains independent. Every
// local setting inherits the other axes and can be overridden deeper in the tree.
export const ThemeContract: Story = {
  render: () => html`
    <section data-sp-mode-style="Helios" data-sp-mode-primary="Purple" data-sp-mode-density="Compact" data-sp-mode-color-scheme="Dark" data-sp-mode-contrast="High" dir="rtl"
      style="display:grid;gap:var(--sp-form-group-gap);padding:var(--sp-surface-content-padding);background:var(--sp-color-surface-default);color:var(--sp-color-foreground-default)">
      <p style="margin:0">Helios · Purple Brand · Compact · Dark · High contrast · RTL. Tab to inspect System focus.</p>
      <div style=${row}>
        <sp-button>${iconNode(ADD, 'start')}Continue${iconNode(NEXT, 'end')}</sp-button>
        <sp-button variant="secondary" size="sm">Secondary</sp-button>
        <sp-button loading>Saving changes</sp-button>
        <sp-button disabled>Unavailable</sp-button>
      </div>
      <section data-sp-mode-style="Ares" data-sp-mode-primary="Sky" data-sp-mode-density="Relaxed" dir="ltr"
        style="display:grid;gap:var(--sp-form-group-gap);padding:var(--sp-surface-content-padding);border:var(--sp-surface-border-width) solid var(--sp-surface-border)">
        <p style="margin:0">Nested Ares · Sky Brand · Relaxed · LTR. Dark and High contrast inherit.</p>
        <div style=${row}>
          <sp-button>${iconNode(ADD, 'start')}Continue${iconNode(NEXT, 'end')}</sp-button>
          <sp-button variant="danger">Delete</sp-button>
          <div style="max-inline-size:180px"><sp-button>${iconNode(ADD, 'start')}Export every selected record</sp-button></div>
        </div>
      </section>
    </section>
  `,
};

export const InForm: Story = {
  render: () => html`
    <form
      style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"
      @submit=${(e: SubmitEvent) => {
        e.preventDefault();
        const out = (e.target as HTMLFormElement).querySelector('output')!;
        const data = new FormData(e.target as HTMLFormElement, e.submitter);
        out.value = `Submitted: ${[...data].map(([k, v]) => `${k}=${v}`).join(', ')}`;
      }}
    >
      <input name="email" value="hi@example.com" aria-label="Email" />
      <sp-button type="submit" name="intent" value="save">Submit</sp-button>
      <sp-button type="reset" variant="secondary">Reset</sp-button>
      <output></output>
    </form>
  `,
};
