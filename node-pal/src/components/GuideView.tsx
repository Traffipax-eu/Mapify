import {
  ArrowRightLeft,
  BookMarked,
  Box,
  Cloud,
  Copy,
  Database,
  FileSpreadsheet,
  GitBranch,
  KeyRound,
  Layers,
  Lock,
  Maximize2,
  MousePointer2,
  Shield,
  Sparkles,
  Undo2,
  Ungroup,
} from "lucide-react";
import { BRAND } from "@/lib/brand";

function GuideSection({
  id,
  icon: Icon,
  iconClass,
  title,
  children,
  illustration,
}: {
  id: string;
  icon: typeof Database;
  iconClass?: string;
  title: string;
  children: React.ReactNode;
  illustration?: React.ReactNode;
}) {
  return (
    <section id={id} className="guide-section">
      <div className="guide-section__header">
        <div className={`guide-section__icon ${iconClass ?? ""}`}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
        <h2 className="guide-section__title">{title}</h2>
      </div>
      <div className="guide-section__body">{children}</div>
      {illustration ? <div className="guide-section__illustration">{illustration}</div> : null}
    </section>
  );
}

function MiniBlockIllustration() {
  return (
    <div className="guide-mini guide-mini--block" aria-hidden>
      <div className="guide-mini__accent" />
      <div className="guide-mini__block-header">
        <Database className="h-3.5 w-3.5 text-[#0067F5]" />
        <span>Customer DB</span>
      </div>
      <div className="guide-mini__field-row">
        <span className="guide-mini__dot guide-mini__dot--left" />
        <span>email</span>
        <span className="guide-mini__dot guide-mini__dot--right" />
      </div>
      <div className="guide-mini__field-row">
        <span className="guide-mini__dot guide-mini__dot--left" />
        <span>signup_date</span>
        <span className="guide-mini__dot guide-mini__dot--right" />
      </div>
      <span className="guide-mini__handle guide-mini__handle--left" />
      <span className="guide-mini__handle guide-mini__handle--right" />
    </div>
  );
}

function MiniCustomObjectIllustration() {
  return (
    <div className="guide-mini guide-mini--object" aria-hidden>
      <div className="guide-mini__object-card">
        <div className="guide-mini__object-icon">
          <FileSpreadsheet className="h-5 w-5" />
        </div>
        <span className="guide-mini__object-label">Sales Report</span>
      </div>
      <svg className="guide-mini__connector" viewBox="0 0 120 40" fill="none">
        <path
          d="M4 20 H116"
          stroke={BRAND.blue}
          strokeWidth="2"
          strokeDasharray="4 3"
          markerEnd="url(#guide-arrow)"
        />
        <defs>
          <marker id="guide-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0 0 L8 4 L0 8 Z" fill={BRAND.blue} />
          </marker>
        </defs>
      </svg>
    </div>
  );
}

function MiniConnectionIllustration() {
  return (
    <div className="guide-mini guide-mini--connections" aria-hidden>
      <div className="guide-mini__conn-node">
        <span className="guide-mini__handle guide-mini__handle--right" />
        <span>Block</span>
      </div>
      <svg className="guide-mini__conn-line" viewBox="0 0 80 24" fill="none">
        <path d="M4 12 C28 4, 52 20, 76 12" stroke={BRAND.blue} strokeWidth="2" fill="none" />
      </svg>
      <div className="guide-mini__conn-object">
        <Layers className="h-4 w-4 text-[#0067F5]" />
      </div>
    </div>
  );
}

function MiniAttributesIllustration() {
  return (
    <div className="guide-mini guide-mini--attrs" aria-hidden>
      <div className="guide-mini__sidebar">
        <p className="guide-mini__sidebar-label">Attributes</p>
        <div className="guide-mini__kv-row">
          <span>Owner</span>
          <span>Data Team</span>
        </div>
        <div className="guide-mini__kv-row">
          <span>PII</span>
          <span>Yes</span>
        </div>
        <button type="button" className="guide-mini__add-btn">
          + Add property
        </button>
      </div>
    </div>
  );
}

