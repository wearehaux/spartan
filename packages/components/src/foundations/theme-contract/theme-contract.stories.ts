import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { contractStyles } from './contract.styles';

type Args = { appearance: 'default'|'outlined'|'filled'; size: 'small'|'base'; invalid: boolean; disabled: boolean; readonly: boolean };
const meta = {
  title: 'Foundations/Theme contract',
  parameters: { layout: 'fullscreen', docs: { description: { component: 'Shared token contract fixtures. Use the global Style, Theme, High contrast, Hue and Density controls. Branded actions follow Hue; selection and focus use independent System roles. Appearance is a local field treatment override. These native field, table and menu samples demonstrate the infrastructure contract; production components remain on their own issues.' } } },
  args: { appearance: 'default', size: 'base', invalid: false, disabled: false, readonly: false },
  argTypes: { appearance: { control: 'select', options: ['default','outlined','filled'] }, size: { control: 'select', options: ['small','base'] }, invalid: { control: 'boolean' }, disabled: { control: 'boolean' }, readonly: { control: 'boolean' } },
  render: (args, context) => html`
    <style>${contractStyles.cssText}</style>
    <main class="sp-contract">
      <h1>Theme contract</h1>
      <p>Change one setting to review its responsibility. These are shared-token fixtures.</p>
      <div class="contract-grid">
        <section class="contract-surface">
          <h2>Brand, System and fields</h2>
          <sp-button>Branded action</sp-button>
          <label>Workspace name
            <input class="contract-field" data-kind="single" data-appearance=${args.appearance} data-size=${args.size} type="text" value="Spartan workspace" ?disabled=${args.disabled} ?readonly=${args.readonly} aria-invalid=${String(args.invalid)} aria-describedby=${`${context.id}-error`}>
          </label>
          <label>Description
            <textarea class="contract-field" data-appearance=${args.appearance} data-size=${args.size} rows="3" ?disabled=${args.disabled} ?readonly=${args.readonly} aria-invalid=${String(args.invalid)}>Multiline fields keep bounded corners, including Helios.</textarea>
          </label>
          <p id=${`${context.id}-error`} class="contract-error" ?hidden=${!args.invalid}>Enter a valid workspace name.</p>
          <label class="contract-choice"><input type="checkbox" checked ?disabled=${args.disabled}> System selection</label>
          <p>Keyboard focus stays System-colored, including on an invalid field. Disabled styling takes precedence over the invalid border.</p>
        </section>
        <section class="contract-surface">
          <h2>Repeated content and spacing</h2>
          <table class="contract-table"><caption>Workspace usage</caption><thead><tr><th scope="col">Workspace</th><th scope="col">Projects</th></tr></thead><tbody><tr><td>Design system</td><td>12</td></tr><tr><td>Long content grows naturally instead of being clipped to a row height.</td><td>4</td></tr></tbody></table>
          <p>Legend spacing follows Density; data and text remain readable.</p>
          <div class="contract-legend" aria-label="Chart legend"><span>● Active projects</span><span>● Archived projects</span></div>
          <h3>Menu item metrics</h3><div class="contract-menu"><button type="button">Rename workspace</button><button type="button">Workspace settings</button></div>
          <h3>Card anatomy</h3><div class="contract-card">Card keeps its approved 16px horizontal and 20px vertical padding. Generic surface content uses 24/16px by Density.</div>
        </section>
      </div>
    </main>`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;
export const Playground: Story = {};
export const Invalid: Story = { args: { invalid: true } };
export const DisabledInvalid: Story = { args: { disabled: true, invalid: true } };
