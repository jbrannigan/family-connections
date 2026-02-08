import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import TableOfContents from "./table-of-contents";

const tocItems = [
  { id: "getting-started", label: "Getting Started", emoji: "\u{1F680}" },
  { id: "dashboard", label: "Dashboard", emoji: "\u{1F3E0}" },
  { id: "tree-view", label: "Tree View", emoji: "\u{1F333}" },
  { id: "tree-settings", label: "Tree Settings", emoji: "\u2699\uFE0F" },
  { id: "ancestor-descendant", label: "Ancestor & Descendant View", emoji: "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}" },
  { id: "list-view", label: "List View", emoji: "\u{1F4CB}" },
  { id: "search", label: "Search", emoji: "\u{1F50D}" },
  { id: "person-detail", label: "Person Detail", emoji: "\u{1F464}" },
  { id: "stories", label: "Stories & Fun Facts", emoji: "\u{1F4D6}" },
  { id: "treedown-import", label: "TreeDown Import", emoji: "\u{1F4E5}" },
  { id: "export", label: "Export", emoji: "\u{1F4E4}" },
  { id: "collaboration", label: "Invite & Collaboration", emoji: "\u{1F91D}" },
  { id: "guest-mode", label: "Guest Mode", emoji: "\u{1F6E1}\uFE0F" },
  { id: "shortcuts", label: "Keyboard Shortcuts", emoji: "\u2328\uFE0F" },
];

