import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import './define.js';
import '../button/define.js';
import type { SpTextarea, TextareaAppearance, TextareaSize, TextareaResize, TextareaWrap } from './sp-textarea.js';

type Args = { label: string; placeholder: string; value: string; size: TextareaSize; appearance: TextareaAppearance; rows: number; resize: TextareaResize; autoGrow: boolean; wrap: TextareaWrap; description: string; error: string; invalid: boolean; disabled: boolean; readOnly: boolean; required: boolean; onInput: (event: Event) => void; onChange: (event: Event) => void };
const meta: Meta<Args> = {
  title: 'Components/Textarea', component: 'sp-textarea',
  args: { label: 'Message', placeholder: 'Write a message…', value: '', size: 'base', appearance: 'default', rows: 2, resize: 'vertical', autoGrow: false, wrap: 'soft', description: 'Tell us more about your request', error: '', invalid: false, disabled: false, readOnly: false, required: false, onInput: fn(), onChange: fn() },
  argTypes: { size: { control: 'inline-radio', options: ['sm', 'base'] }, appearance: { control: 'inline-radio', options: ['default', 'outlined', 'filled'] }, resize: { control: 'inline-radio', options: ['vertical', 'none'] }, wrap: { control: 'inline-radio', options: ['soft', 'off'] }, onInput: { table: { disable: true } }, onChange: { table: { disable: true } } },
  render: a => html`<div style="inline-size:360px;max-inline-size:100%"><sp-textarea label=${a.label} placeholder=${a.placeholder} .value=${a.value} size=${a.size} appearance=${a.appearance} .rows=${a.rows} resize=${a.resize} ?autogrow=${a.autoGrow} wrap=${a.wrap} description=${a.description} error=${a.error} ?invalid=${a.invalid} ?disabled=${a.disabled} ?readonly=${a.readOnly} ?required=${a.required} @input=${a.onInput} @change=${a.onChange}></sp-textarea></div>`,
  parameters: { layout: 'padded', design: { type: 'figma', url: 'https://www.figma.com/design/PhcMPmdpkpgxH3N83SvpBY/Spartan-DS?node-id=32-173' }, docs: { description: { component: 'Native multiline editing using shared Spartan Field styles and form mechanics. Default follows Style, Small/Base follow Density, and Helios corners are bounded for multiline content. Vertical resizing is native; optional autogrow follows text and container changes. Enter inserts a newline. Label, description and error have native slots.' } } },
};
export default meta;
type Story = StoryObj<Args>;
const grid = 'display:grid;gap:var(--sp-form-group-gap);inline-size:360px;max-inline-size:100%';

