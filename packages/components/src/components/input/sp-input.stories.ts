import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { iconNode } from '../../../.storybook/icons.js';
import './define.js';
import '../button/define.js';
import '../icon-button/define.js';
import type { SpInput, InputAppearance, InputSize, InputType } from './sp-input.js';

type Args = { label: string; placeholder: string; value: string; type: InputType; size: InputSize; appearance: InputAppearance; description: string; error: string; invalid: boolean; disabled: boolean; readOnly: boolean; required: boolean; onInput: (event: Event) => void; onChange: (event: Event) => void };
const meta: Meta<Args> = {
  title: 'Components/Input', component: 'sp-input',
  args: { label: 'Email', placeholder: 'name@example.com', value: '', type: 'text', size: 'base', appearance: 'default', description: 'Your work email', error: '', invalid: false, disabled: false, readOnly: false, required: false, onInput: fn(), onChange: fn() },
  argTypes: { type: { control: 'select', options: ['text', 'email', 'password', 'number'] }, size: { control: 'inline-radio', options: ['sm', 'base'] }, appearance: { control: 'inline-radio', options: ['default', 'outlined', 'filled'] }, onInput: { table: { disable: true } }, onChange: { table: { disable: true } } },
  render: a => html`<div style="inline-size:320px;max-inline-size:100%"><sp-input label=${a.label} placeholder=${a.placeholder} .value=${a.value} type=${a.type} size=${a.size} appearance=${a.appearance} description=${a.description} error=${a.error} ?invalid=${a.invalid} ?disabled=${a.disabled} ?readonly=${a.readOnly} ?required=${a.required} @input=${a.onInput} @change=${a.onChange}></sp-input></div>`,
  parameters: { design: { type: 'figma', url: 'https://www.figma.com/design/PhcMPmdpkpgxH3N83SvpBY/Spartan-DS?node-id=32-105' }, docs: { description: { component: 'Native text entry inside Lit, with shared Field Style/Density tokens, Default/Outlined/Filled treatment and form association. Label, description, error and leading/trailing slots support composition. Current value is non-reflected; the value attribute supplies the reset default. Type supports the four Figma text-entry families; file and selection controls are separate components.' } } },
};
export default meta;
type Story = StoryObj<Args>;
const grid = 'display:grid;gap:var(--sp-form-group-gap);inline-size:320px;max-inline-size:100%';

export const Playground: Story = { play: async ({ canvasElement, args }) => {
  const host = canvasElement.querySelector<SpInput>('sp-input')!;
  await userEvent.type(host.shadowRoot!.querySelector('input')!, 'hello');
  await expect(host.value).toBe('hello'); await expect(args.onInput).toHaveBeenCalledTimes(5);
} };
export const Appearances: Story = { render: () => html`<div style=${grid}>${(['default', 'outlined', 'filled'] as const).map(appearance => html`<sp-input label=${appearance} appearance=${appearance} placeholder="Enter a value"></sp-input>`)}</div>` };
export const Sizes: Story = { render: () => html`<div style=${grid}><sp-input label="Small" size="sm" placeholder="Small"></sp-input><sp-input label="Base" placeholder="Base"></sp-input></div>` };
export const Types: Story = { render: () => html`<div style=${grid}>${(['text', 'email', 'password', 'number'] as const).map(type => html`<sp-input type=${type} label=${type} value=${type === 'number' ? '12' : type === 'email' ? 'name@example.com' : 'Example'}></sp-input>`)}</div>` };
export const States: Story = { render: () => html`<div style=${grid}><sp-input label="Default" placeholder="Enter a value"></sp-input><sp-input label="Invalid" value="wrong" error="Use a valid address"></sp-input><sp-input label="Disabled" value="Unavailable" disabled></sp-input><sp-input label="Read only" value="Read this value" readonly></sp-input></div>` };
export const Styles: Story = { render: () => html`<div style=${grid}>${['Atlas', 'Selene', 'Helios', 'Ares'].map(style => html`<div data-sp-mode-style=${style}><sp-input label=${style} placeholder="Default follows Style"></sp-input></div>`)}</div>` };
export const Density: Story = { render: () => html`<div style=${grid}>${['Relaxed', 'Compact'].map(density => html`<section data-sp-mode-density=${density} style=${grid}><sp-input label=${density + ' Small'} size="sm" placeholder="Enter a value"></sp-input><sp-input label=${density + ' Base'} placeholder="Enter a value"></sp-input></section>`)}</div>` };
export const Composition: Story = {
  render: () => html`<div style=${grid}><sp-input label="Search" description="A named action remains independently focusable" value="Find a record">${iconNode('IconPlusSmall', 'start')}<sp-icon-button slot="end" size="xs" variant="ghost" label="Clear search" @click=${(event: Event) => { const input = (event.currentTarget as HTMLElement).closest('sp-input') as SpInput; input.value = ''; input.focus(); }}>${iconNode('IconPlusMedium')}</sp-icon-button></sp-input><sp-input invalid><span slot="label">Slotted label</span><span slot="description">Rich supporting content belongs in its slot.</span><span slot="error">Inline error remains linked to the control.</span></sp-input></div>`,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<SpInput>('sp-input')!;
    await userEvent.click(host.querySelector('sp-icon-button')!.shadowRoot!.querySelector('button')!);
    await expect(host.value).toBe('');
  },
};
export const InForm: Story = {
  render: () => html`<form style=${grid} @submit=${(event: SubmitEvent) => { event.preventDefault(); const form = event.target as HTMLFormElement; form.querySelector('output')!.value = [...new FormData(form, event.submitter)].map(([k, v]) => `${k}=${v}`).join(', '); }}><sp-input label="Title" name="title" value="Draft" required></sp-input><div style="display:flex;gap:var(--sp-field-gap)"><sp-button type="submit" name="intent" value="save">Save</sp-button><sp-button type="reset" variant="secondary">Reset</sp-button></div><output></output></form>`,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<SpInput>('sp-input')!, input = host.shadowRoot!.querySelector('input')!;
    host.focus(); host.select(); await userEvent.type(input, 'Edited', { skipClick: true }); await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(canvasElement.querySelector('output')).toHaveTextContent('title=Edited, intent=save'));
    await userEvent.click(canvasElement.querySelector('[type=reset]')!.shadowRoot!.querySelector('button')!);
    await expect(host.value).toBe('Draft');
  },
};
export const ThemeContract: Story = {
  parameters: { layout: 'padded' },
  render: () => html`<section data-sp-mode-style="Helios" data-sp-mode-primary="Purple" data-sp-mode-color-scheme="Dark" data-sp-mode-contrast="High" data-sp-mode-density="Compact" dir="rtl" style="display:grid;gap:var(--sp-form-group-gap);padding:var(--sp-surface-content-padding);background:var(--sp-color-surface-default);color:var(--sp-color-foreground-default);inline-size:400px;max-inline-size:100%;box-sizing:border-box;min-inline-size:0"><p dir="ltr" style="margin:0">Helios · Compact · Dark · High contrast · RTL</p><sp-input label="Email" placeholder="name@example.com" error="Error keeps Danger while focus uses System"></sp-input><div data-sp-mode-style="Ares" data-sp-mode-density="Relaxed" dir="ltr"><sp-input label="Nested Ares, Relaxed, LTR" appearance="filled" description="Dark and High contrast inherit" placeholder="Enter a value"></sp-input></div></section>`,
};
