import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, fn, userEvent } from 'storybook/test';
import { iconNode } from '../../../.storybook/icons.js';
import './define.js';
import type { ButtonType, IconButtonSize, IconButtonVariant } from './sp-icon-button.js';

type Args = { label: string; variant: IconButtonVariant; size: IconButtonSize; type: ButtonType; name: string; value: string; icon?: string; disabled: boolean; onClick: (event: Event) => void };

const variants: IconButtonVariant[] = ['primary', 'secondary', 'danger', 'ghost', 'dashed'];
const sizes: IconButtonSize[] = ['xs', 'sm', 'base'];
const row = 'display:flex;gap:12px;flex-wrap:wrap;align-items:center';

// Icons come from the licensed Central Icons set (round, outlined, radius 2, stroke 1.5, the Figma
// icon spec) via the Icons panel; without the package installed a plain plus stands in.

const meta: Meta<Args> = {
  title: 'Components/Icon Button',
  component: 'sp-icon-button',
  args: { label: 'Add item', variant: 'primary', size: 'base', type: 'button', name: '', value: '', icon: 'IconPlusMedium', disabled: false, onClick: fn() },
  argTypes: {
    variant: { control: 'select', options: variants },
    size: { control: 'inline-radio', options: sizes },
    type: { control: 'inline-radio', options: ['button', 'submit', 'reset'] },
    icon: { control: 'text', description: 'Icon name. Pick one in the Icons panel.' },
    onClick: { table: { disable: true } },
  },
  render: ({ label, variant, size, type, name, value, icon, disabled, onClick }) => html`
    <sp-icon-button label=${label} variant=${variant} size=${size} type=${type} name=${name} value=${value} ?disabled=${disabled} @click=${onClick}>${iconNode(icon)}</sp-icon-button>
  `,
  parameters: {
    design: { type: 'figma', url: 'https://www.figma.com/design/PhcMPmdpkpgxH3N83SvpBY/Spartan-DS?node-id=326-63' },
    iconPicker: { targets: [{ arg: 'icon', label: 'Icon' }] },
    docs: {
      description: {
        component:
          'Icon-only action using the shared Spartan Style recipe and Icon Button Component aliases. Sizes: xs 24px, sm 32/28px, base 40/32px in Relaxed/Compact. A nonblank action label is required; slot content is decorative. Brand owns product fills, System owns focus. Style owns radius and treatment with zero shadows. Use the global style, scheme, contrast, brand, density and direction settings. The protected Figma master has default variants and older shadows/radius; the differences remain tracked in [HAUX-90](https://linear.app/wearehaux/issue/HAUX-90/icon-button).',
      },
    },
  },
};

export default meta;
type Story = StoryObj<Args>;

export const Playground: Story = {
  play: async ({ canvasElement, args }) => {
    const host = canvasElement.querySelector('sp-icon-button')!;
    await userEvent.click(host);
    host.focus(); await userEvent.keyboard('{Enter}'); await userEvent.keyboard(' ');
    await expect(args.onClick).toHaveBeenCalledTimes(3);
    await expect(host.shadowRoot!.querySelector('button')).toHaveAttribute('aria-label', args.label.trim());
  },
};

export const Variants: Story = {
  render: ({ size }) => html`<div style=${row}>${variants.map(v => html`<sp-icon-button label=${v} variant=${v} size=${size}>${iconNode('IconPlusSmall')}</sp-icon-button>`)}</div>`,
};

export const Sizes: Story = {
  render: ({ variant }) => html`<div style=${row}>${sizes.map(s => html`<sp-icon-button label=${'Add ' + s} variant=${variant} size=${s}>${iconNode('IconPlusSmall')}</sp-icon-button>`)}</div>`,
};

