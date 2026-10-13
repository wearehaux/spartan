import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import './define.js';
import '../button/define.js';
import type { SpCheckbox } from './sp-checkbox.js';

type Args = { label: string; description: string; error: string; checked: boolean; indeterminate: boolean; disabled: boolean; invalid: boolean; required: boolean; name: string; value: string; onInput: (event: Event) => void; onChange: (event: Event) => void };
const meta: Meta<Args> = {
  title: 'Components/Checkbox', component: 'sp-checkbox',
  args: { label: 'Accept terms and conditions', description: 'Read the terms before continuing', error: '', checked: false, indeterminate: false, disabled: false, invalid: false, required: false, name: 'terms', value: 'accepted', onInput: fn(), onChange: fn() },
  argTypes: { onInput: { table: { disable: true } }, onChange: { table: { disable: true } } },
  render: a => html`<sp-checkbox label=${a.label} description=${a.description} error=${a.error} .checked=${a.checked} .indeterminate=${a.indeterminate} ?disabled=${a.disabled} ?invalid=${a.invalid} ?required=${a.required} name=${a.name} value=${a.value} @input=${a.onInput} @change=${a.onChange}></sp-checkbox>`,
  parameters: { layout: 'padded', design: { type: 'figma', url: 'https://www.figma.com/design/PhcMPmdpkpgxH3N83SvpBY/Spartan-DS?node-id=35-75' }, docs: { description: { component: 'Native form-associated Checkbox with checked and indeterminate states, 20px Selection indicators, 44px interaction targets and independent System selection/focus. Style owns indicator radii and unselected surfaces. Density adjusts surrounding text and gaps. Slots compose label, description and error.' } } },
};
export default meta;
type Story = StoryObj<Args>;
const stack = 'display:grid;gap:var(--sp-form-group-gap);max-inline-size:100%';

export const Playground: Story = { play: async ({ canvasElement, args }) => {
  const host = canvasElement.querySelector<SpCheckbox>('sp-checkbox')!, input = host.shadowRoot!.querySelector('input')!;
  await userEvent.click(input); await expect(host.checked).toBe(true); await expect(args.onInput).toHaveBeenCalledTimes(1); await expect(args.onChange).toHaveBeenCalledTimes(1);
} };
export const Values: Story = { render: () => html`<div style=${stack}><sp-checkbox label="Unchecked"></sp-checkbox><sp-checkbox label="Checked" checked></sp-checkbox><sp-checkbox label="Mixed" indeterminate></sp-checkbox></div>` };
export const States: Story = { render: () => html`<div style=${stack}><sp-checkbox label="Default"></sp-checkbox><sp-checkbox label="Invalid" error="Review this choice"></sp-checkbox><sp-checkbox label="Checked invalid" checked invalid></sp-checkbox><sp-checkbox label="Disabled unchecked" disabled></sp-checkbox><sp-checkbox label="Disabled checked" checked disabled></sp-checkbox><sp-checkbox label="Disabled mixed" indeterminate disabled></sp-checkbox></div>` };
export const Styles: Story = { render: () => html`<div style=${stack}>${['Atlas', 'Selene', 'Helios', 'Ares'].map(style => html`<section data-sp-mode-style=${style}><sp-checkbox label=${style + ' unchecked'}></sp-checkbox><sp-checkbox label=${style + ' checked'} checked></sp-checkbox><sp-checkbox label=${style + ' mixed'} indeterminate></sp-checkbox></section>`)}</div>` };
export const Density: Story = { render: () => html`<div style=${stack}>${['Relaxed', 'Compact'].map(density => html`<section data-sp-mode-density=${density}><sp-checkbox label=${density + ' typography and gaps'} checked description="20px indicator and 44px target stay fixed"></sp-checkbox></section>`)}</div>` };
export const Composition: Story = { render: () => html`<div style=${stack}><sp-checkbox><span slot="label">Receive product updates</span><span slot="description">Only relevant announcements.</span></sp-checkbox><sp-checkbox><span slot="label">Accept the <a href="#terms">terms</a></span><span slot="error">Please review the linked terms.</span></sp-checkbox><sp-checkbox aria-label="Select row" description="An explicit name supports controls without a visible label"></sp-checkbox></div>` };

