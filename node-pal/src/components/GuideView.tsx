import {
  ArrowRightLeft,
  BookMarked,
  Box,
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
  { id: "sharing", label: "Secure Sharing" },
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
                  <strong>Fields</strong> are rows inside a block—add them inline at the bottom of the node. Names save
                  instantly as you type and press Enter.
                </li>
                <li>
                  Click a field or block to open the <strong>right-hand sidebar</strong> for renaming and custom
                  attributes.
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
                <strong>Custom Objects</strong> are simplified nodes for files, reports, scripts, dashboards, API
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
                  <strong>Minimal connection dots</strong> appear on block sides and on field rows (visible when you
                  hover a field). Drag from any dot to any compatible dot—direction is flexible.
                </li>
                <li>
                  Connect <strong>field to field</strong> for granular lineage (e.g. <code>orders.id</code> →{" "}
                  <code>warehouse.order_id</code>).
                </li>
                <li>
                  Connect a field or block to a <strong>Custom Object</strong> by dropping the line anywhere on the
                  object—the entire card acts as an invisible snap target, so you do not need precise handle aiming.
                </li>
                <li>
                  Click a connection to open edge settings: label, description, line style, and arrow direction.
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
                  Select a node or field on the canvas to open the metadata sidebar on the right.
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
                      Select a container and click <strong>Ungroup</strong> to release child nodes onto the canvas
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
              id="sharing"
              icon={Shield}
              iconClass="guide-section__icon--green"
              title="Secure Sharing & Embedding"
            >
              <p>
                Share architecture maps without exposing raw diagram data on third-party servers. Mapify uses{" "}
                <strong>client-side encryption</strong> before anything is uploaded.
              </p>
              <ul>
                <li>
                  <strong>Export Encrypted</strong> (File menu) packages your workspace into a password-protected file.
                  Only someone with the password can decrypt it—and decryption runs entirely in the browser.
                </li>
                <li>
                  <strong>Save to Cloud</strong> (when Supabase is configured) uploads ciphertext only. Supabase never
                  receives your encryption password or plaintext diagram JSON.
                </li>
                <li>
                  To load a cloud snapshot, choose it from the list and enter the password locally. Wrong passwords fail
                  safely without leaking data.
                </li>
                <li>
                  For read-only stakeholder views, use <strong>visual export</strong> (PNG, JPEG, or PDF) from the File
                  menu—these are static snapshots that need no decryption.
                </li>
              </ul>
              <div className="guide-callout">
                <Lock className="h-4 w-4 shrink-0 text-[#0067F5]" />
                <p>
                  Treat your encryption password like a secret key: share it through a separate secure channel from the
                  snapshot link or file. Mapify cannot recover lost passwords—your data stays zero-knowledge.
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