export const Disabled: Story = {
  render: ({ size, onClick }) => html`<div style=${row}>${variants.map(v => html`<sp-icon-button label=${v} variant=${v} size=${size} disabled @click=${onClick}>${iconNode('IconPlusSmall')}</sp-icon-button>`)}</div>`,
  play: async ({ canvasElement, args }) => {
    await userEvent.click(canvasElement.querySelector('sp-icon-button')!.shadowRoot!.querySelector('button')!);
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

export const Styles: Story = {
  render: ({ size, icon }) => html`
    <div style="display:grid;gap:var(--sp-form-group-gap)">
      ${['Atlas', 'Selene', 'Helios', 'Ares'].map(style => html`
        <div data-sp-mode-style=${style} style=${row}>
          <span style="min-inline-size:72px">${style}</span>
          ${variants.map(variant => html`<sp-icon-button label=${`${style} ${variant}`} variant=${variant} size=${size}>${iconNode(icon)}</sp-icon-button>`)}
        </div>`)}
    </div>`,
};

export const Directions: Story = {
  render: ({ size, variant }) => html`
    <div style="display:grid;gap:var(--sp-form-group-gap)">
      ${['ltr', 'rtl'].map(dir => html`
        <div dir=${dir} style=${row}>
          <span>${dir.toUpperCase()} · Artwork keeps its direction</span>
          <sp-icon-button size=${size} variant=${variant} label="Next">${iconNode('IconArrowRight')}</sp-icon-button>
          <sp-icon-button size=${size} variant="secondary" label="Add item">${iconNode('IconPlusMedium')}</sp-icon-button>
        </div>`)}
    </div>`,
  play: async ({ canvasElement }) => {
    for (const dir of ['ltr', 'rtl']) {
      const host = canvasElement.querySelector(`[dir=${dir}] sp-icon-button`)!;
      await expect(getComputedStyle(host.shadowRoot!.querySelector('button')!).direction).toBe(dir);
      await expect(getComputedStyle(host.firstElementChild!).transform).toBe('none');
    }
  },
};

export const ThemeContract: Story = {
  render: () => html`
    <section data-sp-mode-style="Helios" data-sp-mode-primary="Purple" data-sp-mode-density="Compact" data-sp-mode-color-scheme="Dark" data-sp-mode-contrast="High" dir="rtl"
      style="display:grid;gap:var(--sp-form-group-gap);padding:var(--sp-surface-content-padding);background:var(--sp-color-surface-default);color:var(--sp-color-foreground-default)">
      <p style="margin:0">Helios · Purple Brand · Compact · Dark · High contrast · RTL. Tab to inspect System focus.</p>
      <div style=${row}>${sizes.map(size => html`<sp-icon-button size=${size} label=${`Add ${size}`}>${iconNode('IconPlusMedium')}</sp-icon-button>`)}
        <sp-icon-button variant="secondary" label="Next">${iconNode('IconArrowRight')}</sp-icon-button>
        <sp-icon-button disabled label="Unavailable">${iconNode('IconPlusMedium')}</sp-icon-button>
      </div>
      <section data-sp-mode-style="Ares" data-sp-mode-primary="Sky" data-sp-mode-density="Relaxed" dir="ltr"
        style="display:grid;gap:var(--sp-form-group-gap);padding:var(--sp-surface-content-padding);border:var(--sp-surface-border-width) solid var(--sp-surface-border)">
        <p style="margin:0">Nested Ares · Sky Brand · Relaxed · LTR. Dark and High contrast inherit.</p>
        <div style=${row}>${variants.map(variant => html`<sp-icon-button variant=${variant} label=${variant}>${iconNode('IconPlusMedium')}</sp-icon-button>`)}</div>
      </section>
    </section>`,
};

export const InForm: Story = {
  render: () => html`
    <form style=${row} @submit=${(event: SubmitEvent) => {
      event.preventDefault();
      const form = event.target as HTMLFormElement;
      form.querySelector('output')!.value = `Submitted: ${[...new FormData(form, event.submitter)].map(([key, value]) => `${key}=${value}`).join(', ')}`;
    }}>
      <input aria-label="Title" name="title" value="Draft" required />
      <sp-icon-button type="submit" label="Save" name="intent" value="save">${iconNode('IconPlusMedium')}</sp-icon-button>
      <sp-icon-button type="reset" label="Reset" variant="secondary">${iconNode('IconArrowRight')}</sp-icon-button>
      <output></output>
    </form>`,
  play: async ({ canvasElement }) => {
    const save = canvasElement.querySelector<HTMLElement>('[label=Save]')!;
    save.focus(); await userEvent.keyboard('{Enter}');
    await expect(canvasElement.querySelector('output')).toHaveTextContent('intent=save');
    const field = canvasElement.querySelector('input')!;
    await userEvent.clear(field); await userEvent.type(field, 'Changed');
    canvasElement.querySelector<HTMLElement>('[label=Reset]')!.focus(); await userEvent.keyboard('{Enter}');
    await expect(field.value).toBe('Draft');
  },
};

// A nested density attribute re-resolves the Compact heights (base 32, small 28, extra small 24).
export const Density: Story = {
  render: ({ variant }) => html`
    <div style="display:grid;gap:24px">
      ${['Relaxed', 'Compact'].map(
        mode => html`
          <div data-sp-mode-density=${mode} style=${row}>
            <span style="width:72px">${mode}</span>
            ${sizes.map(s => html`<sp-icon-button label=${'Add ' + s} variant=${variant} size=${s}>${iconNode('IconPlusSmall')}</sp-icon-button>`)}
          </div>
        `,
      )}
    </div>
  `,
};