const updateGroup = (event: Event) => {
  const root = event.currentTarget as HTMLElement, changed = event.target as SpCheckbox;
  const parent = root.querySelector<SpCheckbox>('[data-all]')!, children = [...root.querySelectorAll<SpCheckbox>('[data-item]')];
  if (changed === parent) for (const child of children) child.checked = parent.checked;
  else { parent.checked = children.every(child => child.checked); parent.indeterminate = children.some(child => child.checked) && !parent.checked; }
};
export const Group: Story = {
  render: () => html`<fieldset style="border:0;padding:0;min-inline-size:0" @change=${updateGroup}><legend>Desktop items</legend><div style=${stack}><sp-checkbox data-all label="Select all" description="A mixed parent reflects some selected children"></sp-checkbox><div style="display:grid;margin-inline-start:var(--sp-checkbox-target-size)">${['Hard disks', 'External disks', 'Connected servers'].map(label => html`<sp-checkbox data-item label=${label}></sp-checkbox>`)}</div></div></fieldset>`,
  play: async ({ canvasElement }) => {
    const parent = canvasElement.querySelector<SpCheckbox>('[data-all]')!, child = canvasElement.querySelector<SpCheckbox>('[data-item]')!;
    await userEvent.click(child.shadowRoot!.querySelector('input')!); await expect(parent.indeterminate).toBe(true);
    await userEvent.click(parent.shadowRoot!.querySelector('input')!); await waitFor(() => expect([...canvasElement.querySelectorAll<SpCheckbox>('[data-item]')].every(el => el.checked)).toBe(true)); await expect(parent.indeterminate).toBe(false);
  },
};
export const Table: Story = { render: () => html`<div style="overflow:auto;max-inline-size:100%" @change=${updateGroup}><table style="border-collapse:collapse;text-align:start"><thead><tr><th><sp-checkbox data-all aria-label="Select all rows"></sp-checkbox></th><th style="padding-inline:var(--sp-table-cell-padding-x)">Name</th></tr></thead><tbody>${['Sarah Chen', 'Marcus Rodriguez', 'Priya Patel'].map(name => html`<tr><td><sp-checkbox data-item aria-label=${'Select ' + name}></sp-checkbox></td><td style="padding-inline:var(--sp-table-cell-padding-x)">${name}</td></tr>`)}</tbody></table></div>` };
export const InForm: Story = {
  render: () => html`<form style=${stack} @submit=${(event: SubmitEvent) => { event.preventDefault(); const form = event.target as HTMLFormElement; form.querySelector('output')!.value = String(new FormData(form).get('terms')); }}><sp-checkbox label="Required terms" name="terms" value="accepted" required></sp-checkbox><div style="display:flex;gap:var(--sp-form-group-gap)"><sp-button type="submit">Continue</sp-button><sp-button type="reset" variant="secondary">Reset</sp-button></div><output></output></form>`,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<SpCheckbox>('sp-checkbox')!;
    await userEvent.click(host.shadowRoot!.querySelector('input')!); await userEvent.click(canvasElement.querySelector('[type=submit]')!.shadowRoot!.querySelector('button')!); await expect(canvasElement.querySelector('output')!.value).toBe('accepted');
    await userEvent.click(canvasElement.querySelector('[type=reset]')!.shadowRoot!.querySelector('button')!); await expect(host.checked).toBe(false);
  },
};
export const ThemeContract: Story = { render: () => html`<section data-sp-mode-style="Helios" data-sp-mode-primary="Purple" data-sp-mode-color-scheme="Dark" data-sp-mode-contrast="High" data-sp-mode-density="Compact" dir="rtl" style="display:grid;gap:var(--sp-form-group-gap);padding:var(--sp-surface-content-padding);background:var(--sp-color-surface-default);color:var(--sp-color-foreground-default);max-inline-size:100%;box-sizing:border-box"><p dir="ltr" style="margin:0">Helios · Compact · Dark · High contrast · RTL</p><sp-checkbox label="Selection uses System despite Purple Brand" checked></sp-checkbox><sp-checkbox label="Invalid mixed choice" indeterminate error="Danger boundary and independent System focus"></sp-checkbox><div data-sp-mode-style="Ares" data-sp-mode-density="Relaxed" dir="ltr"><sp-checkbox label="Nested Ares, Relaxed, LTR" checked description="Scheme, contrast and hue inherit"></sp-checkbox></div></section>` };