export default async function GuidePage() {
  // Check auth for conditional header link (guide is public, so user may be null)
  let isAuthenticated = false;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    isAuthenticated = !!user;
  } catch {
    // Ignore auth errors — page is public
  }

  return (
    <div className="min-h-screen bg-[#0a1410] text-white">
      <header className="border-b border-white/10 bg-[#0f1a14]/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#7fdb9a] to-[#4a9d6a] text-lg">
              {"\u{1F333}"}
            </div>
            <span className="text-lg font-bold text-[#7fdb9a]">
              Family Connections
            </span>
          </Link>
          <Link
            href={isAuthenticated ? "/dashboard" : "/auth/login"}
            className="text-sm text-white/50 transition hover:text-white/70"
          >
            {isAuthenticated ? "Dashboard" : "Sign In"}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        {/* Page title */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold">User Guide</h1>
          <p className="mx-auto max-w-xl text-lg text-white/60">
            Everything you need to know about using Family Connections to build,
            explore, and share your family tree.
          </p>
        </div>

        {/* Two-column layout: TOC + content */}
        <div className="lg:flex lg:gap-12">
          {/* TOC sidebar */}
          <div className="lg:w-56 lg:shrink-0">
            <TableOfContents items={tocItems} />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1 space-y-12">

            {/* 1. Getting Started */}
            <section id="getting-started" className="scroll-mt-24">
              <SectionHeading emoji={"\u{1F680}"} title="Getting Started" />
              <Card>
                <p className="text-white/70 leading-relaxed">
                  To use Family Connections, you need an account. Head to the{" "}
                  <strong className="text-white">Sign In</strong> page and click{" "}
                  <strong className="text-white">Sign up</strong> to create one. All you
                  need is an email address and a password.
                </p>
                <p className="mt-4 text-white/70 leading-relaxed">
                  Once you have an account, sign in with your email and password. You will
                  be taken to your <strong className="text-white">Dashboard</strong> where
                  you can create or join family graphs.
                </p>
              </Card>
            </section>

            {/* 2. Dashboard */}
            <section id="dashboard" className="scroll-mt-24">
              <SectionHeading emoji={"\u{1F3E0}"} title="Dashboard" />
              <Card>
                <p className="text-white/70 leading-relaxed">
                  Your dashboard shows all the family graphs you belong to. Each graph is a
                  separate family tree that you can view and contribute to.
                </p>
                <ul className="mt-4 space-y-3 text-white/70">
                  <li className="flex gap-3">
                    <span className="text-[#7fdb9a]">+</span>
                    <span>
                      <strong className="text-white">New Graph</strong> &mdash; create a
                      new family graph. Give it a name like &ldquo;The Smith Family&rdquo;
                      and you become the owner.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#7fdb9a]">+</span>
                    <span>
                      <strong className="text-white">Join with Code</strong> &mdash; a
                      family member can share their graph&rsquo;s invite code with you.
                      Enter it here to join their tree.
                    </span>
                  </li>
                </ul>
                <p className="mt-4 text-white/70 leading-relaxed">
                  Click any graph card to open it and start exploring.
                </p>
              </Card>
            </section>

            {/* 3. Tree View */}
            <section id="tree-view" className="scroll-mt-24">
              <SectionHeading emoji={"\u{1F333}"} title="Tree View" />
              <Card>
                <p className="text-white/70 leading-relaxed">
                  The tree view is the default way to explore your family graph. It shows
                  everyone arranged in a visual tree with parents above and children below.
                </p>
                <ul className="mt-4 space-y-3 text-white/70">
                  <li className="flex gap-3">
                    <span className="text-[#7fdb9a]">&bull;</span>
                    <span>
                      <strong className="text-white">Drag</strong> anywhere to pan around
                      the tree
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#7fdb9a]">&bull;</span>
                    <span>
                      <strong className="text-white">Scroll</strong> to zoom in and out (or
                      use the + / &minus; buttons)
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#7fdb9a]">&bull;</span>
                    <span>
                      <strong className="text-white">Click</strong> any person to view their
                      detail page
                    </span>
                  </li>
                </ul>
                <p className="mt-4 text-white/70 leading-relaxed">
                  Married couples are shown together in a single node (e.g. &ldquo;John &amp;
                  Jane&rdquo;) with their children branching out below. The tree automatically
                  fits to your screen when it first loads.
                </p>
              </Card>
            </section>

            {/* 4. Tree Settings */}
            <section id="tree-settings" className="scroll-mt-24">
              <SectionHeading emoji={"\u2699\uFE0F"} title="Tree Settings" />
              <Card>
                <p className="text-white/70 leading-relaxed">
                  The toolbar at the top of the tree view lets you customize how the tree
                  looks. Your settings are saved automatically.
                </p>
                <ul className="mt-4 space-y-3 text-white/70">
                  <li className="flex gap-3">
                    <span className="text-[#7fdb9a]">&bull;</span>
                    <span>
                      <strong className="text-white">Orientation</strong> &mdash; choose{" "}
                      <strong className="text-white">Vertical</strong> (top-to-bottom) or{" "}
                      <strong className="text-white">Horizontal</strong> (left-to-right)
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#7fdb9a]">&bull;</span>
                    <span>
                      <strong className="text-white">Connections</strong> &mdash; choose{" "}
                      <strong className="text-white">Curved</strong> lines or{" "}
                      <strong className="text-white">Right Angle</strong> lines between nodes
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#7fdb9a]">&bull;</span>
                    <span>
                      <strong className="text-white">Node Style</strong> &mdash;{" "}
                      <strong className="text-white">Compact</strong> shows just names,{" "}
                      <strong className="text-white">Detailed</strong> shows names, dates,
                      birth location, and avatar silhouettes
                    </span>
                  </li>
                </ul>
              </Card>
            </section>

            {/* 5. Ancestor & Descendant View */}
            <section id="ancestor-descendant" className="scroll-mt-24">
              <SectionHeading
                emoji={"\u{1F468}\u200D\u{1F469}\u200D\u{1F467}"}
                title="Ancestor & Descendant View"
              />
              <Card>
                <p className="text-white/70 leading-relaxed">
                  The tree toolbar includes three view modes:{" "}
                  <strong className="text-white">Full</strong>,{" "}
                  <strong className="text-white">Ancestors</strong>, and{" "}
                  <strong className="text-white">Descendants</strong>.
                </p>
                <ul className="mt-4 space-y-3 text-white/70">
                  <li className="flex gap-3">
                    <span className="text-[#7fdb9a]">&bull;</span>
                    <span>
                      <strong className="text-white">Full</strong> &mdash; shows everyone in
                      the graph (the default)
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#7fdb9a]">&bull;</span>
                    <span>
                      <strong className="text-white">Ancestors</strong> &mdash; switch to this
                      mode, then search for someone. The tree will show only that person&rsquo;s
                      parents, grandparents, great-grandparents, and so on &mdash; a clean
                      pedigree chart.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#7fdb9a]">&bull;</span>
                    <span>
                      <strong className="text-white">Descendants</strong> &mdash; similar, but
                      shows only that person&rsquo;s children, grandchildren, and so on.
                    </span>
                  </li>
                </ul>
                <p className="mt-4 text-white/70 leading-relaxed">
                  A green pill shows who you are focused on. Click the{" "}
                  <strong className="text-white">&times;</strong> button to go back to the
                  full tree.
                </p>
              </Card>
            </section>

            {/* 6. List View */}
            <section id="list-view" className="scroll-mt-24">
              <SectionHeading emoji={"\u{1F4CB}"} title="List View" />
              <Card>
                <p className="text-white/70 leading-relaxed">
                  Toggle to <strong className="text-white">List View</strong> using the
                  button next to Tree View. This shows everyone as a grid of cards.
                </p>
                <p className="mt-4 text-white/70 leading-relaxed">
                  Each card shows the person&rsquo;s name, pronouns, birth date,
                  relationships, and how many stories they have. Click any name to
                  view their detail page.
                </p>
                <p className="mt-4 text-white/70 leading-relaxed">
                  <RoleLabel role="editor" /> Editors can click{" "}
                  <strong className="text-white">+ Add Person</strong> to add someone new,
                  or use the <strong className="text-white">+ Add relationship</strong> link
                  on any card to connect two people.
                </p>
              </Card>
            </section>

            {/* 7. Search */}
            <section id="search" className="scroll-mt-24">
              <SectionHeading emoji={"\u{1F50D}"} title="Search" />
              <Card>
                <p className="text-white/70 leading-relaxed">
                  The search box appears at the top of both Tree View and List View. Start
                  typing anyone&rsquo;s name to find them.
                </p>
                <ul className="mt-4 space-y-3 text-white/70">
                  <li className="flex gap-3">
                    <span className="text-[#7fdb9a]">&bull;</span>
                    <span>
                      <strong className="text-white">In Tree View</strong> &mdash; a dropdown
                      shows matching people. Click a result to pan and zoom the tree to that
                      person.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#7fdb9a]">&bull;</span>
                    <span>
                      <strong className="text-white">In List View</strong> &mdash; cards are
                      filtered in real-time and matching text is highlighted in green.
                    </span>
                  </li>
                </ul>
                <p className="mt-4 text-white/70 leading-relaxed">
                  <strong className="text-white">Tip:</strong> Press{" "}
                  <Kbd>Cmd+K</Kbd> (Mac) or <Kbd>Ctrl+K</Kbd> (Windows) to jump
                  straight to the search box from anywhere. Press{" "}
                  <Kbd>Escape</Kbd> to clear.
                </p>
              </Card>
            </section>

            {/* 8. Person Detail */}
            <section id="person-detail" className="scroll-mt-24">
              <SectionHeading emoji={"\u{1F464}"} title="Person Detail Page" />
              <Card>
                <p className="text-white/70 leading-relaxed">
                  Click any person&rsquo;s name to open their detail page. This shows
                  everything known about them:
                </p>
                <ul className="mt-4 space-y-3 text-white/70">
                  <li className="flex gap-3">
                    <span className="text-[#7fdb9a]">&bull;</span>
                    <span>Name, nickname, preferred name, and pronouns</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#7fdb9a]">&bull;</span>
                    <span>Birth and death dates, birth location</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#7fdb9a]">&bull;</span>
                    <span>Notes and stories</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#7fdb9a]">&bull;</span>
                    <span>
                      <strong className="text-white">Unions</strong> &mdash; marriages
                      (green), divorces (red), and partnerships (blue) with date ranges
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#7fdb9a]">&bull;</span>
                    <span>
                      <strong className="text-white">Family</strong> &mdash; parents and
                      children, each with clickable links
                    </span>
                  </li>
                </ul>
                <p className="mt-4 text-white/70 leading-relaxed">
                  <RoleLabel role="editor" /> Editors can click{" "}
                  <strong className="text-white">Edit</strong> to update any field. Dates
                  can be entered as a year only (1958), year and month (1958-03), or a full
                  date (1958-03-15).
                </p>
              </Card>
            </section>

            {/* 9. Stories */}
            <section id="stories" className="scroll-mt-24">
              <SectionHeading emoji={"\u{1F4D6}"} title="Stories & Fun Facts" />
              <Card>
                <p className="text-white/70 leading-relaxed">
                  Every person has a Stories section at the bottom of their detail page.
                  This is where family members can share memories, anecdotes, and fun facts.
                </p>
                <ul className="mt-4 space-y-3 text-white/70">
                  <li className="flex gap-3">
                    <span className="text-[#7fdb9a]">&bull;</span>
                    <span>
                      Click <strong className="text-white">+ Add Story</strong> to write a
                      new story about that person
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#7fdb9a]">&bull;</span>
                    <span>
                      Check <strong className="text-white">This is a fun fact</strong> to
                      give it a green badge
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#7fdb9a]">&bull;</span>
                    <span>
                      Stories show who wrote them and when (e.g. &ldquo;Jim &mdash; 2 hours
                      ago&rdquo;)
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#7fdb9a]">&bull;</span>
                    <span>You can edit or delete your own stories, but not others&rsquo;</span>
                  </li>
                </ul>
                <p className="mt-4 text-white/70 leading-relaxed">
                  Contributors and above can add stories &mdash; you
                  don&rsquo;t need to be an editor.
                </p>
              </Card>
            </section>

            {/* 10. TreeDown Import */}
            <section id="treedown-import" className="scroll-mt-24">
              <SectionHeading emoji={"\u{1F4E5}"} title="TreeDown Import" />
              <Card>
                <p className="text-white/70 leading-relaxed">
                  <RoleLabel role="owner" /> TreeDown import lets you bulk-import an entire family tree
                  from a simple text format. This is useful for initial setup when you have
                  a large tree to enter.
                </p>
                <p className="mt-4 text-white/70 leading-relaxed">
                  Click <strong className="text-white">Import TreeDown</strong> on the graph
                  page, then paste your tree text. The format uses indentation to show
                  parent-child relationships:
                </p>
                <div className="mt-4 rounded-xl bg-black/30 p-4 font-mono text-sm text-white/60">
                  <div>John Smith &amp; Jane Doe</div>
                  <div className="ml-8">Michael Smith (1985)</div>
                  <div className="ml-8">Sarah Smith (b. 1988)</div>
                  <div className="ml-16">Emma Johnson (2015)</div>
                </div>
                <p className="mt-4 text-white/70 leading-relaxed">
                  Use <strong className="text-white">&amp;</strong> to join couples. Children
                  go indented below their parents. Dates can be added in parentheses. Click{" "}
                  <strong className="text-white">Preview</strong> to check everything before
                  importing.
                </p>
              </Card>
            </section>

            {/* 11. Export */}
            <section id="export" className="scroll-mt-24">
              <SectionHeading emoji={"\u{1F4E4}"} title="Export" />
              <Card>
                <p className="text-white/70 leading-relaxed">
                  <RoleLabel role="owner" /> Click the{" "}
                  <strong className="text-white">Export</strong> button on the graph page to
                  download your family tree. Two formats are available:
                </p>
                <ul className="mt-4 space-y-3 text-white/70">
                  <li className="flex gap-3">
                    <span className="text-[#7fdb9a]">&bull;</span>
                    <span>
                      <strong className="text-white">Archive (.txt)</strong> &mdash; a
                      human-readable document with everyone&rsquo;s info. Great for printing
                      or saving a copy.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#7fdb9a]">&bull;</span>
                    <span>
                      <strong className="text-white">Data (.json)</strong> &mdash; a
                      structured file for backups or technical use.
                    </span>
                  </li>
                </ul>
                <p className="mt-4 text-white/70 leading-relaxed">
                  The file downloads to your device automatically.
                </p>
              </Card>
            </section>

            {/* 12. Collaboration */}
            <section id="collaboration" className="scroll-mt-24">
              <SectionHeading emoji={"\u{1F91D}"} title="Invite & Collaboration" />
              <Card>
                <p className="text-white/70 leading-relaxed">
                  Owners and editors can invite family members by clicking the{" "}
                  <strong className="text-white">Invite</strong> button on the graph page.
                  This opens a modal where you can choose a role, copy a shareable link, or
                  display a QR code for scanning at reunions.
                </p>
                <p className="mt-4 text-white/70 leading-relaxed">
                  There are four roles:
                </p>
                <ul className="mt-4 space-y-3 text-white/70">
                  <li className="flex gap-3">
                    <span className="text-[#7fdb9a]">&bull;</span>
                    <span>
                      <strong className="text-white">Owner</strong> &mdash; full control.
                      Can manage members, import, export, and delete the graph. The person who
                      creates a graph is automatically the owner.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#7fdb9a]">&bull;</span>
                    <span>
                      <strong className="text-white">Editor</strong> &mdash; can add and edit
                      people, manage relationships, and add stories. A trusted family member
                      who helps maintain the tree.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#7fdb9a]">&bull;</span>
                    <span>
                      <strong className="text-white">Contributor</strong> &mdash; can view
                      the tree and add stories about family members. Cannot edit people or
                      relationships.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#7fdb9a]">&bull;</span>
                    <span>
                      <strong className="text-white">Viewer</strong> &mdash; read-only.
                      Can browse the tree, search, and read stories. Anyone who joins via the
                      basic invite code becomes a viewer.
                    </span>
                  </li>
                </ul>
                <p className="mt-4 text-white/70 leading-relaxed">
                  Each invite link has a specific role baked in, so the person who clicks it
                  gets exactly the access level you intended.
                </p>
              </Card>
            </section>

            {/* 13. Guest Mode */}
            <section id="guest-mode" className="scroll-mt-24">
              <SectionHeading emoji={"\u{1F6E1}\uFE0F"} title="Guest Mode" />
              <Card>
                <p className="text-white/70 leading-relaxed">
                  <RoleLabel role="editor" /> At a family reunion, you might want to hand
                  your phone to a relative so they can browse the tree &mdash; without
                  worrying about accidental edits.
                </p>
                <p className="mt-4 text-white/70 leading-relaxed">
                  Click <strong className="text-white">Guest Mode</strong> in the graph
                  header. On first use, you&rsquo;ll set a 4-digit PIN. The app instantly
                  hides all edit, delete, import, and export controls and shows a{" "}
                  <strong className="text-amber-400">Guest Mode &mdash; Read Only</strong>{" "}
                  banner.
                </p>
                <p className="mt-4 text-white/70 leading-relaxed">
                  To get your full controls back, click{" "}
                  <strong className="text-white">Exit Guest Mode</strong> and enter your
                  PIN.
                </p>
              </Card>
            </section>

            {/* 13. Keyboard Shortcuts */}
            <section id="shortcuts" className="scroll-mt-24">
              <SectionHeading emoji={"\u2328\uFE0F"} title="Keyboard Shortcuts" />
              <Card>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white/70">Focus search box</span>
                    <span className="flex gap-2">
                      <Kbd>Cmd+K</Kbd>
                      <span className="text-white/30">or</span>
                      <Kbd>Ctrl+K</Kbd>
                    </span>
                  </div>
                  <div className="border-t border-white/5" />
                  <div className="flex items-center justify-between">
                    <span className="text-white/70">Clear search</span>
                    <Kbd>Escape</Kbd>
                  </div>
                </div>
              </Card>
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}

function SectionHeading({ emoji, title }: { emoji: string; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="text-2xl">{emoji}</span>
      <h2 className="text-2xl font-bold">{title}</h2>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      {children}
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded bg-white/10 px-2 py-0.5 font-mono text-sm text-[#7fdb9a]">
      {children}
    </kbd>
  );
}

function RoleLabel({ role }: { role: "owner" | "editor" }) {
  const label = role === "owner" ? "Owner only" : "Editor+";
  return (
    <span className="mr-1 inline-block rounded-full bg-[#7fdb9a]/10 px-2.5 py-0.5 text-xs font-medium text-[#7fdb9a]">
      {label}
    </span>
  );
}