export const Playground: Story = { play: async ({ canvasElement, args }) => {
  const host = canvasElement.querySelector<SpTextarea>('sp-textarea')!;
  await userEvent.type(host.shadowRoot!.querySelector('textarea')!, 'Hello{Enter}world');
  await expect(host.value).toBe('Hello\nworld'); await expect(args.onInput).toHaveBeenCalled();
} };
export const Appearances: Story = { render: () => html`<div style=${grid}>${(['default', 'outlined', 'filled'] as const).map(appearance => html`<sp-textarea label=${appearance} appearance=${appearance} placeholder="Write a message…"></sp-textarea>`)}</div>` };
export const Sizes: Story = { render: () => html`<div style=${grid}><sp-textarea label="Small" size="sm" placeholder="Small type and spacing"></sp-textarea><sp-textarea label="Base" placeholder="Base type and spacing"></sp-textarea></div>` };
export const Content: Story = { render: () => html`<div style=${grid}><sp-textarea label="Empty" placeholder="Write a message…"></sp-textarea><sp-textarea label="Entered text" value="This is an example of an entered message."></sp-textarea><sp-textarea label="More rows" rows="4" value="First line&#10;Second line&#10;Third line"></sp-textarea></div>` };
export const States: Story = { render: () => html`<div style=${grid}><sp-textarea label="Default" placeholder="Write a message…"></sp-textarea><sp-textarea label="Invalid" value="Please review" error="Describe your request"></sp-textarea><sp-textarea label="Disabled" value="Unavailable" disabled></sp-textarea><sp-textarea label="Read only" value="Read this message" readonly></sp-textarea></div>` };
export const Styles: Story = { render: () => html`<div style=${grid}>${['Atlas', 'Selene', 'Helios', 'Ares'].map(style => html`<div data-sp-mode-style=${style}><sp-textarea label=${style} placeholder="Default follows Style"></sp-textarea></div>`)}</div>` };
export const Density: Story = { render: () => html`<div style=${grid}>${['Relaxed', 'Compact'].map(density => html`<section data-sp-mode-density=${density} style=${grid}><sp-textarea label=${density + ' Small'} size="sm" placeholder="Write a message…"></sp-textarea><sp-textarea label=${density + ' Base'} placeholder="Write a message…"></sp-textarea></section>`)}</div>` };
export const Composition: Story = { render: () => html`<div style=${grid}><sp-textarea><span slot="label">Slotted label</span><span slot="description">Supporting text stays with the field.</span><span slot="error">Use an informative message.</span></sp-textarea><div><sp-textarea label="Comment" description="Actions remain independently owned" placeholder="Write your comment"></sp-textarea><sp-button style="margin-block-start:var(--sp-field-gap)">Send comment</sp-button></div></div>` };
export const AutoGrow: Story = {
  render: () => html`<div style=${grid}><sp-textarea label="Auto growing" description="Type or paste a longer message; deleting content shrinks the field" autogrow></sp-textarea><sp-textarea label="Native resize" description="Drag the native vertical resize handle"></sp-textarea><sp-textarea label="No resize" resize="none" value="Fixed rows with native scrolling"></sp-textarea></div>`,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<SpTextarea>('sp-textarea')!, area = host.shadowRoot!.querySelector('textarea')!, before = area.getBoundingClientRect().height;
    await userEvent.type(area, 'One{Enter}Two{Enter}Three{Enter}Four{Enter}Five');
    await expect(area.getBoundingClientRect().height).toBeGreaterThan(before);
  },
};
export const InForm: Story = {
  render: () => html`<form style=${grid} @submit=${(event: SubmitEvent) => { event.preventDefault(); const form = event.target as HTMLFormElement; form.querySelector('output')!.value = String(new FormData(form).get('message')); }}><sp-textarea label="Message" name="message" value="Draft" required></sp-textarea><div style="display:flex;gap:var(--sp-field-gap)"><sp-button type="submit">Send</sp-button><sp-button type="reset" variant="secondary">Reset</sp-button></div><output style="white-space:pre-wrap"></output></form>`,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<SpTextarea>('sp-textarea')!, area = host.shadowRoot!.querySelector('textarea')!;
    host.focus(); host.select(); await userEvent.type(area, 'Edited{Enter}message', { skipClick: true });
    await expect(canvasElement.querySelector('output')).toHaveTextContent('');
    await userEvent.click(canvasElement.querySelector('[type=submit]')!.shadowRoot!.querySelector('button')!);
    await waitFor(() => expect(canvasElement.querySelector('output')!.value).toBe('Edited\nmessage'));
    await userEvent.click(canvasElement.querySelector('[type=reset]')!.shadowRoot!.querySelector('button')!); await expect(host.value).toBe('Draft');
  },
};
export const ThemeContract: Story = {
  render: () => html`<section data-sp-mode-style="Helios" data-sp-mode-primary="Purple" data-sp-mode-color-scheme="Dark" data-sp-mode-contrast="High" data-sp-mode-density="Compact" dir="rtl" style="display:grid;gap:var(--sp-form-group-gap);padding:var(--sp-surface-content-padding);background:var(--sp-color-surface-default);color:var(--sp-color-foreground-default);inline-size:400px;max-inline-size:100%;box-sizing:border-box;min-inline-size:0"><p dir="ltr" style="margin:0">Helios · Compact · Dark · High contrast · RTL</p><sp-textarea label="Message" placeholder="Write a message…" error="Error keeps Danger while focus uses System"></sp-textarea><div data-sp-mode-style="Ares" data-sp-mode-density="Relaxed" dir="ltr"><sp-textarea label="Nested Ares, Relaxed, LTR" appearance="filled" description="Dark and High contrast inherit" value="A longer message keeps the multiline geometry" autogrow></sp-textarea></div></section>`,
};
