<script lang="ts">
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const STATUS_LABELS: Record<string, string> = {
    published: "Published",
    in_progress: "In Progress",
    awaiting_dataset: "Awaiting Dataset",
    on_hold: "On Hold",
  };

  function statusClass(status: string): string {
    if (status === "published") return "s-published";
    if (status === "in_progress") return "s-progress";
    if (status === "awaiting_dataset") return "s-awaiting";
    if (status === "on_hold") return "s-hold";
    return "s-none";
  }

  function statusLabel(status: string): string {
    return STATUS_LABELS[status] ?? status;
  }

  const priorYears = $derived(data.yearStats.filter((y) => y.year !== data.latestYear));
</script>

<div class="page">
  <header>
    <h1>COD-AB Activity Tracker</h1>
    <p class="subtitle">
      {data.total} work orders across {data.yearStats.length} cycle{data.yearStats.length !== 1 ? "s" : ""}
    </p>
  </header>

  <!-- ── 1. Cycle overview ───────────────────────────────────── -->
  <div class="cycle-grid">
    {#each data.yearStats as ys}
      {@const isCurrent = ys.year === data.latestYear}
      <div class="cycle-card {isCurrent ? 'current' : 'backlog-card'}">
        <div class="cycle-header">
          <span class="cycle-year">{ys.year}</span>
          <span class="cycle-tag">{isCurrent ? "Current cycle" : "Backlog"}</span>
        </div>
        <div class="stat-grid">
          {#each ys.pipeline as item}
            <div class="stat-card {statusClass(item.status)}">
              <span class="stat-num">{item.count}</span>
              <span class="stat-lbl">{item.label}</span>
            </div>
          {/each}
          <div class="stat-card s-total">
            <span class="stat-num">{ys.total}</span>
            <span class="stat-lbl">Total</span>
          </div>
        </div>
      </div>
    {/each}
  </div>

  <!-- ── 2. Prior-cycle backlog ──────────────────────────────── -->
  {#each priorYears as ys}
    <section>
      <h2>
        {ys.year} Backlog
        <span class="count-chip {data.backlog.filter((r) => r.year === ys.year).length === 0 ? 'done' : 'warn'}">
          {data.backlog.filter((r) => r.year === ys.year).length === 0
            ? "All published"
            : data.backlog.filter((r) => r.year === ys.year).length + " remaining"}
        </span>
      </h2>
      <p class="section-desc">
        Work orders from the {ys.year} cycle that have not yet been published.
      </p>

      {#if data.backlog.filter((r) => r.year === ys.year).length === 0}
        <p class="empty">All {ys.year} work orders have been published.</p>
      {:else}
        {#each data.backlogByQuarter.filter((g) => g.rows.some((r) => r.year === ys.year)) as group}
          <h3 class="quarter-heading">{group.quarter}</h3>
          <table>
            <thead>
              <tr>
                <th>Country</th>
                <th>Status</th>
                <th>Plan Type</th>
                <th>Admin Level</th>
                <th>Change Expected</th>
                <th>Regional Office</th>
              </tr>
            </thead>
            <tbody>
              {#each group.rows.filter((r) => r.year === ys.year) as row}
                <tr>
                  <td>{row.name_en} <span class="iso3">{row.iso3}</span></td>
                  <td><span class="badge {statusClass(row.work_order_status)}">{statusLabel(row.work_order_status)}</span></td>
                  <td>{row.plan_type || "—"}</td>
                  <td>{row.admin_level || "—"}</td>
                  <td class={row.change_expected ? "flag-yes" : ""}>{row.change_expected ? "Yes" : "No"}</td>
                  <td>{row.regional || "—"}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/each}
      {/if}
    </section>
  {/each}

  <!-- ── 3. Current cycle work ────────────────────────────────── -->
  <section>
    <h2>
      {data.latestYear} Work Orders
      <span class="count-chip">{data.currentCycleWork.length} total</span>
    </h2>
    <p class="section-desc">
      All work orders in the {data.latestYear} cycle, grouped by planned delivery quarter.
    </p>

    {#if data.currentByQuarter.length === 0}
      <p class="empty">No active work orders in the {data.latestYear} cycle yet.</p>
    {:else}
      {#each data.currentByQuarter as group}
        <h3 class="quarter-heading">{group.quarter}</h3>
        <table>
          <thead>
            <tr>
              <th>Country</th>
              <th>Status</th>
              <th>Plan Type</th>
              <th>Admin Level</th>
              <th>Change Expected</th>
              <th>Regional Office</th>
            </tr>
          </thead>
          <tbody>
            {#each group.rows as row}
              <tr>
                <td>{row.name_en} <span class="iso3">{row.iso3}</span></td>
                <td><span class="badge {statusClass(row.work_order_status)}">{statusLabel(row.work_order_status)}</span></td>
                <td>{row.plan_type || "—"}</td>
                <td>{row.admin_level || "—"}</td>
                <td class={row.change_expected ? "flag-yes" : ""}>{row.change_expected ? "Yes" : "No"}</td>
                <td>{row.regional || "—"}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/each}
    {/if}

    {#if data.currentCycleWork.some((r) => r.work_order_status === "published")}
      <details class="published-toggle">
        <summary>
          Published ({data.currentCycleWork.filter((r) => r.work_order_status === "published").length})
        </summary>
        <table>
          <thead>
            <tr>
              <th>Country</th>
              <th>Work Order ID</th>
              <th>Plan Type</th>
              <th>Completed Quarter</th>
              <th>Regional Office</th>
            </tr>
          </thead>
          <tbody>
            {#each data.currentCycleWork.filter((r) => r.work_order_status === "published") as row}
              <tr>
                <td>{row.name_en} <span class="iso3">{row.iso3}</span></td>
                <td class="mono">{row.work_order_id}</td>
                <td>{row.plan_type || "—"}</td>
                <td>{row.planned_quarter || "—"}</td>
                <td>{row.regional || "—"}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </details>
    {/if}
  </section>

  <!-- ── 4. Blocked work orders ──────────────────────────────── -->
  <section>
    <h2>
      Blocked Work Orders
      <span class="count-chip {data.blocked.length > 0 ? 'warn' : 'done'}">{data.blocked.length}</span>
    </h2>
    <p class="section-desc">
      All work orders currently on hold or awaiting a dataset, across all cycles.
    </p>

    {#if data.blocked.length === 0}
      <p class="empty">No blocked work orders.</p>
    {:else}
      <table>
        <thead>
          <tr>
            <th>Country</th>
            <th>Cycle</th>
            <th>Work Order ID</th>
            <th>Status</th>
            <th>Plan Type</th>
            <th>Change Expected</th>
            <th>Created</th>
            <th>Regional Office</th>
          </tr>
        </thead>
        <tbody>
          {#each data.blocked as row}
            <tr>
              <td>{row.name_en} <span class="iso3">{row.iso3}</span></td>
              <td>{row.year}</td>
              <td class="mono">{row.work_order_id}</td>
              <td><span class="badge {statusClass(row.work_order_status)}">{statusLabel(row.work_order_status)}</span></td>
              <td>{row.plan_type || "—"}</td>
              <td class={row.change_expected ? "flag-yes" : ""}>{row.change_expected ? "Yes" : "No"}</td>
              <td>{row.created_date}</td>
              <td>{row.regional || "—"}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </section>

  <!-- ── 5. HRP / FA plan coverage (per year) ───────────────── -->
  {#each data.planCoverageByYear as pcg}
    <section>
      <h2>
        HRP / FA Plan Coverage — {pcg.year}
        {#if pcg.gapCount > 0}
          <span class="count-chip warn">{pcg.gapCount} gap{pcg.gapCount !== 1 ? "s" : ""}</span>
        {:else}
          <span class="count-chip done">Fully covered</span>
        {/if}
      </h2>
      <p class="section-desc">
        All countries with an active HRP or Flash Appeal plan for {pcg.year}. Highlighted rows have
        no work order assigned.
      </p>

      <table>
        <thead>
          <tr>
            <th>Country</th>
            <th>Plan Type</th>
            <th>Admin Level</th>
            <th>Change Expected</th>
            <th>Work Order Status</th>
            <th>Planned Quarter</th>
            <th>Regional Office</th>
          </tr>
        </thead>
        <tbody>
          {#each pcg.rows as row}
            <tr class={!row.work_order_status ? "row-gap" : ""}>
              <td>{row.name_en} <span class="iso3">{row.iso3}</span></td>
              <td>{row.plan_types}</td>
              <td>{row.admin_level || "—"}</td>
              <td class={row.change_expected ? "flag-yes" : ""}>{row.change_expected ? "Yes" : "No"}</td>
              <td>
                {#if row.work_order_status}
                  <span class="badge {statusClass(row.work_order_status)}">{statusLabel(row.work_order_status)}</span>
                {:else}
                  <span class="badge s-none">No work order</span>
                {/if}
              </td>
              <td>{row.planned_quarter || "—"}</td>
              <td>{row.regional || "—"}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </section>
  {/each}
</div>

<style>
  /* ── Base ───────────────────────────────────────────────────── */
  :global(body) {
    margin: 0;
    background: #f7f8fa;
    font-family: system-ui, sans-serif;
    color: #1a1a1a;
  }

  .page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1.5rem 1.5rem 3rem;
  }

  /* ── Header ─────────────────────────────────────────────────── */
  header {
    margin-bottom: 1.25rem;
  }

  h1 {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0 0 0.2rem;
  }

  .subtitle {
    font-size: 0.85rem;
    color: #666;
    margin: 0;
  }

  /* ── Cycle overview grid ─────────────────────────────────────── */
  .cycle-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 0.75rem;
    margin-bottom: 1.25rem;
  }

  .cycle-card {
    border-radius: 6px;
    border: 1px solid #e2e5ea;
    padding: 1rem 1.25rem;
    background: #fff;
  }

  .cycle-card.current {
    border-color: #93c5fd;
    background: #eff6ff;
  }

  .cycle-header {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .cycle-year {
    font-size: 1.1rem;
    font-weight: 700;
  }

  .cycle-tag {
    font-size: 0.75rem;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  /* ── Stat cards ─────────────────────────────────────────────── */
  .stat-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .stat-card {
    flex: 1 1 90px;
    border-radius: 5px;
    padding: 0.6rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    border: 1px solid transparent;
  }

  .stat-num {
    font-size: 1.6rem;
    font-weight: 700;
    line-height: 1;
  }

  .stat-lbl {
    font-size: 0.72rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #444;
  }

  .stat-card.s-published { background: #c6efce; border-color: #93d09a; }
  .stat-card.s-progress  { background: #fff2cc; border-color: #f5d262; }
  .stat-card.s-awaiting  { background: #fce4d6; border-color: #f4b183; }
  .stat-card.s-hold      { background: #ffc7ce; border-color: #f09098; }
  .stat-card.s-total     { background: #e8edf5; border-color: #c0cade; }

  /* ── Sections ───────────────────────────────────────────────── */
  section {
    background: #fff;
    border: 1px solid #e2e5ea;
    border-radius: 6px;
    padding: 1.25rem 1.5rem;
    margin-bottom: 1.25rem;
  }

  section h2 {
    font-size: 1rem;
    font-weight: 700;
    margin: 0 0 0.35rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .section-desc {
    font-size: 0.82rem;
    color: #666;
    margin: 0 0 1rem;
  }

  .quarter-heading {
    font-size: 0.8rem;
    font-weight: 700;
    color: #555;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 1.25rem 0 0.4rem;
    padding-bottom: 0.25rem;
    border-bottom: 1px solid #e2e5ea;
  }

  section > h3.quarter-heading:first-of-type {
    margin-top: 0;
  }

  /* ── Tables ─────────────────────────────────────────────────── */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
    margin-bottom: 0.25rem;
  }

  th, td {
    padding: 0.35rem 0.6rem;
    text-align: left;
    border: 1px solid #e2e5ea;
    white-space: nowrap;
  }

  th {
    background: #f0f2f5;
    font-weight: 600;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    position: sticky;
    top: 0;
  }

  tr:hover td { background: #f7f9fc; }

  tr.row-gap td           { background: #fff8e7; }
  tr.row-gap:hover td     { background: #fff3d0; }

  /* ── Status badges ───────────────────────────────────────────── */
  .badge {
    display: inline-block;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .badge.s-published { background: #c6efce; color: #1e6b2e; }
  .badge.s-progress  { background: #fff2cc; color: #7a5a00; }
  .badge.s-awaiting  { background: #fce4d6; color: #8b3a0e; }
  .badge.s-hold      { background: #ffc7ce; color: #8b0c1a; }
  .badge.s-none      { background: #f0f2f5; color: #666; }

  /* ── Chips, misc ─────────────────────────────────────────────── */
  .count-chip {
    display: inline-block;
    background: #e8edf5;
    color: #444;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.1rem 0.55rem;
    vertical-align: middle;
  }

  .count-chip.warn { background: #fce4d6; color: #8b3a0e; }
  .count-chip.done { background: #c6efce; color: #1e6b2e; }

  .iso3 {
    font-size: 0.7rem;
    color: #999;
    margin-left: 0.25rem;
    font-family: monospace;
  }

  .mono {
    font-family: monospace;
    font-size: 0.78rem;
  }

  .flag-yes {
    color: #8b3a0e;
    font-weight: 600;
  }

  .empty {
    font-size: 0.85rem;
    color: #888;
    margin: 0;
  }

  /* ── Published toggle ────────────────────────────────────────── */
  .published-toggle {
    margin-top: 1rem;
    border: 1px solid #e2e5ea;
    border-radius: 5px;
    overflow: hidden;
  }

  .published-toggle summary {
    padding: 0.5rem 0.75rem;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    background: #f0f2f5;
    color: #444;
    user-select: none;
  }

  .published-toggle summary:hover { background: #e6e9ef; }

  .published-toggle table {
    border: none;
    margin: 0;
  }

  .published-toggle th { top: auto; }
</style>