const TOC = [
  { id: "blocks", label: "Blocks" },
  { id: "custom-objects", label: "Custom Objects" },
  { id: "dataflows", label: "Dataflows" },
  { id: "attributes", label: "Attributes" },
  { id: "controls", label: "Canvas Controls" },
  { id: "cloud", label: "Cloud Versions" },
  { id: "sharing", label: "Sharing & Embed" },
] as const;

export function GuideView() {
  return (
    <div className="guide-view flex flex-1 flex-col overflow-hidden">
      <div className="guide-view__hero shrink-0 border-b border-border px-6 py-8 md:px-10">
        <div className="guide-view__hero-inner mx-auto max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-white/80 px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm">
            <BookMarked className="h-3.5 w-3.5 text-[#0067F5]" />
            Product guide
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">How Mapify works</h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground md:text-lg">
            Welcome to Mapify. Visualize your data architecture, map your dataflows, and build your lineage with ease.
          </p>
        </div>
      </div>

      <div className="guide-view__layout flex flex-1 min-h-0">
        <nav className="guide-view__toc hidden w-52 shrink-0 border-r border-border bg-white/50 px-4 py-6 lg:block">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">On this page</p>
          <ul className="space-y-1">
            {TOC.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="guide-view__toc-link">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="guide-view__content flex-1 overflow-y-auto px-6 py-8 md:px-10">
          <div className="guide-view__sections mx-auto max-w-3xl space-y-14 pb-16">
            <GuideSection
              id="blocks"
              icon={Database}
              iconClass="guide-section__icon--blue"
              title="Managing Blocks (Systems & Databases)"
              illustration={<MiniBlockIllustration />}
            >
              <p>
                <strong>Blocks</strong> represent systems, databases, or logical data domains on your canvas. Drag a block
                type from the left sidebar onto the canvas, name your instance, and start modeling.
              </p>
              <ul>
                <li>
                  <strong>Fields</strong> are rows inside a block—add them inline at the bottom of the block. Names save
                  instantly as you type and press Enter.
                </li>
                <li>
                  Click a field or block once to <strong>select</strong> it (fields show a blue
                  highlight). <strong>Double-click</strong> a block or field to open the metadata
                  sidebar for editing.
                </li>
                <li>
                  Use the pencil icon on a field row to jump straight into the sidebar without
                  double-clicking.
                </li>
                <li>
                  Empty blocks stay clean: there is no forced &ldquo;General&rdquo; section header until you create
                  explicit sections or add grouped fields.
                </li>
                <li>
                  Use the gear icon on a block in the sidebar to open the <strong>Schema Editor</strong> and define
                  reusable property columns for your glossary.
                </li>
              </ul>
            </GuideSection>

            <GuideSection
              id="custom-objects"
              icon={Layers}
              iconClass="guide-section__icon--violet"
              title="Custom Objects (Data Artifacts)"
              illustration={<MiniCustomObjectIllustration />}
            >
              <p>
                <strong>Custom Objects</strong> are simplified blocks for files, reports, scripts, dashboards, API
                endpoints, and more. They appear as sleek rounded squares with an icon and title—no internal fields.
              </p>
              <ul>
                <li>
                  Drag preset types (Excel, CSV, Power BI, Python Script, etc.) from the <strong>Custom Objects</strong>{" "}
                  section in the sidebar, or create your own icon and color.
                </li>
                <li>
                  Double-click the title on canvas to rename. Custom objects are designed as lightweight, connectable
                  endpoints in your lineage—not miniature databases.
                </li>
                <li>
                  They do not expose field rows; connect them at the object level to show where data lands or originates.
                </li>
              </ul>
            </GuideSection>

            <GuideSection
              id="dataflows"
              icon={GitBranch}
              iconClass="guide-section__icon--teal"
              title="Dataflows & Connections (Lineage)"
              illustration={<MiniConnectionIllustration />}
            >
              <p>
                Draw <strong>dataflows</strong> between blocks, individual fields, and custom objects to document how
                data moves through your architecture.
              </p>
              <ul>
                <li>
                  <strong>Connection dots</strong> appear on block sides and on each field row (left
                  = in, right = out). Drag from any dot to a compatible target—direction is flexible.
                </li>
                <li>
                  Connect <strong>field → field</strong> for granular lineage, or{" "}
                  <strong>object ↔ field</strong> in either direction (e.g. JSON file →{" "}
                  <code>email</code> column).
                </li>
                <li>
                  When connecting from above or below, release over the target field row—the line
                  snaps to that row instead of the block header.
                </li>
                <li>
                  Drop a field connection onto a <strong>Custom Object</strong> card—the whole object
                  acts as a snap target.
                </li>
                <li>
                  Click a connection to open edge settings: label, line style, arrows, and bend
                  points (double-click the line to add elbows).
                </li>
                <li>
                  Use the <strong>Lineage</strong> toolbar after selecting a field to trace upstream
                  or downstream dependencies.
                </li>
              </ul>
            </GuideSection>

            <GuideSection
              id="attributes"
              icon={KeyRound}
              iconClass="guide-section__icon--amber"
              title="Schema Editor & Attributes"
              illustration={<MiniAttributesIllustration />}
            >
              <p>
                Beyond built-in schema columns, Mapify supports freeform <strong>attributes</strong> (key-value pairs) on
                blocks and fields.
              </p>
              <ul>
                <li>
                  Select a block or field on the canvas to open the metadata sidebar on the right.
                </li>
                <li>
                  Click <strong>+ Add property</strong>, type a key, then a value. Changes persist on blur or Enter—no
                  save button required.
                </li>
                <li>
                  Hover a block or field on the canvas to preview attribute chips without opening the sidebar.
                </li>
                <li>
                  The <strong>Glossary</strong> tab aggregates field-level schema properties across your canvas for a
                  dictionary-style reference.
                </li>
              </ul>
            </GuideSection>

            <GuideSection
              id="controls"
              icon={MousePointer2}
              iconClass="guide-section__icon--slate"
              title="Canvas Controls & Shortcuts"
            >
              <p>Mapify follows familiar diagramming patterns with a few power-user shortcuts.</p>
              <div className="guide-shortcuts">
                <div className="guide-shortcut">
                  <Undo2 className="h-4 w-4 shrink-0 text-[#0067F5]" />
                  <div>
                    <p className="font-medium text-foreground">Undo &amp; redo</p>
                    <p className="text-sm text-muted-foreground">
                      <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Y</kbd> (or{" "}
                      <kbd>⌘</kbd> on Mac) for canvas edits in the current session.
                    </p>
                  </div>
                </div>
                <div className="guide-shortcut">
                  <Copy className="h-4 w-4 shrink-0 text-[#0067F5]" />
                  <div>
                    <p className="font-medium text-foreground">Copy &amp; paste</p>
                    <p className="text-sm text-muted-foreground">
                      Select one or more objects, then <kbd>Ctrl</kbd>+<kbd>C</kbd> / <kbd>Ctrl</kbd>+<kbd>V</kbd>{" "}
                      ( <kbd>⌘</kbd> on Mac) to duplicate blocks, custom objects, and drawing elements.
                    </p>
                  </div>
                </div>
                <div className="guide-shortcut">
                  <Ungroup className="h-4 w-4 shrink-0 text-[#0067F5]" />
                  <div>
                    <p className="font-medium text-foreground">Container ungroup</p>
                    <p className="text-sm text-muted-foreground">
                      Select a container and click <strong>Ungroup</strong> to release child blocks onto the canvas
                      without deleting them.
                    </p>
                  </div>
                </div>
                <div className="guide-shortcut">
                  <Maximize2 className="h-4 w-4 shrink-0 text-[#0067F5]" />
                  <div>
                    <p className="font-medium text-foreground">Resize text &amp; notes</p>
                    <p className="text-sm text-muted-foreground">
                      Text boxes and sticky notes support dynamic resizing—drag their corners to fit your layout.
                    </p>
                  </div>
                </div>
                <div className="guide-shortcut">
                  <Box className="h-4 w-4 shrink-0 text-[#0067F5]" />
                  <div>
                    <p className="font-medium text-foreground">Drawing tools</p>
                    <p className="text-sm text-muted-foreground">
                      Drag containers, text boxes, and sticky notes from the sidebar. Use <strong>Draw</strong> in the
                      header for freehand annotations.
                    </p>
                  </div>
                </div>
              </div>
            </GuideSection>

            <GuideSection
              id="cloud"
              icon={Cloud}
              iconClass="guide-section__icon--blue"
              title="Cloud Version History"
            >
              <p>
                When Supabase is configured, save <strong>named snapshots</strong> of your sheet to
                the cloud and restore them later—without overwriting your live local canvas until
                you choose Restore.
              </p>
              <ul>
                <li>
                  <strong>Save Version</strong> (header) opens a dialog to name the current sheet
                  snapshot (nodes, edges, schema, drawings).
                </li>
                <li>
                  <strong>History</strong> lists cloud versions for the active sheet.{" "}
                  <strong>Preview</strong> loads read-only; <strong>Restore</strong> replaces the
                  sheet contents.
                </li>
                <li>
                  <strong>Load from Cloud</strong> (File menu) lists encrypted backups for the
                  project you have open only — not other projects.
                </li>
                <li>
                  Delete a single version with the trash icon, or use{" "}
                  <strong>Delete cloud data for &quot;…&quot;</strong> at the bottom of History to
                  remove all cloud data for the open project (other projects are untouched).
                </li>
                <li>
                  Cloud version history is separate from <strong>Save to Cloud</strong> in the File
                  menu—that path stores encrypted ciphertext for password-protected backup.
                </li>
              </ul>
            </GuideSection>

            <GuideSection
              id="sharing"
              icon={Shield}
              iconClass="guide-section__icon--green"
              title="Sharing, View Links & Embedding"
            >
              <p>
                Share diagrams with teammates or stakeholders. Mapify offers read-only view links,
                encrypted backups, and embed snippets—pick the mode that fits your audience.
              </p>
              <ul>
                <li>
                  <strong>Share</strong> (header) generates a <strong>read-only view link</strong>{" "}
                  anyone can open in the browser (pan &amp; zoom only). Optional password encrypts
                  the link payload.
                </li>
                <li>
                  <strong>Generate embed snippet</strong> (File menu) builds an iframe URL for
                  Confluence or internal portals—also read-only, with optional password.
                </li>
                <li>
                  <strong>Export Encrypted</strong> packages your workspace into a password-protected
                  file. Decryption runs entirely in the browser.
                </li>
                <li>
                  <strong>Save to Cloud</strong> uploads ciphertext only when Supabase is
                  configured—Supabase never sees your encryption password.
                </li>
                <li>
                  For static decks, use <strong>visual export</strong> (PNG, JPEG, or PDF) from the
                  File menu.
                </li>
              </ul>
              <div className="guide-callout">
                <Lock className="h-4 w-4 shrink-0 text-[#0067F5]" />
                <p>
                  View links and embeds are snapshots at generation time—they do not live-sync when
                  you edit locally. Save a new version or regenerate the link after major changes.
                </p>
              </div>
            </GuideSection>

            <footer className="guide-footer">
              <Sparkles className="h-4 w-4 text-[#0DC5E7]" />
              <p>
                Ready to map? Switch to the <strong>Canvas</strong> tab and drag your first block from the sidebar.
              </p>
              <ArrowRightLeft className="h-4 w-4 text-muted-foreground opacity-50" />
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
